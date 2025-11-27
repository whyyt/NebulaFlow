import { ActivityMetadata } from "./types";

const STORAGE_KEY = "nebulaflow_activities";

/**
 * 从 localStorage 获取活动列表
 */
export function getStoredActivities(): ActivityMetadata[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const activities = JSON.parse(stored);
    // 转换 createdAt 从字符串到 bigint
    return activities.map((activity: any) => ({
      ...activity,
      createdAt: BigInt(activity.createdAt || "0"),
    }));
  } catch (error) {
    console.error("读取本地活动列表失败:", error);
    return [];
  }
}

/**
 * 保存活动到 localStorage
 */
export function saveActivity(activity: ActivityMetadata): void {
  if (typeof window === "undefined") return;
  
  try {
    const existing = getStoredActivities();
    
    // 检查是否已存在（通过 activityContract 判断）
    const exists = existing.some(
      (a) => a.activityContract.toLowerCase() === activity.activityContract.toLowerCase()
    );
    
    if (!exists) {
      const updated = [activity, ...existing];
      // 转换 bigint 为字符串以便存储
      const serialized = updated.map((a) => ({
        ...a,
        createdAt: a.createdAt.toString(),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    }
  } catch (error) {
    console.error("保存活动到本地失败:", error);
  }
}

/**
 * 清除所有本地活动（可选，用于调试）
 */
export function clearStoredActivities(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 获取用户参与的活动列表（按用户地址区分，包括所有参与过的活动）
 */
export function getUserCompletedActivities(userAddress: string): ActivityMetadata[] {
  if (typeof window === "undefined" || !userAddress) return [];
  
  try {
    const key = `nebulaflow_completed_${userAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const activities = JSON.parse(stored);
    // 转换 createdAt 从字符串到 bigint
    return activities.map((activity: any) => ({
      ...activity,
      createdAt: BigInt(activity.createdAt || "0"),
      isCompleted: activity.isCompleted ?? false,
      isEliminated: activity.isEliminated ?? false,
    }));
  } catch (error) {
    console.error("读取用户参与活动列表失败:", error);
    return [];
  }
}

/**
 * 保存用户参与的活动到 localStorage（按用户地址区分，包括所有参与过的活动）
 */
export function saveUserCompletedActivity(userAddress: string, activity: ActivityMetadata): void {
  if (typeof window === "undefined" || !userAddress) return;
  
  try {
    const key = `nebulaflow_completed_${userAddress.toLowerCase()}`;
    const existing = getUserCompletedActivities(userAddress);
    
    // 检查是否已存在（通过 activityContract 或 activityId 判断）
    const existingIndex = existing.findIndex(
      (a) => 
        (a.activityContract && activity.activityContract && 
         a.activityContract.toLowerCase() === activity.activityContract.toLowerCase()) ||
        (a.activityId !== undefined && activity.activityId !== undefined && 
         a.activityId === activity.activityId)
    );
    
    if (existingIndex >= 0) {
      // 如果已存在，更新状态（保留最新的状态信息）
      existing[existingIndex] = {
        ...existing[existingIndex],
        ...activity,
        // fix: 如果新数据中有明确的状态值，使用新值；否则保留旧值
        isCompleted: activity.isCompleted !== undefined ? activity.isCompleted : (existing[existingIndex].isCompleted ?? false),
        isEliminated: activity.isEliminated !== undefined ? activity.isEliminated : (existing[existingIndex].isEliminated ?? false),
      };
    } else {
      // 如果不存在，添加新活动
      existing.unshift(activity);
    }
    
    // 转换 bigint 为字符串以便存储
    const serialized = existing.map((a) => ({
      ...a,
      createdAt: a.createdAt.toString(),
    }));
    localStorage.setItem(key, JSON.stringify(serialized));
    console.log("✅ 活动已保存/更新到用户档案:", activity.title);
  } catch (error) {
    console.error("保存用户参与活动失败:", error);
  }
}


