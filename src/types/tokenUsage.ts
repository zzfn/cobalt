// Token 用量统计类型定义

// 每日活动数据
export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

// 每日模型 Token 用量
export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

// 模型用量详情
export interface ModelUsageDetail {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
  maxOutputTokens: number;
}

// 最长会话信息
export interface LongestSession {
  sessionId: string;
  duration: number;
  messageCount: number;
  timestamp: string;
}

// stats-cache.json 完整结构
export interface StatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsageDetail>;
  totalSessions: number;
  totalMessages: number;
  longestSession: LongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
  totalSpeculationTimeSavedMs: number;
}

// Token 概览统计
export interface TokenOverview {
  totalTokens: number;
  totalSessions: number;
  totalMessages: number;
  modelCount: number;
}
