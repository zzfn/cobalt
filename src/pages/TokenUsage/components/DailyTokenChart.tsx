import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DailyModelTokens } from '@/types/tokenUsage';

interface DailyTokenChartProps {
  data: DailyModelTokens[];
  modelColors: Record<string, string>;
}

// 格式化 token 数量
function formatTokens(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
  return value.toString();
}

export default function DailyTokenChart({ data, modelColors }: DailyTokenChartProps) {
  // 收集所有模型名称
  const models = useMemo(() => {
    const modelSet = new Set<string>();
    data.forEach((d) => {
      Object.keys(d.tokensByModel).forEach((m) => modelSet.add(m));
    });
    return Array.from(modelSet);
  }, [data]);

  // 转换为 recharts 需要的扁平格式
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: d.date.slice(5), // MM-DD
      ...d.tokensByModel,
    }));
  }, [data]);

  // 简化模型名称用于图例
  function shortModelName(name: string): string {
    return name
      .replace('claude-', '')
      .replace('-20250929', '')
      .replace('-20251101', '')
      .replace('/', '-');
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">每日 Token 趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatTokens} className="text-xs" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value?: number, name?: string) => [formatTokens(value ?? 0), shortModelName(name ?? '')]}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend formatter={shortModelName} />
            {models.map((model) => (
              <Area
                key={model}
                type="monotone"
                dataKey={model}
                stackId="1"
                stroke={modelColors[model] || '#888'}
                fill={modelColors[model] || '#888'}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
