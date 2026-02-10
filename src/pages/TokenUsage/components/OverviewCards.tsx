import { Coins, MessageSquare, MonitorPlay, Cpu } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import type { TokenOverview } from '@/types/tokenUsage';

// 格式化大数字
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

interface OverviewCardsProps {
  overview: TokenOverview;
  loading?: boolean;
}

export default function OverviewCards({ overview, loading }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        title="总 Token"
        value={overview.totalTokens}
        description={formatNumber(overview.totalTokens)}
        icon={Coins}
        loading={loading}
      />
      <StatCard
        title="总会话"
        value={overview.totalSessions}
        icon={MonitorPlay}
        loading={loading}
      />
      <StatCard
        title="总消息"
        value={overview.totalMessages}
        icon={MessageSquare}
        loading={loading}
      />
      <StatCard
        title="模型数"
        value={overview.modelCount}
        icon={Cpu}
        loading={loading}
      />
    </div>
  );
}
