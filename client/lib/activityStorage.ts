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


