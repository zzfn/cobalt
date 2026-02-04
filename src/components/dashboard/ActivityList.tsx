import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, Trash2 } from 'lucide-react';
import ActivityItem from './ActivityItem';
import type { ActivityRecord } from '@/types/dashboard';

interface ActivityListProps {
  activities: ActivityRecord[];
  onClear?: () => void;
  maxHeight?: string;
  loading?: boolean;
}

export default function ActivityList({
  activities,
  onClear,
  maxHeight = '280px',
  loading = false,
}: ActivityListProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">最近对话</CardTitle>
            <CardDescription>Claude Code 最近的使用记录</CardDescription>
          </div>
        </div>
        {activities.length > 0 && onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <History className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">暂无活动记录</p>
            <p className="text-xs mt-1">执行操作后将显示在这里</p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="divide-y">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
