// Token 用量状态管理
import { atom } from 'jotai';
import type { StatsCache, TokenOverview } from '@/types/tokenUsage';

// 原始数据
export const statsCacheAtom = atom<StatsCache | null>(null);

// 加载状态
export const statsLoadingAtom = atom<boolean>(false);

// 错误状态
export const statsErrorAtom = atom<string | null>(null);

// 派生 atom：Token 概览统计
export const tokenOverviewAtom = atom<TokenOverview | null>((get) => {
  const stats = get(statsCacheAtom);
  if (!stats) return null;

  const totalTokens = Object.values(stats.modelUsage).reduce(
    (sum, m) => sum + m.inputTokens + m.outputTokens + m.cacheReadInputTokens,
    0
  );

  return {
    totalTokens,
    totalSessions: stats.totalSessions,
    totalMessages: stats.totalMessages,
    modelCount: Object.keys(stats.modelUsage).length,
  };
});

// 模型颜色映射
const COLORS = [
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
];

// 派生 atom：模型颜色映射
export const modelColorsAtom = atom<Record<string, string>>((get) => {
  const stats = get(statsCacheAtom);
  if (!stats) return {};

  const models = Object.keys(stats.modelUsage);
  // 按 token 总量排序，最多的排前面
  models.sort((a, b) => {
    const aTotal = stats.modelUsage[a].inputTokens + stats.modelUsage[a].outputTokens;
    const bTotal = stats.modelUsage[b].inputTokens + stats.modelUsage[b].outputTokens;
    return bTotal - aTotal;
  });

  const colorMap: Record<string, string> = {};
  models.forEach((model, i) => {
    colorMap[model] = COLORS[i % COLORS.length];
  });
  return colorMap;
});
