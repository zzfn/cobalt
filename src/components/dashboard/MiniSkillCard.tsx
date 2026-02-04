import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { SkillRegistryEntry } from '@/types/skills';

interface MiniSkillCardProps {
  skill: SkillRegistryEntry;
  onToggle?: (enabled: boolean) => void;
}

function MiniSkillCard({ skill, onToggle }: MiniSkillCardProps) {
  return (
    <div className="flex items-center justify-between py-2 group">
      <Link
        to={`/skills/${skill.name}`}
        className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{skill.name}</span>
        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      </Link>
      <Switch
        checked={skill.enabled}
        onCheckedChange={onToggle}
        className="ml-2"
        aria-label={`${skill.enabled ? '禁用' : '启用'} ${skill.name}`}
      />
    </div>
  );
}

interface SkillsOverviewProps {
  skills: SkillRegistryEntry[];
  onToggleSkill?: (skillName: string, enabled: boolean) => void;
  loading?: boolean;
  maxHeight?: string;
}

export default function SkillsOverview({
  skills,
  onToggleSkill,
  loading = false,
  maxHeight = '200px',
}: SkillsOverviewProps) {
  // 按启用状态排序，启用的在前
  const sortedSkills = [...skills].sort((a, b) => {
    if (a.enabled === b.enabled) return 0;
    return a.enabled ? -1 : 1;
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Skills 概览</CardTitle>
              <CardDescription>
                {loading ? '加载中...' : `${skills.filter(s => s.enabled).length} 个已启用`}
              </CardDescription>
            </div>
          </div>
          <Link
            to="/skills"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-5 w-10" />
              </div>
            ))}
          </div>
        ) : sortedSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">暂无 Skills</p>
            <Link
              to="/skills"
              className="text-xs text-primary hover:underline mt-1"
            >
              前往管理页面
            </Link>
          </div>
        ) : (
          <ScrollArea className="pr-4" style={{ maxHeight }}>
            <div className="divide-y">
              {sortedSkills.slice(0, 10).map((skill) => (
                <MiniSkillCard
                  key={skill.name}
                  skill={skill}
                  onToggle={onToggleSkill ? (enabled) => onToggleSkill(skill.name, enabled) : undefined}
                />
              ))}
            </div>
            {sortedSkills.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                还有 {sortedSkills.length - 10} 个 Skills...
              </p>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
