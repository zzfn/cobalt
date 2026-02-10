import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ModelUsageDetail } from '@/types/tokenUsage';

interface ModelUsageTableProps {
  modelUsage: Record<string, ModelUsageDetail>;
  modelColors: Record<string, string>;
}

// 格式化 token 数量
function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toString();
}

// 简化模型名称
function shortModelName(name: string): string {
  return name
    .replace('claude-', '')
    .replace('-20250929', '')
    .replace('-20251101', '')
    .replace('/', '-');
}

export default function ModelUsageTable({ modelUsage, modelColors }: ModelUsageTableProps) {
  const rows = useMemo(() => {
    return Object.entries(modelUsage)
      .map(([name, detail]) => ({
        name,
        shortName: shortModelName(name),
        total: detail.inputTokens + detail.outputTokens,
        ...detail,
      }))
      .sort((a, b) => b.total - a.total);
  }, [modelUsage]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">模型详细用量</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">模型</th>
                <th className="pb-2 pr-4 font-medium text-right">Input Tokens</th>
                <th className="pb-2 pr-4 font-medium text-right">Output Tokens</th>
                <th className="pb-2 pr-4 font-medium text-right">Cache Read</th>
                <th className="pb-2 font-medium text-right">总计</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b last:border-0">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: modelColors[row.name] || '#888' }}
                      />
                      <span className="font-medium">{row.shortName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatTokens(row.inputTokens)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatTokens(row.outputTokens)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatTokens(row.cacheReadInputTokens)}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {formatTokens(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
