// 激励类型枚举
export enum IncentiveType {
  DepositPool = 0,  // 押金奖池模式
  NFTPool = 1       // NFT奖池模式（完全独立，不共享代码）
}

// 活动状态枚举
export enum ActivityStatus {
  Scheduled = 0,  // 未开始
  Active = 1,     // 进行中
  Settled = 2     // 已结束
}

// 活动元数据
export interface ActivityMetadata {
  activityContract: string;
  creator: string;
  creatorName: string;  // 活动创建者名称（用于显示，替换地址）
  title: string;
  description: string;
  createdAt: bigint;
  isPublic: boolean;
  incentiveType: IncentiveType;  // 0=押金池, 1=NFT奖池
  activityId?: number; // 可选的活动ID（链上的真实ID）
  isCompleted?: boolean; // 是否成功完成（分到奖金）
  isEliminated?: boolean; // 是否被淘汰
}

// 押金挑战表单数据
export interface DepositChallengeFormData {
  creatorName: string;  // 活动创建者名称（必填）
  title: string;
  description: string;
  depositAmount: string;
  totalRounds: number;
  maxParticipants: number;
  isPublic: boolean;
}

// 通用活动表单数据（用于创建表单）
export interface ActivityFormData {
  incentiveType: IncentiveType;
  creatorName: string;  // 活动创建者名称（必填）
  title: string;
  description: string;
  depositAmount: string;  // 押金金额
  totalRounds: number;
  maxParticipants: number;
  isPublic: boolean;
}

// 验证押金挑战表单
export function validateDepositChallengeForm(data: DepositChallengeFormData): string | null {
  if (!data.creatorName.trim()) {
    return "请输入活动创建者名称";
  }
  if (!data.title.trim()) {
    return "请输入活动标题";
  }
  if (!data.description.trim()) {
    return "请输入活动描述";
  }
  if (!data.depositAmount || data.depositAmount.trim() === "") {
    return "请输入金额";
  }
  const depositAmountNum = parseFloat(data.depositAmount);
  if (isNaN(depositAmountNum) || depositAmountNum <= 0) {
    return "请输入有效的押金金额";
  }
  if (!data.totalRounds || data.totalRounds <= 0) {
    return "请输入有效的挑战天数";
  }
  if (!data.maxParticipants || data.maxParticipants <= 0) {
    return "请输入有效的最大参与人数";
  }
  return null;
}

// 验证通用活动表单
export function validateActivityForm(data: ActivityFormData): string | null {
  // creatorName 现在由钱包地址自动生成，不需要验证
  if (!data.title.trim()) {
    return "请输入活动标题";
  }
  if (!data.description.trim()) {
    return "请输入活动描述";
  }
  if (!data.depositAmount || data.depositAmount.trim() === "") {
    return "请输入金额";
  }
  const depositAmountNum = parseFloat(data.depositAmount);
  if (isNaN(depositAmountNum) || depositAmountNum <= 0) {
    return "请输入有效的押金金额";
  }
  if (!data.totalRounds || data.totalRounds <= 0) {
    return "请输入有效的挑战天数";
  }
  if (!data.maxParticipants || data.maxParticipants <= 0) {
    return "请输入有效的最大参与人数";
  }
  return null;
}

