import { atom } from 'jotai';
import type { DashboardStats, ActivityRecord, ConfigHealth } from '@/types/dashboard';
import { skillsListAtom } from './skillsAtoms';

// 仪表盘统计数据
export const dashboardStatsAtom = atom<DashboardStats | null>(null);

// 最近活动记录
export const recentActivitiesAtom = atom<ActivityRecord[]>([]);

// 配置健康状态
export const configHealthAtom = atom<ConfigHealth | null>(null);

// 仪表盘加载状态
export const dashboardLoadingAtom = atom<boolean>(false);

// 仪表盘错误状态
export const dashboardErrorAtom = atom<string | null>(null);

// 派生atom: Skills统计
export const skillsStatsAtom = atom((get) => {
  const skills = get(skillsListAtom);
  return {
    total: skills.length,
    enabled: skills.filter(s => s.enabled).length,
    disabled: skills.filter(s => !s.enabled).length,
    bySource: skills.reduce((acc, s) => {
      acc[s.source] = (acc[s.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
});

// 派生atom: 是否有警告
export const hasWarningsAtom = atom((get) => {
  const health = get(configHealthAtom);
  if (!health) return false;
  return Object.values(health.checks).some(
    check => check.status === 'warning' || check.status === 'error'
  );
});
