import { useEffect, useCallback, useState } from 'react';
import { useAtom } from 'jotai';
import {
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ActivityList from '@/components/dashboard/ActivityList';
import TokenUsageOverview from '@/components/dashboard/TokenUsageOverview';
import NetworkChecker from '@/components/dashboard/NetworkChecker';
import {
  recentActivitiesAtom,
  dashboardLoadingAtom,
  dashboardErrorAtom,
} from '@/store/dashboardAtoms';
import { readConversationHistory } from '@/services/config';
import { clearActivities } from '@/lib/activityLogger';
import { readStatsCache } from '@/services/tokenUsage';

function formatCompactNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

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

  const totalTokens: number = tokenStats
    ? (Object.values(tokenStats.modelUsage ?? {}) as any[]).reduce((sum: number, model: any) => {
        return sum + model.inputTokens + model.outputTokens;
      }, 0)
    : 0;
  const projectCount = new Set(
    activities
      .map((activity) => activity.metadata?.project)
      .filter((project): project is string => typeof project === 'string' && project.length > 0)
  ).size;
  const summaryCards = [
    {
      title: '最近对话',
      value: activities.length.toString(),
      description: '最近 20 条历史记录',
    },
    {
      title: '活跃项目',
      value: projectCount.toString(),
      description: '从最近对话中识别',
    },
    {
      title: '累计 Token',
      value: formatCompactNumber(totalTokens),
      description: '本地缓存统计',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel-surface px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em]">仪表板</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              最近使用情况与当前状态
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
            className="h-11 px-4"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.7} />
            刷新数据
          </Button>
        </div>
      </section>

      {error && (
        <div className="panel-surface border-destructive/30 bg-destructive/5 px-5 py-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <section className="panel-surface px-4 py-3 sm:px-5">
        <div className="grid gap-3 md:grid-cols-3">
          {summaryCards.map((item) => (
            <div
              key={item.title}
              className="flex items-baseline justify-between rounded-[18px] px-3 py-3 md:block md:px-4"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">
                  {item.title}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">
                  {item.value}
                </p>
              </div>
              <p className="text-right text-xs text-muted-foreground/75 md:mt-2 md:text-left">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <TokenUsageOverview stats={tokenStats} loading={loading} />
        </div>
        <div>
          <NetworkChecker />
        </div>
      </div>

      <div>
        <ActivityList
          activities={activities}
          onClear={handleClearActivities}
          loading={loading}
          maxHeight="420px"
        />
      </div>
    </div>
  );
}
