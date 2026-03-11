import { cn } from '@/lib/utils';
import type { ActivityRecord } from '@/types/dashboard';

interface ActivityItemProps {
  activity: ActivityRecord;
  className?: string;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }
}

export default function ActivityItem({ activity, className }: ActivityItemProps) {
  return (
    <div className={cn('rounded-[16px] border border-border/55 px-3.5 py-2.5', className)}>
      <div className="min-w-0">
        <p className="text-[13px] leading-5">{activity.description}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}
