// 活动元数据
export interface ActivityMetadata {
  activityContract: string;
  creator: string;
  title: string;
  description: string;
  createdAt: bigint;
  isPublic: boolean;
  activityId?: number; // 可选的活动ID（链上的真实ID）
}

// 押金挑战表单数据
export interface DepositChallengeFormData {
  title: string;
  description: string;
  depositAmount: string;
  totalRounds: number;
  maxParticipants: number;
  isPublic: boolean;
}

// 验证押金挑战表单
export function validateDepositChallengeForm(data: DepositChallengeFormData): string | null {
  if (!data.title.trim()) {
    return "请输入活动标题";
  }
  if (!data.description.trim()) {
    return "请输入活动描述";
  }
  if (!data.depositAmount || parseFloat(data.depositAmount) <= 0) {
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

