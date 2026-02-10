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
  const Icon = activityIcons[activity.type];

  return (
    <div className={cn('flex items-start gap-3 py-2.5 px-1', className)}>
      {/* 克制的图标 - 极小，低不透明度 */}
      <div className="mt-0.5 text-muted-foreground/30">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{activity.description}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}
