import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Sparkles, Search, Filter, RefreshCw } from 'lucide-react';
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
  skillsErrorAtom,
} from '@/store/skillsAtoms';
import {
  listInstalledSkills,
  toggleSkill as toggleSkillApi,
} from '@/services/skills';

export default function SkillsList() {
  const [skills, setSkills] = useAtom(skillsListAtom);
  const [filter, setFilter] = useAtom(skillsFilterAtom);
  const filteredSkills = useAtomValue(filteredSkillsAtom);
  const [loading, setLoading] = useAtom(skillsLoadingAtom);
  const setError = useSetAtom(skillsErrorAtom);

  // 加载 Skills 数据
  const loadSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInstalledSkills();
      setSkills(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载 Skills 失败';
      setError(message);
      console.error('加载 Skills 失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadSkills();
  }, []);

  const handleToggleSkill = async (skillId: string, enabled: boolean) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    // 乐观更新 UI
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, enabled } : s))
    );

    try {
      await toggleSkillApi(skill.name, enabled);
    } catch (err) {
      // 回滚
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, enabled: !enabled } : s))
      );
      console.error('切换 Skill 状态失败:', err);
    }
  };

  const sourceFilters = [
    { value: 'all', label: '全部' },
    { value: 'builtin', label: '内置' },
    { value: 'local', label: '本地' },
    { value: 'remote', label: '远程' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Skills 管理</h1>
            <p className="text-muted-foreground">
              管理和配置 Claude 的 Skills
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadSkills} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
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
                      variant={
                        filter.source === option.value ? 'default' : 'outline'
                      }
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
            {skills.length === 0
              ? '还没有安装任何 Skills，请在 ~/.claude/skills 目录下添加'
              : '尝试调整搜索条件或过滤器'}
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
