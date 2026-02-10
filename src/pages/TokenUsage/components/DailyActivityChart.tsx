import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DailyActivity } from '@/types/tokenUsage';

interface DailyActivityChartProps {
  data: DailyActivity[];
}

export default function DailyActivityChart({ data }: DailyActivityChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: d.date.slice(5),
      消息: d.messageCount,
      会话: d.sessionCount,
      工具调用: d.toolCallCount,
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">每日活动统计</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar dataKey="消息" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="会话" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="工具调用" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
