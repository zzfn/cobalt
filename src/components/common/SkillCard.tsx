import { Link } from 'react-router-dom';
import { Sparkles, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { SkillRegistryEntry } from '@/types/skills';
import { AI_TOOL_META } from '@/types/skills';

interface SkillCardProps {
  skill: SkillRegistryEntry;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export default function SkillCard({ skill, onToggle, className }: SkillCardProps) {
  const sourceLabels: Record<string, string> = {
    local: '本地',
    remote: '远程',
    builtin: '内置',
  };

  const sourceColors: Record<string, string> = {
    local: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    remote: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    builtin: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

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
          <Switch
            checked={skill.enabled}
            onCheckedChange={onToggle}
            aria-label={`${skill.enabled ? '禁用' : '启用'} ${skill.name}`}
          />
        </div>
        <CardDescription className="line-clamp-2">{skill.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={cn('text-xs', sourceColors[skill.source])}>
            {sourceLabels[skill.source]}
          </Badge>
          {skill.metadata.version && (
            <Badge variant="outline" className="text-xs">
              v{skill.metadata.version}
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
