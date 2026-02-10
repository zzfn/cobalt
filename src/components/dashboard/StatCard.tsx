import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  href?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  trend,
  className,
  loading = false,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        // Figma 风格：明显边框
        'border border-border-strong rounded-lg p-5 transition-colors',
        // 悬停效果 - 克制
        href && 'hover:border-border cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          {loading ? (
            <div className="mt-2 h-7 w-12 animate-pulse rounded bg-muted/50" />
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{value}</span>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : '-'}{trend.value}
                </span>
              )}
            </div>
          )}
          {description && !loading && (
            <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>
          )}
        </div>
        {Icon && (
          // 克制的图标样式 - 小而微妙
          <div className="ml-3 text-muted-foreground/40">
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
