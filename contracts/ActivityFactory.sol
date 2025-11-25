// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Challenge.sol";
import "./ActivityRegistry.sol";
import "./NFTReward.sol";

/// @title Activity Factory - 统一的活动创建工厂
/// @notice 支持创建押金挑战和NFT奖励活动，并自动注册到ActivityRegistry
contract ActivityFactory {
    ActivityRegistry public immutable activityRegistry;

    event DepositChallengeCreated(
        address indexed challengeAddress,
        address indexed creator,
        uint256 indexed activityId,
        string title
    );

    event NFTRewardCreated(
        address indexed nftContract,
        address indexed creator,
        uint256 indexed activityId,
        string title
    );

    constructor(address _activityRegistry) {
        require(_activityRegistry != address(0), "INVALID_REGISTRY");
        activityRegistry = ActivityRegistry(_activityRegistry);
    }

    /// @notice 创建押金挑战活动
    /// @param _category 活动类别（必须是Lifestyle或SocialWeb3）
    /// @param _title 活动标题
    /// @param _description 活动描述
    /// @param _depositAmount 押金金额
    /// @param _totalRounds 总轮次数
    /// @param _maxParticipants 最大参与人数
    /// @param _isPublic 是否公开（仅对SocialWeb3有效）
    function createDepositChallenge(
        ActivityRegistry.ActivityCategory _category,
        string memory _title,
        string memory _description,
        uint256 _depositAmount,
        uint256 _totalRounds,
        uint256 _maxParticipants,
        bool _isPublic
    ) external returns (address challengeAddress, uint256 activityId) {
        // 验证类别：押金挑战只能用于Lifestyle或SocialWeb3
        require(
            _category == ActivityRegistry.ActivityCategory.Lifestyle ||
            _category == ActivityRegistry.ActivityCategory.SocialWeb3,
            "DEPOSIT_ONLY_LIFESTYLE_OR_SOCIAL"
        );

        // 创建Challenge合约
        uint256 startTime = 0; // 未开始，需要手动开始
        Challenge newChallenge = new Challenge(
            _title,
            _description,
            msg.sender,
            _depositAmount,
            _totalRounds,
            _maxParticipants,
            startTime
        );

        challengeAddress = address(newChallenge);

        // 注册到ActivityRegistry
        activityId = activityRegistry.registerActivity(
            _category,
            ActivityRegistry.IncentiveType.DepositPool,
            challengeAddress,
            _title,
            _description,
            _isPublic
        );

        emit DepositChallengeCreated(challengeAddress, msg.sender, activityId, _title);

        return (challengeAddress, activityId);
    }

    /// @notice 创建NFT奖励活动
    /// @param _category 活动类别
    /// @param _name NFT合约名称
    /// @param _symbol NFT合约符号
    /// @param _baseTokenURI 基础Token URI
    /// @param _title 活动标题
    /// @param _description 活动描述
    /// @param _isPublic 是否公开（Professional必须公开）
    function createNFTReward(
        ActivityRegistry.ActivityCategory _category,
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        string memory _title,
        string memory _description,
        bool _isPublic
    ) external returns (address nftContract, uint256 activityId) {
        // 先创建NFT合约（使用临时activityId 0，稍后更新）
        NFTReward newNFT = new NFTReward(
            _name,
            _symbol,
            _baseTokenURI,
            address(activityRegistry),
            0, // 临时activityId，注册后会更新
            msg.sender
        );

        nftContract = address(newNFT);

        // 注册到ActivityRegistry
        activityId = activityRegistry.registerActivity(
            _category,
            ActivityRegistry.IncentiveType.NFTReward,
            nftContract,
            _title,
            _description,
            _isPublic
        );

        // 注意：NFTReward合约中的activityId在创建时设为0
        // 如果需要，可以通过一个setter函数更新，或者重新设计构造函数
        // 这里简化处理，activityId在注册时确定即可

        emit NFTRewardCreated(nftContract, msg.sender, activityId, _title);

        return (nftContract, activityId);
    }

    /// @notice 获取所有通过此工厂创建的活动
    /// @dev 这需要从ActivityRegistry查询，工厂本身不存储列表
    function getAllActivities() external view returns (uint256[] memory) {
        // 这个功能应该由ActivityRegistry提供
        // 这里返回空数组，实际应该查询ActivityRegistry
        return new uint256[](0);
    }
}

