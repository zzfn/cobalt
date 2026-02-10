import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ModelUsageDetail } from '@/types/tokenUsage';

interface ModelPieChartProps {
  modelUsage: Record<string, ModelUsageDetail>;
  modelColors: Record<string, string>;
}

// 简化模型名称
function shortModelName(name: string): string {
  return name
    .replace('claude-', '')
    .replace('-20250929', '')
    .replace('-20251101', '')
    .replace('/', '-');
}

// 格式化 token 数量
function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
  return value.toString();
}

export default function ModelPieChart({ modelUsage, modelColors }: ModelPieChartProps) {
  const pieData = useMemo(() => {
    return Object.entries(modelUsage)
      .map(([name, detail]) => ({
        name: shortModelName(name),
        fullName: name,
        value: detail.inputTokens + detail.outputTokens,
      }))
      .sort((a, b) => b.value - a.value);
  }, [modelUsage]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">模型用量占比</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="40%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.fullName}
                  fill={modelColors[entry.fullName] || '#888'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => formatTokens(value ?? 0)}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
