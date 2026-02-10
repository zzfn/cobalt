import { useEffect, useCallback, useState } from 'react';
import { useAtom } from 'jotai';
import {
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ActivityList from '@/components/dashboard/ActivityList';
import RecentProjects from '@/components/dashboard/RecentProjects';
import TokenUsageOverview from '@/components/dashboard/TokenUsageOverview';
import WorkspaceInfo from '@/components/dashboard/WorkspaceInfo';
import {
  recentActivitiesAtom,
  dashboardLoadingAtom,
  dashboardErrorAtom,
} from '@/store/dashboardAtoms';
import { readConversationHistory } from '@/services/config';
import { clearActivities } from '@/lib/activityLogger';
import { readStatsCache } from '@/services/tokenUsage';

export default function Dashboard() {
  const [activities, setActivities] = useAtom(recentActivitiesAtom);
  const [loading, setLoading] = useAtom(dashboardLoadingAtom);
  const [error, setError] = useAtom(dashboardErrorAtom);
  const [tokenStats, setTokenStats] = useState<any>(null);

  // 加载仪表盘数据
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [conversationHistory, statsCache] = await Promise.all([
        readConversationHistory(20),
        readStatsCache().catch(() => null),
      ]);

      setActivities(conversationHistory);
      setTokenStats(statsCache);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载仪表盘数据失败';
      setError(message);
      toast.error('加载失败', { description: message });
    } finally {
      setLoading(false);
    }
  }, [setActivities, setError, setLoading]);

  // 初始加载
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 清除活动记录
  const handleClearActivities = () => {
    clearActivities();
    setActivities([]);
    toast.success('活动记录已清除');
  };

  return (
    <div className="space-y-8">
      {/* 页面标题 - Figma 极简风格 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-5 w-5 text-muted-foreground/50" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">仪表板</h1>
            <p className="text-sm text-muted-foreground/60">
              Claude Code 配置与管理
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadDashboardData}
          disabled={loading}
          className="h-8 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          刷新
        </Button>
      </div>

      {/* 错误提示 - 极简风格 */}
      {error && (
        <div className="border-l-2 border-destructive pl-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 第一行：Token 用量 + 工作区 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TokenUsageOverview stats={tokenStats} loading={loading} />
        <WorkspaceInfo />
      </div>

      {/* 第二行：最近项目 + 最近对话 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentProjects activities={activities} loading={loading} />
        <ActivityList
          activities={activities}
          onClear={handleClearActivities}
          loading={loading}
          maxHeight="320px"
        />
      </div>
    </div>
  );
}
