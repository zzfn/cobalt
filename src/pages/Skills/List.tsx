import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Sparkles, Search, Filter, RefreshCw, Plus, Loader2, CheckCircle2, Globe, Folder } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import SkillCard from '@/components/common/SkillCard';
import {
  skillsListAtom,
  filteredSkillsAtom,
  skillsFilterAtom,
  skillsLoadingAtom,
  skillsErrorAtom,
  skillsScopeAtom,
} from '@/store/skillsAtoms';
import {
  currentWorkspaceAtom,
} from '@/store/workspaceAtoms';
import {
  listInstalledSkills,
  toggleSkill as toggleSkillApi,
  scanRepoSkills,
  installSkillFromRepo,
  uninstallSkill,
} from '@/services/skills';
import type { ScannedSkillInfo } from '@/types/skills';

export default function SkillsList() {
  const [skills, setSkills] = useAtom(skillsListAtom);
  const [filter, setFilter] = useAtom(skillsFilterAtom);
  const filteredSkills = useAtomValue(filteredSkillsAtom);
  const [loading, setLoading] = useAtom(skillsLoadingAtom);
  const setError = useSetAtom(skillsErrorAtom);
  const [skillsScope, setSkillsScope] = useAtom(skillsScopeAtom);
  const currentWorkspace = useAtomValue(currentWorkspaceAtom);

  // 安装对话框状态
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [scannedSkills, setScannedSkills] = useState<ScannedSkillInfo[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(['claude-code']));

  // 加载 Skills 数据
  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 根据当前工作区决定加载哪个目录的 skills
      const workspacePath = currentWorkspace?.path ?? null;
      const data = await listInstalledSkills(workspacePath);
      setSkills(data);
      setSkillsScope(currentWorkspace ? 'project' : 'global');
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载 Skills 失败';
      setError(message);
      console.error('加载 Skills 失败:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, setSkills, setLoading, setError, setSkillsScope]);

  // 初始加载
  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // 监听工作区切换事件
  useEffect(() => {
    const handleWorkspaceChanged = () => {
      loadSkills();
    };

    window.addEventListener('workspace-changed', handleWorkspaceChanged);
    return () => {
      window.removeEventListener('workspace-changed', handleWorkspaceChanged);
    };
  }, [loadSkills]);

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

  const handleScanRepo = async () => {
    if (!repoUrl.trim()) {
      setInstallError('请输入仓库 URL');
      return;
    }

    setScanning(true);
    setInstallError(null);
    setScannedSkills([]);
    setSelectedSkills(new Set());

    try {
      const skills = await scanRepoSkills(repoUrl);
      setScannedSkills(skills);

      // 默认选中所有未安装的 skills
      const uninstalledSkills = skills
        .filter(s => !s.alreadyInstalled)
        .map(s => s.name);
      setSelectedSkills(new Set(uninstalledSkills));
    } catch (err) {
      console.error('❌ 扫描失败:', err);
      // Tauri invoke 错误可能是字符串或 Error 对象
      const message = typeof err === 'string' ? err : (err instanceof Error ? err.message : '扫描失败');
      setInstallError(message);
    } finally {
      setScanning(false);
    }
  };

  const handleInstallSkill = async () => {
    if (selectedSkills.size === 0) {
      setInstallError('请至少选择一个 Skill');
      return;
    }

    if (selectedTools.size === 0) {
      setInstallError('请至少选择一个目标工具');
      return;
    }

    setInstalling(true);
    setInstallError(null);

    try {
      const result = await installSkillFromRepo(
        repoUrl,
        Array.from(selectedSkills),
        Array.from(selectedTools)
      );
      toast.success('安装成功', { description: result });
      setInstallDialogOpen(false);
      setRepoUrl('');
      setScannedSkills([]);
      setSelectedSkills(new Set());
      setSelectedTools(new Set(['claude-code']));
      // 重新加载列表
      await loadSkills();
    } catch (err) {
      console.error('❌ 安装失败:', err);
      // Tauri invoke 错误可能是字符串或 Error 对象
      const message = typeof err === 'string' ? err : (err instanceof Error ? err.message : '安装失败');
      setInstallError(message);
    } finally {
      setInstalling(false);
    }
  };

  const toggleSkillSelection = (skillName: string) => {
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });
  };

  const toggleToolSelection = (toolName: string) => {
    setSelectedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  };

  const handleDeleteSkill = async (skillName: string) => {
    try {
      await uninstallSkill(skillName);
      setSkills((prev) => prev.filter((s) => s.name !== skillName));
      toast.success(`Skill "${skillName}" 已删除`);
    } catch (err) {
      console.error('删除 Skill 失败:', err);
      toast.error('删除失败', { description: err instanceof Error ? err.message : '未知错误' });
    }
  };


  const installedByFilters = [
    { value: 'all', label: '全部', icon: '🤖' },
    { value: 'claude-code', label: 'Claude Code', icon: '🤖' },
    { value: 'cursor', label: 'Cursor', icon: '⚡' },
    { value: 'codex', label: 'Codex', icon: '🔮' },
    { value: 'opencode', label: 'OpenCode', icon: '🌟' },
    { value: 'antigravity', label: 'Antigravity', icon: '🚀' },
  ] as const;

  const toolFilters = [
    { value: 'all', label: '全部工具', icon: '🤖' },
    { value: 'claude-code', label: 'Claude Code', icon: '🤖' },
    { value: 'cursor', label: 'Cursor', icon: '⚡' },
    { value: 'codex', label: 'Codex', icon: '🔮' },
    { value: 'opencode', label: 'OpenCode', icon: '🌟' },
    { value: 'antigravity', label: 'Antigravity', icon: '🚀' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Skills 管理</h1>
              {/* 工作区标签 */}
              <Badge variant={skillsScope === 'global' ? 'secondary' : 'default'} className="gap-1">
                {skillsScope === 'global' ? (
                  <>
                    <Globe className="h-3 w-3" />
                    全局
                  </>
                ) : (
                  <>
                    <Folder className="h-3 w-3" />
                    {currentWorkspace?.name}
                  </>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {skillsScope === 'global'
                ? '管理全局 Claude Skills'
                : `管理 ${currentWorkspace?.name} 工作区的 Skills`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                安装 Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>从仓库安装 Skill</DialogTitle>
                <DialogDescription>
                  输入 Git 仓库 URL，扫描并选择要安装的 Skills
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* 仓库 URL 输入 */}
                <div className="space-y-2">
                  <Label htmlFor="repo-url">仓库 URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/username/skill-name"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !scanning && scannedSkills.length === 0) {
                          handleScanRepo();
                        }
                      }}
                      disabled={scanning || installing}
                    />
                    <Button
                      onClick={handleScanRepo}
                      disabled={scanning || installing || !repoUrl.trim()}
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          扫描中...
                        </>
                      ) : (
                        '扫描'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    支持 GitHub、GitLab 等公开 Git 仓库（私有仓库需先配置 Git 凭据）
                  </p>
                </div>

                {/* 错误提示 - 放在 URL 输入框下方，更醒目 */}
                {installError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive whitespace-pre-line">{installError}</p>
                  </div>
                )}

                {/* 扫描到的 Skills 列表 */}
                {scannedSkills.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>选择要安装的 Skills ({selectedSkills.size}/{scannedSkills.length})</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const uninstalled = scannedSkills
                              .filter(s => !s.alreadyInstalled)
                              .map(s => s.name);
                            setSelectedSkills(new Set(uninstalled));
                          }}
                        >
                          全选未安装
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSkills(new Set())}
                        >
                          取消全选
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                      {scannedSkills.map((skill) => (
                        <div
                          key={skill.name}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                            skill.alreadyInstalled
                              ? 'bg-muted/50 opacity-60'
                              : selectedSkills.has(skill.name)
                              ? 'bg-primary/5 border-primary'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <Checkbox
                            id={`skill-${skill.name}`}
                            checked={selectedSkills.has(skill.name)}
                            onCheckedChange={() => toggleSkillSelection(skill.name)}
                            disabled={skill.alreadyInstalled || installing}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`skill-${skill.name}`}
                                className={cn(
                                  'font-medium cursor-pointer',
                                  skill.alreadyInstalled && 'cursor-not-allowed'
                                )}
                              >
                                {skill.name}
                              </Label>
                              {skill.alreadyInstalled && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  已安装
                                </Badge>
                              )}
                              {skill.version && (
                                <Badge variant="outline" className="text-xs">
                                  v{skill.version}
                                </Badge>
                              )}
                            </div>
                            {skill.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {skill.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 目标工具选择 */}
                {scannedSkills.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>选择目标 AI 工具 ({selectedTools.size})</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const allTools = toolFilters
                              .filter(t => t.value !== 'all')
                              .map(t => t.value);
                            setSelectedTools(new Set(allTools));
                          }}
                        >
                          全选
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTools(new Set())}
                        >
                          取消全选
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {toolFilters
                        .filter(tool => tool.value !== 'all')
                        .map((tool) => (
                          <div
                            key={tool.value}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                              selectedTools.has(tool.value)
                                ? 'bg-primary/5 border-primary'
                                : 'hover:bg-muted/50'
                            )}
                            onClick={() => toggleToolSelection(tool.value)}
                          >
                            <Checkbox
                              id={`tool-${tool.value}`}
                              checked={selectedTools.has(tool.value)}
                              onCheckedChange={() => toggleToolSelection(tool.value)}
                              disabled={installing}
                            />
                            <Label
                              htmlFor={`tool-${tool.value}`}
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <span>{tool.icon}</span>
                              <span className="font-medium">{tool.label}</span>
                            </Label>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Skill 将被安装到选中工具的 skills 目录中
                    </p>
                  </div>
                )}

                {/* 按钮 */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInstallDialogOpen(false);
                      setInstallError(null);
                      setScannedSkills([]);
                      setSelectedSkills(new Set());
                      setSelectedTools(new Set(['claude-code']));
                      setRepoUrl('');
                    }}
                    disabled={scanning || installing}
                  >
                    取消
                  </Button>
                  {scannedSkills.length > 0 && (
                    <Button
                      onClick={handleInstallSkill}
                      disabled={installing || selectedSkills.size === 0}
                    >
                      {installing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          安装中...
                        </>
                      ) : (
                        `安装 (${selectedSkills.size})`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={loadSkills} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
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
                <p className="mb-2 text-sm font-medium">安装工具</p>
                <div className="flex flex-wrap gap-2">
                  {installedByFilters.map((option) => (
                    <Badge
                      key={option.value}
                      variant={
                        filter.installedBy === option.value ? 'default' : 'outline'
                      }
                      className="cursor-pointer gap-1"
                      onClick={() =>
                        setFilter({ ...filter, installedBy: option.value })
                      }
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">适用工具</p>
                <div className="flex flex-wrap gap-2">
                  {toolFilters.map((option) => (
                    <Badge
                      key={option.value}
                      variant={
                        filter.targetTool === option.value ? 'default' : 'outline'
                      }
                      className="cursor-pointer gap-1"
                      onClick={() =>
                        setFilter({ ...filter, targetTool: option.value })
                      }
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
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
              onDelete={() => handleDeleteSkill(skill.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
