import { useEffect, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  statsCacheAtom,
  statsLoadingAtom,
  statsErrorAtom,
  tokenOverviewAtom,
  modelColorsAtom,
} from '@/store/tokenUsageAtoms';
import { readStatsCache } from '@/services/tokenUsage';
import OverviewCards from './components/OverviewCards';
import DailyTokenChart from './components/DailyTokenChart';
import ModelPieChart from './components/ModelPieChart';
import DailyActivityChart from './components/DailyActivityChart';
import HourlyDistribution from './components/HourlyDistribution';
import ModelUsageTable from './components/ModelUsageTable';

export default function TokenUsage() {
  const [stats, setStats] = useAtom(statsCacheAtom);
  const [loading, setLoading] = useAtom(statsLoadingAtom);
  const [, setError] = useAtom(statsErrorAtom);
  const [overview] = useAtom(tokenOverviewAtom);
  const [modelColors] = useAtom(modelColorsAtom);

  const statsFreshness = useMemo(() => {
    if (!stats) return null;
    const allDates = [
      ...stats.dailyModelTokens.map((d) => d.date),
      ...stats.dailyActivity.map((d) => d.date),
    ];
    if (allDates.length === 0) return null;

    const latestDate = allDates.reduce((max, cur) => (cur > max ? cur : max));
    const today = new Date().toISOString().slice(0, 10);
    return {
      latestDate,
      isStale: latestDate < today,
      today,
    };
  }, [stats]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await readStatsCache();
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载统计数据失败';
      setError(message);
      toast.error('加载失败', { description: message });
    } finally {
      setLoading(false);
    }
  }, [setStats, setLoading, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 p-6">
      <div className="sticky top-0 z-20 -mx-2 flex items-center justify-between border-b bg-content-area/95 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-content-area/80">
        <div>
          <h1 className="text-2xl font-bold">Token 用量</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      {overview && <OverviewCards overview={overview} loading={loading} />}

      {statsFreshness?.isStale && (
        <Alert>
          <AlertDescription>
            统计数据可能未更新：当前仅到 {statsFreshness.latestDate}，今天是 {statsFreshness.today}。
            这通常是 Claude 的 stats 缓存尚未重算导致。
          </AlertDescription>
        </Alert>
      )}

      {/* 图表区域 */}
      {stats && (
        <>
          {/* 每日 Token 趋势 + 模型占比 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DailyTokenChart data={stats.dailyModelTokens} modelColors={modelColors} />
            </div>
            <ModelPieChart modelUsage={stats.modelUsage} modelColors={modelColors} />
          </div>

          {/* 每日活动 + 小时分布 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DailyActivityChart data={stats.dailyActivity} />
            <HourlyDistribution hourCounts={stats.hourCounts} />
          </div>

          {/* 模型详细用量表格 */}
          <ModelUsageTable modelUsage={stats.modelUsage} modelColors={modelColors} />
        </>
      )}

      {/* 空状态 */}
      {!loading && !stats && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">暂无统计数据</p>
          <p className="text-sm">请确保 Claude Code 已生成 stats-cache.json</p>
        </div>
      )}
    </div>
  );
}
