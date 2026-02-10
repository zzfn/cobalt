import { Link } from 'react-router-dom';
import { FolderOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityRecord } from '@/types/dashboard';

interface RecentProjectsProps {
  activities: ActivityRecord[];
  loading?: boolean;
  className?: string;
}

interface ProjectInfo {
  name: string;
  count: number;
  lastActivity: string;
}

// 从活动记录中提取项目信息
function extractProjects(activities: ActivityRecord[]): ProjectInfo[] {
  const projectMap = new Map<string, { count: number; lastActivity: string }>();

  activities.forEach((activity) => {
    const project = activity.metadata?.project;
    if (project && typeof project === 'string') {
      const existing = projectMap.get(project);
      if (existing) {
        existing.count++;
        if (activity.timestamp > existing.lastActivity) {
          existing.lastActivity = activity.timestamp;
        }
      } else {
        projectMap.set(project, {
          count: 1,
          lastActivity: activity.timestamp,
        });
      }
    }
  });

  // 转换为数组并按最近活动排序
  return Array.from(projectMap.entries())
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .slice(0, 5);
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function RecentProjects({
  activities,
  loading = false,
  className,
}: RecentProjectsProps) {
  const projects = extractProjects(activities);

  if (loading) {
    return (
      <div className={cn('border border-border-strong rounded-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
          <h2 className="text-sm font-medium">最近项目</h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3.5 w-32 animate-pulse rounded bg-muted/50" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className={cn('border border-border-strong rounded-lg p-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
        <h2 className="text-sm font-medium">最近项目</h2>
      </div>
      <div className="space-y-0.5">
        {projects.map((project) => (
          <Link
            key={project.name}
            to="/token-usage"
            className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
              <span className="text-sm truncate">{project.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground/60 shrink-0">
              <span>{project.count} 次对话</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" strokeWidth={1.5} />
                {formatRelativeTime(project.lastActivity)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
