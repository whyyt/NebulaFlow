// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Challenge.sol";

contract ChallengeFactory {
    address[] public challenges;

    event ChallengeCreated(
        address indexed challengeAddress,
        address indexed creator,
        string title,
        uint256 depositAmount,
        uint256 startTime,
        uint256 totalRounds,
        uint256 roundDuration
    );

    function createChallenge(
        string memory _title,
        string memory _description,
        uint256 _depositAmount,
        uint256 _totalRounds,
        uint256 _roundDuration,
        uint256 _startDelaySeconds
    ) external returns (address) {
        require(bytes(_title).length > 0, "TITLE_REQUIRED");
        require(bytes(_description).length > 0, "DESC_REQUIRED");

        uint256 startTime = block.timestamp + _startDelaySeconds;
        Challenge newChallenge = new Challenge(
            _title,
            _description,
            msg.sender,
            _depositAmount,
            _totalRounds,
            _roundDuration,
            startTime
        );

        challenges.push(address(newChallenge));

        emit ChallengeCreated(
            address(newChallenge),
            msg.sender,
            _title,
            _depositAmount,
            startTime,
            _totalRounds,
            _roundDuration
        );

        return address(newChallenge);
    }

    function getAllChallenges() external view returns (address[] memory) {
        return challenges;
    }
}
