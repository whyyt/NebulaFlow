// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Activity Registry - 管理活动
/// @notice 存储活动的元数据
contract ActivityRegistry {
    struct ActivityMetadata {
        address activityContract;  // Challenge 合约地址
        address creator;
        string title;
        string description;
        uint256 createdAt;
        bool isPublic;  // 是否公开显示
    }

    // activityId => ActivityMetadata
    mapping(uint256 => ActivityMetadata) public activities;
    uint256 public activityCount;

    // user => activityIds[] (用户参与的所有活动)
    mapping(address => uint256[]) public userActivities;

    // activityContract => activityId
    mapping(address => uint256) public contractToActivity;

    event ActivityRegistered(
        uint256 indexed activityId,
        address indexed creator,
        address activityContract,
        string title
    );


    /// @notice 注册新活动
    /// @param _activityContract 活动合约地址
    /// @param _title 活动标题
    /// @param _description 活动描述
    /// @param _isPublic 是否公开
    function registerActivity(
        address _activityContract,
        string memory _title,
        string memory _description,
        bool _isPublic
    ) external returns (uint256) {
        require(_activityContract != address(0), "INVALID_CONTRACT");
        require(bytes(_title).length > 0, "TITLE_REQUIRED");

        uint256 activityId = activityCount++;
        activities[activityId] = ActivityMetadata({
            activityContract: _activityContract,
            creator: msg.sender,
            title: _title,
            description: _description,
            createdAt: block.timestamp,
            isPublic: _isPublic
        });

        contractToActivity[_activityContract] = activityId;

        emit ActivityRegistered(
            activityId,
            msg.sender,
            _activityContract,
            _title
        );

        return activityId;
    }

    /// @notice 用户加入活动时调用（由前端或合约调用）
    function addUserActivity(address _user, address _activityContract) external {
        uint256 activityId = contractToActivity[_activityContract];
        require(activityId > 0 || activities[activityId].activityContract != address(0), "ACTIVITY_NOT_FOUND");

        // 检查是否已添加
        uint256[] storage userActs = userActivities[_user];
        bool alreadyAdded = false;
        for (uint256 i = 0; i < userActs.length; i++) {
            if (userActs[i] == activityId) {
                alreadyAdded = true;
                break;
            }
        }

        if (!alreadyAdded) {
            userActivities[_user].push(activityId);
        }
    }

    /// @notice 获取用户的所有活动ID
    function getUserActivities(address _user) external view returns (uint256[] memory) {
        return userActivities[_user];
    }

    /// @notice 获取活动元数据
    function getActivityMetadata(uint256 _activityId) external view returns (ActivityMetadata memory) {
        return activities[_activityId];
    }

    /// @notice 获取活动元数据（返回多个值，避免 struct 解析问题）
    /// @param _activityId 活动ID
    /// @return activityContract 活动合约地址
    /// @return creator 创建者地址
    /// @return title 活动标题
    /// @return description 活动描述
    /// @return createdAt 创建时间戳
    /// @return isPublic 是否公开
    function getActivityMetadataTuple(uint256 _activityId) external view returns (
        address activityContract,
        address creator,
        string memory title,
        string memory description,
        uint256 createdAt,
        bool isPublic
    ) {
        ActivityMetadata memory metadata = activities[_activityId];
        return (
            metadata.activityContract,
            metadata.creator,
            metadata.title,
            metadata.description,
            metadata.createdAt,
            metadata.isPublic
        );
    }

}

