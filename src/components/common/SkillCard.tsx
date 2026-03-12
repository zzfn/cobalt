import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, Trash2 } from 'lucide-react';
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
import { cn, toBrowsableRepoUrl } from '@/lib/utils';
import type { AiToolType, SkillRegistryEntry, SkillUpdateSummary } from '@/types/skills';
import { AI_TOOL_META } from '@/types/skills';

interface SkillCardProps {
  skill: SkillRegistryEntry;
  updateInfo?: SkillUpdateSummary;
  updating?: boolean;
  onToggle?: (enabled: boolean) => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  onOpenInstalledTool?: (tool: AiToolType) => void;
  className?: string;
}

export default function SkillCard({ skill, updateInfo, updating = false, onToggle, onDelete, onUpdate, onOpenInstalledTool, className }: SkillCardProps) {
  const isCobaltManaged = Boolean(
    skill.metadata.sourceId ||
    skill.metadata.repository ||
    (skill.installedBy && skill.installedBy.length > 0)
  );
  const hasUpdate = Boolean(updateInfo?.hasUpdate);
  const updateSummary = hasUpdate
    ? [
        updateInfo?.outdatedTools?.length ? `待同步 ${updateInfo.outdatedTools.length} 个工具` : null,
        updateInfo?.changedFiles?.length ? `${updateInfo.changedFiles.length} 个文件变更` : null,
        updateInfo?.newFiles?.length ? `新增 ${updateInfo.newFiles.length} 个文件` : null,
        updateInfo?.removedFiles?.length ? `删除 ${updateInfo.removedFiles.length} 个文件` : null,
      ].filter(Boolean)
    : [];

  return (
    <Card
      className={cn(
        'group relative h-full overflow-hidden border-border/70 bg-card/88 hover:border-primary/25 hover:shadow-[0_24px_60px_-34px_rgba(25,39,52,0.45)]',
        hasUpdate && 'border-amber-400/60 bg-amber-50/35 shadow-[0_24px_70px_-34px_rgba(217,119,6,0.28)] dark:bg-amber-500/6 dark:shadow-[0_24px_70px_-34px_rgba(245,158,11,0.18)]',
        className
      )}
    >
      {hasUpdate && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-orange-400" />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
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
            {!isCobaltManaged && (
              <Badge variant="outline" className="text-xs">
                来源未知
              </Badge>
            )}
            {hasUpdate && (
              <Badge className="border-amber-500/30 bg-amber-500/15 text-xs text-amber-700 dark:text-amber-300">
                有更新
              </Badge>
            )}
            {skill.installedBy && skill.installedBy.length > 0 && (
              <div className="inline-flex flex-wrap items-center gap-1.5 rounded-[14px] border border-border/70 bg-muted/35 px-2.5 py-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">已安装到</span>
                {skill.installedBy.map((tool) => {
                  const toolMeta = AI_TOOL_META[tool as keyof typeof AI_TOOL_META];
                  return (
                    <button
                      type="button"
                      key={tool}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-foreground/90 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenInstalledTool?.(tool);
                      }}
                    >
                      <span>{toolMeta?.displayName ?? tool}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {!isCobaltManaged && (
            <p className="text-xs leading-5 text-muted-foreground">
              可能是手动放入 skills 目录。
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {hasUpdate && updateSummary.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="border-amber-400/40 bg-amber-500/8 text-xs text-amber-700 dark:text-amber-300"
              >
                {item}
              </Badge>
            ))}
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
                  {toolMeta.displayName}
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hasUpdate && onUpdate && (
            <Button
              size="sm"
              className="h-8 cursor-pointer bg-amber-500 text-white shadow-[0_10px_24px_-16px_rgba(245,158,11,0.8)] transition-all hover:-translate-y-0.5 hover:bg-amber-500/90 hover:shadow-[0_16px_30px_-18px_rgba(245,158,11,0.9)] active:translate-y-0 active:shadow-[0_8px_18px_-16px_rgba(245,158,11,0.7)] disabled:cursor-not-allowed dark:bg-amber-500 dark:text-slate-950"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUpdate();
              }}
              disabled={updating}
            >
              {updating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {updating ? '更新中...' : '更新'}
            </Button>
          )}
          {skill.url && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); openUrl(toBrowsableRepoUrl(skill.url!)); }}
            >
              <ExternalLink className="h-3 w-3" />
              查看源
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
