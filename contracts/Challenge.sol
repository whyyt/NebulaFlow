// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Web3 Challenge contract with押金激励
/// @notice 单个 Challenge 合约，负责押金托管、签到、淘汰与结算逻辑
contract Challenge {
    enum Status {
        Scheduled,
        Active,
        Settled
    }

    struct Participant {
        bool joined;
        bool eliminated;
        uint256 lastCheckInRound;
        bool rewardClaimed;
    }

    string public title;
    string public description;
    address public creator;
    uint256 public createdAt;
    uint256 public startTime;
    uint256 public depositAmount;
    uint256 public totalRounds;
    uint256 public roundDuration;

    Status public status;
    uint256 public aliveCount;
    uint256 public winnersCount;
    uint256 public rewardPerWinner;
    uint256 public settledAt;

    address[] private participantList;
    mapping(address => Participant) private participantInfo;

    uint256 private constant NOT_CHECKED = type(uint256).max;

    bool private locked;

    event ParticipantJoined(address indexed user, uint256 totalParticipants);
    event CheckIn(address indexed user, uint256 round, uint256 timestamp);
    event Eliminated(address indexed user, uint256 missedRound);
    event Settled(uint256 winners, uint256 rewardPerWinner);
    event RewardClaimed(address indexed user, uint256 amount);

    modifier nonReentrant() {
        require(!locked, "REENTRANT");
        locked = true;
        _;
        locked = false;
    }

    constructor(
        string memory _title,
        string memory _description,
        address _creator,
        uint256 _depositAmount,
        uint256 _totalRounds,
        uint256 _roundDuration,
        uint256 _startTime
    ) {
        require(_depositAmount > 0, "ZERO_DEPOSIT");
        require(_totalRounds > 0 && _totalRounds <= 90, "INVALID_ROUNDS");
        require(_roundDuration >= 60, "ROUND_TOO_SHORT");
        require(_startTime >= block.timestamp, "START_IN_PAST");

        title = _title;
        description = _description;
        creator = _creator;
        depositAmount = _depositAmount;
        totalRounds = _totalRounds;
        roundDuration = _roundDuration;
        startTime = _startTime;
        createdAt = block.timestamp;
        status = Status.Scheduled;
    }

    // ------------------------
    // 用户交互
    // ------------------------

    function joinChallenge() external payable {
        _syncStatus();
        require(status == Status.Scheduled, "JOIN_CLOSED");
        require(block.timestamp < startTime, "ALREADY_STARTED");
        require(msg.value == depositAmount, "WRONG_DEPOSIT");

        Participant storage p = participantInfo[msg.sender];
        require(!p.joined, "ALREADY_JOINED");

        p.joined = true;
        p.lastCheckInRound = NOT_CHECKED;
        participantList.push(msg.sender);
        aliveCount += 1;

        emit ParticipantJoined(msg.sender, participantList.length);
    }

    function forceStart() external {
        require(msg.sender == creator, "ONLY_CREATOR");
        require(status == Status.Scheduled, "ALREADY_STARTED");
        status = Status.Active;
        startTime = block.timestamp;
    }

    function checkIn() external {
        _syncStatus();
        require(status == Status.Active, "NOT_ACTIVE");
        Participant storage p = participantInfo[msg.sender];
        require(p.joined, "NOT_PARTICIPANT");
        require(!p.eliminated, "ELIMINATED");

        uint256 currentRoundNum = currentRound();
        require(currentRoundNum < totalRounds, "CHALLENGE_FINISHED");
        
        // 找到最早未签到且未结束的轮次
        uint256 targetRound = NOT_CHECKED;
        uint256 startRound = p.lastCheckInRound == NOT_CHECKED ? 0 : p.lastCheckInRound + 1;
        
        for (uint256 i = startRound; i <= currentRoundNum; i++) {
            uint256 roundEndTime = startTime + (i + 1) * roundDuration;
            if (block.timestamp < roundEndTime) {
                targetRound = i;
                break;
            }
        }
        
        require(targetRound != NOT_CHECKED, "ALL_ROUNDS_EXPIRED");
        require(targetRound < totalRounds, "CHALLENGE_FINISHED");

        p.lastCheckInRound = targetRound;
        emit CheckIn(msg.sender, targetRound, block.timestamp);
    }

    function eliminate(address user) external {
        _syncStatus();
        require(status == Status.Active, "NOT_ACTIVE");
        Participant storage p = participantInfo[user];
        require(p.joined && !p.eliminated, "CANNOT_ELIMINATE");

        uint256 round = currentRound();
        uint256 requiredRound = p.lastCheckInRound == NOT_CHECKED
            ? 0
            : p.lastCheckInRound + 1;
        require(round > requiredRound, "WITHIN_WINDOW");

        _eliminate(p, user, requiredRound);
    }

    function settle() public {
        _syncStatus();
        require(status != Status.Settled, "ALREADY_SETTLED");
        require(block.timestamp >= endTime(), "ONGOING");

        uint256 finalRound = totalRounds - 1;
        for (uint256 i = 0; i < participantList.length; i++) {
            address user = participantList[i];
            Participant storage p = participantInfo[user];
            if (!p.joined || p.eliminated) {
                continue;
            }
            bool finished = p.lastCheckInRound != NOT_CHECKED &&
                p.lastCheckInRound == finalRound;
            if (!finished) {
                uint256 missedRound = p.lastCheckInRound == NOT_CHECKED
                    ? 0
                    : p.lastCheckInRound + 1;
                _eliminate(p, user, missedRound);
            }
        }

        status = Status.Settled;
        settledAt = block.timestamp;
        winnersCount = aliveCount;

        uint256 balance = address(this).balance;
        if (winnersCount == 0) {
            if (balance > 0) {
                (bool sentCreator, ) = creator.call{value: balance}("");
                require(sentCreator, "CREATOR_TRANSFER_FAIL");
            }
            emit Settled(0, 0);
            return;
        }

        rewardPerWinner = balance / winnersCount;
        uint256 totalPayout = rewardPerWinner * winnersCount;
        uint256 remainder = balance - totalPayout;

        if (remainder > 0) {
            (bool sent, ) = creator.call{value: remainder}("");
            require(sent, "REMAINDER_FAIL");
        }

        emit Settled(winnersCount, rewardPerWinner);
    }

    function forceSettle() external {
        require(msg.sender == creator, "ONLY_CREATOR");
        require(status != Status.Settled, "ALREADY_SETTLED");
        require(status == Status.Active, "NOT_ACTIVE");
        
        uint256 finalRound = totalRounds - 1;
        for (uint256 i = 0; i < participantList.length; i++) {
            address user = participantList[i];
            Participant storage p = participantInfo[user];
            if (!p.joined || p.eliminated) {
                continue;
            }
            bool finished = p.lastCheckInRound != NOT_CHECKED &&
                p.lastCheckInRound == finalRound;
            if (!finished) {
                uint256 missedRound = p.lastCheckInRound == NOT_CHECKED
                    ? 0
                    : p.lastCheckInRound + 1;
                _eliminate(p, user, missedRound);
            }
        }

        status = Status.Settled;
        settledAt = block.timestamp;
        winnersCount = aliveCount;

        uint256 balance = address(this).balance;
        if (winnersCount == 0) {
            if (balance > 0) {
                (bool sentCreator, ) = creator.call{value: balance}("");
                require(sentCreator, "CREATOR_TRANSFER_FAIL");
            }
            emit Settled(0, 0);
            return;
        }

        rewardPerWinner = balance / winnersCount;
        uint256 totalPayout = rewardPerWinner * winnersCount;
        uint256 remainder = balance - totalPayout;

        if (remainder > 0) {
            (bool sent, ) = creator.call{value: remainder}("");
            require(sent, "REMAINDER_FAIL");
        }

        emit Settled(winnersCount, rewardPerWinner);
    }

    function claimReward() external nonReentrant {
        require(status == Status.Settled, "NOT_SETTLED");
        Participant storage p = participantInfo[msg.sender];
        require(p.joined, "NOT_PARTICIPANT");
        require(!p.eliminated, "NOT_WINNER");
        require(!p.rewardClaimed, "ALREADY_CLAIMED");
        require(winnersCount > 0, "NO_WINNERS");
        require(rewardPerWinner > 0, "NO_REWARD");

        p.rewardClaimed = true;
        (bool success, ) = msg.sender.call{value: rewardPerWinner}("");
        require(success, "PAYOUT_FAIL");

        emit RewardClaimed(msg.sender, rewardPerWinner);
    }

    // ------------------------
    // 只读视图
    // ------------------------

    function getSummary()
        external
        view
        returns (
            string memory,
            string memory,
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            uint8,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        Status computedStatus = viewStatus();
        return (
            title,
            description,
            creator,
            depositAmount,
            totalRounds,
            roundDuration,
            startTime,
            uint8(computedStatus),
            participantList.length,
            aliveCount,
            winnersCount,
            rewardPerWinner,
            createdAt,
            address(this).balance
        );
    }

    function getTimeInfo()
        external
        view
        returns (uint256 currentRoundNumber, uint256 endTimestamp, bool started, bool finished)
    {
        uint256 round = viewCurrentRound();
        return (round, endTime(), block.timestamp >= startTime, block.timestamp >= endTime());
    }

    function getParticipantInfo(address user)
        external
        view
        returns (
            bool joined,
            bool eliminated,
            uint256 lastCheckInRound,
            bool rewardClaimed,
            bool isWinner,
            bool hasCheckedIn
        )
    {
        Participant memory p = participantInfo[user];
        bool winner = status == Status.Settled &&
            p.joined &&
            !p.eliminated &&
            p.lastCheckInRound == totalRounds - 1;

        bool checkedIn = p.lastCheckInRound != NOT_CHECKED;

        return (
            p.joined,
            p.eliminated,
            p.lastCheckInRound,
            p.rewardClaimed,
            winner,
            checkedIn
        );
    }

    function getParticipants() external view returns (address[] memory) {
        return participantList;
    }

    function participantCount() external view returns (uint256) {
        return participantList.length;
    }

    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function currentRound() public view returns (uint256) {
        Status computedStatus = viewStatus();
        if (computedStatus == Status.Scheduled) {
            return 0;
        }

        uint256 elapsed = block.timestamp >= startTime ? block.timestamp - startTime : 0;
        uint256 round = elapsed / roundDuration;
        if (round >= totalRounds) {
            return totalRounds;
        }
        return round;
    }

    function viewCurrentRound() public view returns (uint256) {
        uint256 elapsed = block.timestamp >= startTime ? block.timestamp - startTime : 0;
        uint256 round = elapsed / roundDuration;
        if (round >= totalRounds) {
            return totalRounds;
        }
        return round;
    }

    function endTime() public view returns (uint256) {
        return startTime + (totalRounds * roundDuration);
    }

    function viewStatus() public view returns (Status) {
        if (status == Status.Settled) {
            return Status.Settled;
        }
        if (block.timestamp >= startTime) {
            return Status.Active;
        }
        return Status.Scheduled;
    }

    // ------------------------
    // 内部逻辑
    // ------------------------

    function _syncStatus() internal {
        if (status == Status.Scheduled && block.timestamp >= startTime) {
            status = Status.Active;
        }
    }

    function _updateElimination(
        Participant storage p,
        address user,
        uint256 round
    ) internal {
        if (p.eliminated) {
            return;
        }
        if (p.lastCheckInRound == NOT_CHECKED) {
            if (round > 0) {
                _eliminate(p, user, 0);
            }
            return;
        }
        if (round > p.lastCheckInRound + 1) {
            _eliminate(p, user, p.lastCheckInRound + 1);
        }
    }

    function _eliminate(
        Participant storage p,
        address user,
        uint256 missedRound
    ) internal {
        if (p.eliminated) {
            return;
        }
        p.eliminated = true;
        if (aliveCount > 0) {
            aliveCount -= 1;
        }
        emit Eliminated(user, missedRound);
    }
}