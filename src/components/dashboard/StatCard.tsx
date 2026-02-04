import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  description?: string;
  icon: LucideIcon;
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
    <Card
      className={cn(
        'transition-all',
        href && 'cursor-pointer hover:shadow-md hover:border-primary/50',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{value}</span>
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
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
