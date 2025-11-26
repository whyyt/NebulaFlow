// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Challenge.sol";
import "./ActivityRegistry.sol";

/// @title Activity Factory - 押金挑战活动创建工厂
/// @notice 支持创建押金挑战活动，并自动注册到ActivityRegistry
contract ActivityFactory {
    ActivityRegistry public immutable activityRegistry;
    
    // 维护所有创建的挑战地址列表
    address[] public challenges;

    event DepositChallengeCreated(
        address indexed challengeAddress,
        address indexed creator,
        uint256 indexed activityId,
        string title
    );

    constructor(address _activityRegistry) {
        require(_activityRegistry != address(0), "INVALID_REGISTRY");
        activityRegistry = ActivityRegistry(_activityRegistry);
    }

    /// @notice 创建押金挑战活动
    /// @param _title 活动标题
    /// @param _description 活动描述
    /// @param _depositAmount 押金金额
    /// @param _totalRounds 总轮次数
    /// @param _maxParticipants 最大参与人数
    /// @param _isPublic 是否公开
    function createDepositChallenge(
        string memory _title,
        string memory _description,
        uint256 _depositAmount,
        uint256 _totalRounds,
        uint256 _maxParticipants,
        bool _isPublic
    ) external returns (address challengeAddress, uint256 activityId) {
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
        
        // 添加到挑战列表
        challenges.push(challengeAddress);

        // 注册到ActivityRegistry
        activityId = activityRegistry.registerActivity(
            challengeAddress,
            _title,
            _description,
            _isPublic
        );

        emit DepositChallengeCreated(challengeAddress, msg.sender, activityId, _title);

        return (challengeAddress, activityId);
    }

    /// @notice 获取所有通过此工厂创建的挑战地址
    /// @return 所有挑战合约地址数组
    function getAllChallenges() external view returns (address[] memory) {
        return challenges;
    }
    
    /// @notice 获取挑战总数
    /// @return 创建的挑战数量
    function challengeCount() external view returns (uint256) {
        return challenges.length;
    }
}

