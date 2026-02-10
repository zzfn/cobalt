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
    <Card className="border border-border-strong">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
          <div>
            <CardTitle className="text-sm font-medium">最近对话</CardTitle>
            <CardDescription className="text-xs">Claude Code 使用记录</CardDescription>
          </div>
        </div>
        {activities.length > 0 && onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-muted/50 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted/50" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted/30" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground/50">
            <History className="h-6 w-6 mb-2" strokeWidth={1.5} />
            <p className="text-xs">暂无活动记录</p>
          </div>
        ) : (
          <ScrollArea
            className="pr-2 [&_[data-radix-scroll-area-scrollbar]]:w-1.5 [&_[data-radix-scroll-area-thumb]]:bg-border/60 hover:[&_[data-radix-scroll-area-thumb]]:bg-border/80"
            style={{ height: maxHeight }}
          >
            <div className="divide-y divide-border/50">
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
