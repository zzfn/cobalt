import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
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
          <BarChart3 className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">暂无统计数据</p>
          <p className="text-sm">请确保 Claude Code 已生成 stats-cache.json</p>
        </div>
      )}
    </div>
  );
}
