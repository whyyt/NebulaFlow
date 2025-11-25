import { ActivityRegistry } from "../../typechain-types";
import { ActivityCategory, IncentiveType, ActivityMetadata } from "./types";

// ActivityRegistry ABI (简化版，实际应从合约生成)
export const ACTIVITY_REGISTRY_ABI = [
  "function registerActivity(uint8 _category, uint8 _incentiveType, address _activityContract, string memory _title, string memory _description, bool _isPublic) external returns (uint256)",
  "function addUserActivity(address _user, address _activityContract) external",
  "function updateActivityVisibility(uint256 _activityId, bool _isPublic) external",
  "function getUserActivities(address _user) external view returns (uint256[] memory)",
  "function getUserPublicActivities(address _user) external view returns (uint256[] memory)",
  "function getActivityMetadata(uint256 _activityId) external view returns (tuple(uint8 category, uint8 incentiveType, address activityContract, address creator, string title, string description, uint256 createdAt, bool isPublic))",
  "function contractToActivity(address) external view returns (uint256)",
  "event ActivityRegistered(uint256 indexed activityId, address indexed creator, uint8 category, uint8 incentiveType, address activityContract, string title)",
  "event ActivityVisibilityUpdated(uint256 indexed activityId, address indexed user, bool isPublic)"
] as const;

// NFT Reward ABI (简化版)
export const NFT_REWARD_ABI = [
  "function mint(address _to, uint8 _nftType, string memory _title, string memory _description, string memory _tokenURI) external returns (uint256)",
  "function batchMint(address[] memory _recipients, uint8 _nftType, string memory _title, string memory _description, string[] memory _tokenURIs) external",
  "function getUserTokens(address _user) external view returns (uint256[] memory)",
  "function getUserActivityToken(address _user, uint256 _activityId) external view returns (uint256)",
  "function getNFTMetadata(uint256 _tokenId) external view returns (tuple(uint8 nftType, uint256 activityId, string title, string description, uint256 mintedAt, bool isVerified))",
  "function tokenURI(uint256 _tokenId) external view returns (string memory)",
  "function ownerOf(uint256 _tokenId) external view returns (address)",
  "event NFTMinted(uint256 indexed tokenId, address indexed to, uint8 nftType, uint256 activityId, string tokenURI)"
] as const;

// ActivityFactory ABI
export const ACTIVITY_FACTORY_ABI = [
  "function createDepositChallenge(uint8 _category, string memory _title, string memory _description, uint256 _depositAmount, uint256 _totalRounds, uint256 _maxParticipants, bool _isPublic) external returns (address challengeAddress, uint256 activityId)",
  "function createNFTReward(uint8 _category, string memory _name, string memory _symbol, string memory _baseTokenURI, string memory _title, string memory _description, bool _isPublic) external returns (address nftContract, uint256 activityId)",
  "event DepositChallengeCreated(address indexed challengeAddress, address indexed creator, uint256 indexed activityId, string title)",
  "event NFTRewardCreated(address indexed nftContract, address indexed creator, uint256 indexed activityId, string title)"
] as const;

// 辅助函数：获取活动元数据
export async function getActivityMetadata(
  registry: ActivityRegistry,
  activityId: bigint
): Promise<ActivityMetadata> {
  const metadata = await registry.getActivityMetadata(activityId);
  return {
    category: metadata.category as ActivityCategory,
    incentiveType: metadata.incentiveType as IncentiveType,
    activityContract: metadata.activityContract,
    creator: metadata.creator,
    title: metadata.title,
    description: metadata.description,
    createdAt: metadata.createdAt,
    isPublic: metadata.isPublic
  };
}

