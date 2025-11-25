// 活动类别
export enum ActivityCategory {
  ProfessionalWeb3 = 0,  // 用于求职，必须进入公开档案
  SocialWeb3 = 1,        // 社交活动，可选进入公开档案
  Lifestyle = 2          // 生活自律类，只进入私密档案
}

// 激励类型
export enum IncentiveType {
  DepositPool = 0,  // 押金奖池（仅用于长期连续挑战）
  NFTReward = 1     // NFT奖励（用于任何需要证明的活动）
}

// NFT类型
export enum NFTType {
  POAP = 0,        // 参与证明（一次性活动）
  Badge = 1,       // 成就徽章（完成证明）
  Dynamic = 2,     // 动态NFT（可更新元数据）
  Completion = 3   // 完成证明（用于Lifestyle活动）
}

// 活动元数据
export interface ActivityMetadata {
  category: ActivityCategory;
  incentiveType: IncentiveType;
  activityContract: string;
  creator: string;
  title: string;
  description: string;
  createdAt: bigint;
  isPublic: boolean;
}

// NFT元数据
export interface NFTMetadata {
  nftType: NFTType;
  activityId: bigint;
  title: string;
  description: string;
  mintedAt: bigint;
  isVerified: boolean;
}

// 活动创建表单数据
export interface CreateActivityFormData {
  category: ActivityCategory;
  incentiveType: IncentiveType;
  title: string;
  description: string;
  // 押金挑战相关
  depositAmount?: string;
  totalRounds?: number;
  maxParticipants?: number;
  // NFT相关
  nftName?: string;
  nftSymbol?: string;
  baseTokenURI?: string;
  // 可见性
  isPublic: boolean;
}

// 类别验证规则
export const CATEGORY_RULES = {
  [ActivityCategory.ProfessionalWeb3]: {
    allowedIncentives: [IncentiveType.NFTReward],
    mustPublic: true,
    description: "用于求职，需要进入公开档案"
  },
  [ActivityCategory.SocialWeb3]: {
    allowedIncentives: [IncentiveType.DepositPool, IncentiveType.NFTReward],
    mustPublic: false,
    description: "社交活动，可选进入公开档案"
  },
  [ActivityCategory.Lifestyle]: {
    allowedIncentives: [IncentiveType.DepositPool, IncentiveType.NFTReward],
    mustPublic: false,
    description: "生活自律类，只进入私密档案"
  }
};

// 验证活动创建表单
export function validateActivityForm(data: CreateActivityFormData): string | null {
  if (!data.title.trim()) {
    return "请输入活动标题";
  }
  if (!data.description.trim()) {
    return "请输入活动描述";
  }

  const rules = CATEGORY_RULES[data.category];
  
  // 检查激励类型是否允许
  if (!rules.allowedIncentives.includes(data.incentiveType)) {
    return `该类别不支持选择的激励类型`;
  }

  // Professional Web3 必须公开
  if (data.category === ActivityCategory.ProfessionalWeb3 && !data.isPublic) {
    return "Professional Web3 活动必须公开";
  }

  // Lifestyle 不能公开
  if (data.category === ActivityCategory.Lifestyle && data.isPublic) {
    return "Lifestyle 活动不能公开";
  }

  // 押金挑战验证
  if (data.incentiveType === IncentiveType.DepositPool) {
    if (!data.depositAmount || parseFloat(data.depositAmount) <= 0) {
      return "请输入有效的押金金额";
    }
    if (!data.totalRounds || data.totalRounds <= 0) {
      return "请输入有效的挑战天数";
    }
    if (!data.maxParticipants || data.maxParticipants <= 0) {
      return "请输入有效的最大参与人数";
    }
  }

  // NFT奖励验证
  if (data.incentiveType === IncentiveType.NFTReward) {
    if (!data.nftName?.trim()) {
      return "请输入NFT名称";
    }
    if (!data.nftSymbol?.trim()) {
      return "请输入NFT符号";
    }
  }

  return null;
}

