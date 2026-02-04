import { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Sparkles, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import SkillCard from '@/components/common/SkillCard';
import {
  skillsListAtom,
  filteredSkillsAtom,
  skillsFilterAtom,
  skillsLoadingAtom,
} from '@/store/skillsAtoms';
import type { SkillRegistryEntry } from '@/types/skills';

// 模拟数据
const mockSkills: SkillRegistryEntry[] = [
  {
    id: '1',
    name: 'commit',
    description: '创建高质量的 Git 提交信息',
    enabled: true,
    source: 'builtin',
    metadata: {
      name: 'commit',
      version: '1.0.0',
      description: '创建高质量的 Git 提交信息',
      tags: ['git', 'workflow'],
    },
  },
  {
    id: '2',
    name: 'code-review',
    description: '代码审查和质量检查',
    enabled: true,
    source: 'builtin',
    metadata: {
      name: 'code-review',
      version: '1.0.0',
      description: '代码审查和质量检查',
      tags: ['review', 'quality'],
    },
  },
  {
    id: '3',
    name: 'custom-skill',
    description: '自定义的本地 Skill',
    enabled: false,
    source: 'local',
    path: '~/.claude/skills/custom-skill',
    metadata: {
      name: 'custom-skill',
      version: '0.1.0',
      description: '自定义的本地 Skill',
      tags: ['custom'],
    },
  },
];

export default function SkillsList() {
  const [skills, setSkills] = useAtom(skillsListAtom);
  const [filter, setFilter] = useAtom(skillsFilterAtom);
  const filteredSkills = useAtomValue(filteredSkillsAtom);
  const loading = useAtomValue(skillsLoadingAtom);

  // 初始化模拟数据
  useState(() => {
    if (skills.length === 0) {
      setSkills(mockSkills);
    }
  });

  const handleToggleSkill = (skillId: string, enabled: boolean) => {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.id === skillId ? { ...skill, enabled } : skill
      )
    );
  };

  const sourceFilters = [
    { value: 'all', label: '全部' },
    { value: 'builtin', label: '内置' },
    { value: 'local', label: '本地' },
    { value: 'remote', label: '远程' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">Skills 管理</h1>
          <p className="text-muted-foreground">管理和配置 Claude 的 Skills</p>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索 Skills..."
            value={filter.search || ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              过滤
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>过滤 Skills</DialogTitle>
              <DialogDescription>选择要显示的 Skills 类型</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">来源</p>
                <div className="flex flex-wrap gap-2">
                  {sourceFilters.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filter.source === option.value ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        setFilter({ ...filter, source: option.value })
                      }
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Skills 列表 */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">没有找到 Skills</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            尝试调整搜索条件或过滤器
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={(enabled) => handleToggleSkill(skill.id, enabled)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
