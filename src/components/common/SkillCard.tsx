import { Link } from 'react-router-dom';
import { Sparkles, ExternalLink, Trash2 } from 'lucide-react';
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
}

export default function SkillCard({ skill, onToggle, onDelete, className }: SkillCardProps) {
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
        <div className="flex flex-wrap items-center gap-2">
          {skill.installedBy && skill.installedBy.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              安装自: {skill.installedBy.map(tool => {
                const toolMeta = AI_TOOL_META[tool as keyof typeof AI_TOOL_META];
                return toolMeta ? `${toolMeta.icon} ${toolMeta.displayName}` : tool;
              }).join(', ')}
            </Badge>
          )}
          {skill.metadata.targetTools?.map((toolType) => (
            <Badge
              key={toolType}
              variant="outline"
              className="text-xs"
              title={`适用于 ${AI_TOOL_META[toolType].displayName}`}
            >
              {AI_TOOL_META[toolType].icon} {AI_TOOL_META[toolType].displayName}
            </Badge>
          ))}
          {skill.metadata.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        {skill.url && (
          <a
            href={skill.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            查看源
          </a>
        )}
      </CardContent>
    </Card>
  );
}
