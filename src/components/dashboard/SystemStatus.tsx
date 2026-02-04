import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { ConfigHealth, HealthCheckResult } from '@/types/dashboard';

interface SystemStatusProps {
  health: ConfigHealth | null;
  loading?: boolean;
}

const statusIcons = {
  ok: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
};

const statusColors = {
  ok: 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300',
  warning: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300',
  error: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300',
};

const overallStatusColors = {
  healthy: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const overallStatusLabels = {
  healthy: '健康',
  warning: '警告',
  error: '错误',
};

function HealthCheckItem({
  label,
  result,
}: {
  label: string;
  result: HealthCheckResult;
}) {
  const Icon = statusIcons[result.status];

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${statusColors[result.status]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs text-muted-foreground w-24 text-right truncate">
          {result.message}
        </span>
      </div>
    </div>
  );
}

export default function SystemStatus({ health, loading = false }: SystemStatusProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const overall = health?.overall || 'healthy';

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">系统状态</CardTitle>
              <CardDescription>配置文件健康检查</CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={`${overallStatusColors[overall]} text-white`}
          >
            {overallStatusLabels[overall]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {health ? (
          <div className="divide-y">
            <HealthCheckItem
              label="settings.json"
              result={health.checks.settingsJson}
            />
            <HealthCheckItem
              label="CLAUDE.md"
              result={health.checks.claudeMd}
            />
            <HealthCheckItem
              label="API 配置"
              result={health.checks.apiProfiles}
            />
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            无法获取系统状态
          </div>
        )}
      </CardContent>
    </Card>
  );
}
