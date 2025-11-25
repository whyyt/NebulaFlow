// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Activity Registry - 管理活动类别和激励类型
/// @notice 存储活动的元数据：类别（Professional/Social/Lifestyle）和激励类型（Deposit/NFT）
contract ActivityRegistry {
    enum ActivityCategory {
        ProfessionalWeb3,  // 0: 用于求职，必须进入公开档案
        SocialWeb3,        // 1: 社交活动，可选进入公开档案
        Lifestyle          // 2: 生活自律类，只进入私密档案
    }

    enum IncentiveType {
        DepositPool,      // 0: 押金奖池（仅用于长期连续挑战）
        NFTReward         // 1: NFT奖励（用于任何需要证明的活动）
    }

    struct ActivityMetadata {
        ActivityCategory category;
        IncentiveType incentiveType;
        address activityContract;  // Challenge 或 NFTReward 合约地址
        address creator;
        string title;
        string description;
        uint256 createdAt;
        bool isPublic;  // 是否在公开档案中显示（仅对Professional和Social有效）
    }

    // activityId => ActivityMetadata
    mapping(uint256 => ActivityMetadata) public activities;
    uint256 public activityCount;

    // user => activityIds[] (用户参与的所有活动)
    mapping(address => uint256[]) public userActivities;

    // user => publicActivityIds[] (用户公开档案中的活动)
    mapping(address => uint256[]) public userPublicActivities;

    // activityContract => activityId
    mapping(address => uint256) public contractToActivity;

    event ActivityRegistered(
        uint256 indexed activityId,
        address indexed creator,
        ActivityCategory category,
        IncentiveType incentiveType,
        address activityContract,
        string title
    );

    event ActivityVisibilityUpdated(
        uint256 indexed activityId,
        address indexed user,
        bool isPublic
    );

    /// @notice 注册新活动
    /// @param _category 活动类别
    /// @param _incentiveType 激励类型
    /// @param _activityContract 活动合约地址
    /// @param _title 活动标题
    /// @param _description 活动描述
    /// @param _isPublic 是否公开（仅对Professional和Social有效）
    function registerActivity(
        ActivityCategory _category,
        IncentiveType _incentiveType,
        address _activityContract,
        string memory _title,
        string memory _description,
        bool _isPublic
    ) external returns (uint256) {
        require(_activityContract != address(0), "INVALID_CONTRACT");
        require(bytes(_title).length > 0, "TITLE_REQUIRED");

        // 验证类别和激励类型的组合规则
        _validateCategoryIncentiveCombo(_category, _incentiveType);

        // Professional Web3 必须公开
        if (_category == ActivityCategory.ProfessionalWeb3) {
            require(_isPublic, "PROFESSIONAL_MUST_PUBLIC");
        }

        // Lifestyle 不能公开
        if (_category == ActivityCategory.Lifestyle) {
            require(!_isPublic, "LIFESTYLE_MUST_PRIVATE");
        }

        uint256 activityId = activityCount++;
        activities[activityId] = ActivityMetadata({
            category: _category,
            incentiveType: _incentiveType,
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
            _category,
            _incentiveType,
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

            // 如果是公开活动，添加到公开档案
            ActivityMetadata memory activity = activities[activityId];
            if (activity.isPublic && 
                (activity.category == ActivityCategory.ProfessionalWeb3 || 
                 activity.category == ActivityCategory.SocialWeb3)) {
                userPublicActivities[_user].push(activityId);
            }
        }
    }

    /// @notice 更新活动的公开/私密状态（仅对Social Web3有效）
    function updateActivityVisibility(uint256 _activityId, bool _isPublic) external {
        ActivityMetadata storage activity = activities[_activityId];
        require(activity.creator != address(0), "ACTIVITY_NOT_FOUND");
        require(activity.category == ActivityCategory.SocialWeb3, "ONLY_SOCIAL_CAN_TOGGLE");
        
        // 检查调用者是否参与了该活动
        uint256[] storage userActs = userActivities[msg.sender];
        bool isParticipant = false;
        for (uint256 i = 0; i < userActs.length; i++) {
            if (userActs[i] == _activityId) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "NOT_PARTICIPANT");

        activity.isPublic = _isPublic;

        // 更新用户的公开档案列表
        if (_isPublic) {
            // 添加到公开档案（如果尚未添加）
            uint256[] storage publicActs = userPublicActivities[msg.sender];
            bool alreadyInPublic = false;
            for (uint256 i = 0; i < publicActs.length; i++) {
                if (publicActs[i] == _activityId) {
                    alreadyInPublic = true;
                    break;
                }
            }
            if (!alreadyInPublic) {
                userPublicActivities[msg.sender].push(_activityId);
            }
        } else {
            // 从公开档案中移除
            uint256[] storage publicActs = userPublicActivities[msg.sender];
            for (uint256 i = 0; i < publicActs.length; i++) {
                if (publicActs[i] == _activityId) {
                    publicActs[i] = publicActs[publicActs.length - 1];
                    publicActs.pop();
                    break;
                }
            }
        }

        emit ActivityVisibilityUpdated(_activityId, msg.sender, _isPublic);
    }

    /// @notice 获取用户的所有活动ID
    function getUserActivities(address _user) external view returns (uint256[] memory) {
        return userActivities[_user];
    }

    /// @notice 获取用户的公开活动ID
    function getUserPublicActivities(address _user) external view returns (uint256[] memory) {
        return userPublicActivities[_user];
    }

    /// @notice 获取活动元数据
    function getActivityMetadata(uint256 _activityId) external view returns (ActivityMetadata memory) {
        return activities[_activityId];
    }

    /// @notice 验证类别和激励类型的组合是否有效
    function _validateCategoryIncentiveCombo(ActivityCategory _category, IncentiveType _incentiveType) internal pure {
        // Professional Web3 必须使用 NFT
        if (_category == ActivityCategory.ProfessionalWeb3) {
            require(_incentiveType == IncentiveType.NFTReward, "PROFESSIONAL_REQUIRES_NFT");
        }

        // Deposit Pool 只能用于 Lifestyle 或 Social（长期挑战）
        if (_incentiveType == IncentiveType.DepositPool) {
            require(
                _category == ActivityCategory.Lifestyle || _category == ActivityCategory.SocialWeb3,
                "DEPOSIT_ONLY_LIFESTYLE_OR_SOCIAL"
            );
        }
    }
}

