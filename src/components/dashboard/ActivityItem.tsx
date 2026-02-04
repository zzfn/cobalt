import { cn } from '@/lib/utils';
import type { ActivityRecord, ActivityType } from '@/types/dashboard';
import {
  Archive,
  Key,
  MessageSquare,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface ActivityItemProps {
  activity: ActivityRecord;
  className?: string;
}

const activityIcons: Record<ActivityType, LucideIcon> = {
  skill_toggle: Sparkles,
  profile_switch: Key,
  settings_update: Settings,
  backup_created: Archive,
  conversation: MessageSquare,
};

const activityColors: Record<ActivityType, string> = {
  skill_toggle: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  profile_switch: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  settings_update: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  backup_created: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  conversation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
};

/**
 * 格式化相对时间
 * @param timestamp - ISO时间字符串
 * @returns 相对时间描述
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
    return `${diffMins} 分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours} 小时前`;
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }
}

export default function ActivityItem({ activity, className }: ActivityItemProps) {
  const Icon = activityIcons[activity.type];

  return (
    <div className={cn('flex items-start gap-3 py-3', className)}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          activityColors[activity.type]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}
