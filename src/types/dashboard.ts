// 仪表盘相关类型定义

/**
 * 仪表盘统计数据
 */
export interface DashboardStats {
  skills: {
    total: number;
    enabled: number;
    disabled: number;
    bySource: Record<string, number>;
  };
  profiles: {
    total: number;
    activeId: string | null;
  };
  config: {
    envVarsCount: number;
    permissionsCount: number;
    hasGlobalInstructions: boolean;
  };
}

/**
 * 活动记录类型
 */
export type ActivityType =
  | 'skill_toggle'
  | 'profile_switch'
  | 'settings_update'
  | 'backup_created'
  | 'conversation';

/**
 * 活动记录
 */
export interface ActivityRecord {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: 'ok' | 'warning' | 'error';
  message: string;
}

/**
 * 配置健康状态
 */
export interface ConfigHealth {
  overall: 'healthy' | 'warning' | 'error';
  checks: {
    settingsJson: HealthCheckResult;
    claudeMd: HealthCheckResult;
    apiProfiles: HealthCheckResult;
  };
}

/**
 * 统计卡片数据
 */
export interface StatCardData {
  title: string;
  value: number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
