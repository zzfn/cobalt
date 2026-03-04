import { Link } from 'react-router-dom';
import { Sparkles, ExternalLink, Trash2, Database } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { SkillRegistryEntry } from '@/types/skills';
import { AI_TOOL_META } from '@/types/skills';

interface SkillCardProps {
  skill: SkillRegistryEntry;
  onToggle?: (enabled: boolean) => void;
  onDelete?: () => void;
  className?: string;
  sourceName?: string;  // 市场源名称（可选）
}

export default function SkillCard({ skill, onToggle, onDelete, className, sourceName }: SkillCardProps) {
  return (
    <Card className={cn('group relative transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              <Link
                to={`/skills/${skill.name}`}
                className="hover:underline"
              >
                {skill.name}
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除 Skill "{skill.name}" 吗？此操作无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Switch
              checked={skill.enabled}
              onCheckedChange={onToggle}
              aria-label={`${skill.enabled ? '禁用' : '启用'} ${skill.name}`}
            />
          </div>
        </div>
        <CardDescription className="line-clamp-2">{skill.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {skill.metadata.sourceId && sourceName && (
              <Badge variant="secondary" className="text-xs">
                <Database className="mr-1 h-3 w-3" />
                来自 {sourceName}
              </Badge>
            )}
            {skill.installedBy && skill.installedBy.length > 0 && (
              <div className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-muted/35 px-2 py-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">安装自</span>
                {skill.installedBy.map((tool) => {
                  const toolMeta = AI_TOOL_META[tool as keyof typeof AI_TOOL_META];
                  return (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1 rounded border border-border/70 bg-background px-1.5 py-0.5 text-[11px] text-foreground/90"
                    >
                      <span>{toolMeta?.icon ?? '•'}</span>
                      <span>{toolMeta?.displayName ?? tool}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {skill.metadata.targetTools?.map((toolType) => {
              const toolMeta = AI_TOOL_META[toolType as keyof typeof AI_TOOL_META];
              if (!toolMeta) return null;
              return (
                <Badge
                  key={toolType}
                  variant="outline"
                  className="text-xs"
                  title={`适用于 ${toolMeta.displayName}`}
                >
                  {toolMeta.icon} {toolMeta.displayName}
                </Badge>
              );
            })}
            {skill.metadata.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        {skill.url && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); openUrl(skill.url!); }}
          >
            <ExternalLink className="h-3 w-3" />
            查看源
          </button>
        )}
      </CardContent>
    </Card>
  );
}
