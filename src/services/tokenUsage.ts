// Token 用量统计服务
import { invoke } from '@tauri-apps/api/core';
import type { StatsCache } from '@/types/tokenUsage';

/**
 * 读取 stats-cache.json
 */
export async function readStatsCache(): Promise<StatsCache> {
  return invoke<StatsCache>('read_stats_cache');
}

/**
 * 获取 Claude Code 版本号
 */
export async function getClaudeCodeVersion(): Promise<string> {
  return invoke<string>('get_claude_code_version');
}
