import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { StatsCache } from '@/types/tokenUsage';

interface TokenUsageOverviewProps {
  stats: StatsCache | null;
  loading?: boolean;
  className?: string;
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 计算总 Token 数
function getTotalTokens(stats: StatsCache | null): number {
  if (!stats) return 0;
  let total = 0;
  for (const [_, modelData] of Object.entries(stats.modelUsage)) {
    total += modelData.inputTokens + modelData.outputTokens;
  }
  return total;
}

export default function TokenUsageOverview({
  stats,
  loading = false,
  className,
}: TokenUsageOverviewProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32 mt-1" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTokens = getTotalTokens(stats);
  const lastUpdate = stats?.lastComputedDate ?? null;

  return (
    <Link to="/token-usage" className="block">
      <Card className={cn(className, "h-full cursor-pointer border-border/70 bg-card transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/30")}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-medium">Token 用量</CardTitle>
              {lastUpdate && (
                <CardDescription className="text-xs">
                  更新于 {formatDate(lastUpdate)}
                </CardDescription>
              )}
            </div>
            <div className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              Usage
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em] sm:text-[28px]">{formatNumber(totalTokens)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">总 Token</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em] sm:text-[28px]">
                {stats?.totalMessages?.toLocaleString() ?? '0'}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">总消息</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em] sm:text-[28px]">
                {stats?.totalSessions?.toLocaleString() ?? '0'}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">总会话</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
