import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HourlyDistributionProps {
  hourCounts: Record<string, number>;
}

export default function HourlyDistribution({ hourCounts }: HourlyDistributionProps) {
  const chartData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      会话数: hourCounts[String(i)] || 0,
    }));
  }, [hourCounts]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">小时活动分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={1} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="会话数" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
