import type { ActivityRecord, ActivityType } from '@/types/dashboard';

const STORAGE_KEY = 'dashboard-activities';
const MAX_ACTIVITIES = 50;

/**
 * 记录活动
 * @param type - 活动类型
 * @param description - 活动描述
 * @param metadata - 额外元数据
 */
export function logActivity(
  type: ActivityType,
  description: string,
  metadata?: Record<string, any>
): void {
  const activities = getActivities();

  const newActivity: ActivityRecord = {
    id: crypto.randomUUID(),
    type,
    description,
    timestamp: new Date().toISOString(),
    metadata,
  };

  activities.unshift(newActivity);

  // 限制最大数量
  if (activities.length > MAX_ACTIVITIES) {
    activities.splice(MAX_ACTIVITIES);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

/**
 * 获取所有活动记录
 * @returns 活动记录列表
 */
export function getActivities(): ActivityRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * 清除所有活动记录
 */
export function clearActivities(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 获取最近N条活动记录
 * @param count - 数量限制
 * @returns 活动记录列表
 */
export function getRecentActivities(count: number = 10): ActivityRecord[] {
  return getActivities().slice(0, count);
}
