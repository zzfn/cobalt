import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Search, Filter, RefreshCw, Plus, Loader2, CheckCircle2 } from 'lucide-react';
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
import { GitAuthDialog } from '@/components/skills/GitAuthDialog';
import {
  skillsListAtom,
  filteredSkillsAtom,
  skillsFilterAtom,
  skillsLoadingAtom,
  skillsErrorAtom,
  skillsScopeAtom,
  skillUpdatesAtom,
  skillUpdatesCheckingAtom,
  skillsOrderAtom,
  buildSkillsOrder,
} from '@/store/skillsAtoms';
import {
  currentWorkspaceAtom,
} from '@/store/workspaceAtoms';
import {
  listInstalledSkills,
  openSkillFolder,
  toggleSkill as toggleSkillApi,
  scanRepoSkills,
  installSkillFromRepo,
  uninstallSkill,
  updateSkill as updateSkillApi,
  parseGitAuthChallenge,
  checkAllSkillUpdates,
  checkSkillUpdate,
} from '@/services/skills';
import type { ScannedSkillInfo, GitAuthChallenge, GitAuthInput } from '@/types/skills';
import type { AiToolType } from '@/types/skills';

export default function SkillsList() {
  const [skills, setSkills] = useAtom(skillsListAtom);
  const [filter, setFilter] = useAtom(skillsFilterAtom);
  const filteredSkills = useAtomValue(filteredSkillsAtom);
  const [loading, setLoading] = useAtom(skillsLoadingAtom);
  const setError = useSetAtom(skillsErrorAtom);
  const [skillsScope, setSkillsScope] = useAtom(skillsScopeAtom);
  const [skillUpdates, setSkillUpdates] = useAtom(skillUpdatesAtom);
  const [, setSkillsOrder] = useAtom(skillsOrderAtom);
  const [checkingAllUpdates, setCheckingAllUpdates] = useAtom(skillUpdatesCheckingAtom);
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
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogLoading, setAuthDialogLoading] = useState(false);
  const [authChallenge, setAuthChallenge] = useState<GitAuthChallenge | null>(null);
  const [authAction, setAuthAction] = useState<'scan' | 'install' | null>(null);
  const [updatingSkillName, setUpdatingSkillName] = useState<string | null>(null);

  // 加载 Skills 数据
  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 根据当前工作区决定加载哪个目录的 skills
      const workspacePath = currentWorkspace?.path ?? null;
      const data = await listInstalledSkills(workspacePath);
      setSkills(data);
      setSkillsOrder(buildSkillsOrder(data, skillUpdates));
      setSkillsScope(currentWorkspace ? 'project' : 'global');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载 Skills 失败';
      setError(message);
      console.error('加载 Skills 失败:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, setSkills, setLoading, setError, setSkillsOrder, setSkillsScope, skillUpdates]);

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
      await toggleSkillApi(skill.name, enabled, currentWorkspace?.path ?? null);
    } catch (err) {
      // 回滚
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, enabled: !enabled } : s))
      );
      console.error('切换 Skill 状态失败:', err);
    }
  };

  const extractErrorMessage = (err: unknown, fallback: string) =>
    typeof err === 'string' ? err : (err instanceof Error ? err.message : fallback);

  const handleScanRepo = async (gitAuth?: GitAuthInput) => {
    if (!repoUrl.trim()) {
      setInstallError('请输入仓库 URL');
      return;
    }

    setScanning(true);
    setInstallError(null);
    setScannedSkills([]);
    setSelectedSkills(new Set());

    try {
      const skills = await scanRepoSkills(repoUrl, gitAuth);
      setScannedSkills(skills);
      setAuthDialogOpen(false);
      setAuthChallenge(null);
      setAuthAction(null);

      // 默认选中所有未安装的 skills
      const uninstalledSkills = skills
        .filter(s => !s.alreadyInstalled)
        .map(s => s.name);
      setSelectedSkills(new Set(uninstalledSkills));
    } catch (err) {
      console.error('❌ 扫描失败:', err);
      const challenge = parseGitAuthChallenge(err);
      if (challenge) {
        setAuthChallenge(challenge);
        setAuthAction('scan');
        setAuthDialogOpen(true);
        setInstallError(challenge.message);
        return;
      }
      setInstallError(extractErrorMessage(err, '扫描失败'));
    } finally {
      setScanning(false);
    }
  };

  const handleInstallSkill = async (gitAuth?: GitAuthInput) => {
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
        Array.from(selectedTools),
        currentWorkspace?.path ?? null,
        gitAuth
      );
      toast.success('安装成功', { description: result });
      setAuthDialogOpen(false);
      setAuthChallenge(null);
      setAuthAction(null);
      setInstallDialogOpen(false);
      setRepoUrl('');
      setScannedSkills([]);
      setSelectedSkills(new Set());
      setSelectedTools(new Set(['claude-code']));
      // 重新加载列表
      await loadSkills();
    } catch (err) {
      console.error('❌ 安装失败:', err);
      const challenge = parseGitAuthChallenge(err);
      if (challenge) {
        setAuthChallenge(challenge);
        setAuthAction('install');
        setAuthDialogOpen(true);
        setInstallError(challenge.message);
        return;
      }
      setInstallError(extractErrorMessage(err, '安装失败'));
    } finally {
      setInstalling(false);
    }
  };

  const handleAuthConfirm = async (auth: GitAuthInput) => {
    if (!authAction) return;
    setAuthDialogLoading(true);
    try {
      if (authAction === 'scan') {
        await handleScanRepo(auth);
      } else {
        await handleInstallSkill(auth);
      }
    } finally {
      setAuthDialogLoading(false);
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
      await uninstallSkill(skillName, currentWorkspace?.path ?? null);
      setSkills((prev) => prev.filter((s) => s.name !== skillName));
      setSkillsOrder((prev) => {
        const next = { ...prev };
        delete next[skillName];
        return next;
      });
      setSkillUpdates((prev) => {
        const next = { ...prev };
        delete next[skillName];
        return next;
      });
      toast.success(`Skill "${skillName}" 已删除`);
    } catch (err) {
      console.error('删除 Skill 失败:', err);
      toast.error('删除失败', { description: err instanceof Error ? err.message : '未知错误' });
    }
  };

  const handleUpdateSkill = async (skillName: string) => {
    setUpdatingSkillName(skillName);
    try {
      const result = await updateSkillApi(skillName, currentWorkspace?.path ?? null);
      toast.success('更新成功', { description: result });
      const nextSkills = await loadSkills();
      const recheck = await checkSkillUpdate(skillName, currentWorkspace?.path ?? null);
      const checkedAt = new Date().toISOString();
      setSkillUpdates((prev) => {
        const nextUpdates = {
          ...prev,
          [skillName]: {
            skillName,
            checkedAt,
            hasUpdate: recheck.hasUpdate,
            hasRepository: recheck.hasRepository,
            hasManifest: recheck.hasManifest,
            currentVersion: recheck.currentVersion,
            latestVersion: recheck.latestVersion,
            changedFiles: recheck.changedFiles ?? [],
            newFiles: recheck.newFiles ?? [],
            removedFiles: recheck.removedFiles ?? [],
            outdatedTools: recheck.outdatedTools ?? [],
            error: recheck.error,
          },
        };
        setSkillsOrder(buildSkillsOrder(nextSkills, nextUpdates));
        return nextUpdates;
      });
    } catch (err) {
      console.error('更新 Skill 失败:', err);
      toast.error('更新失败', {
        description: err instanceof Error ? err.message : '未知错误',
      });
    } finally {
      setUpdatingSkillName(null);
    }
  };

  const handleOpenInstalledTool = async (skillName: string, tool: AiToolType, enabled: boolean) => {
    try {
      await openSkillFolder(skillName, tool, enabled, currentWorkspace?.path ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '打开目录失败';
      console.error('打开 Skill 目录失败:', err);
      toast.error('打开目录失败', { description: message });
    }
  };

  const handleCheckAllUpdates = useCallback(async (silent = false) => {
    if (checkingAllUpdates) return;

    setCheckingAllUpdates(true);
    try {
      const results = await checkAllSkillUpdates(currentWorkspace?.path ?? null, !silent);
      const nextUpdates = Object.fromEntries(results.map((result) => [result.skillName, result]));
      setSkillUpdates(nextUpdates);
      setSkillsOrder(buildSkillsOrder(skills, nextUpdates));

      if (!silent) {
        const updatableCount = results.filter((result) => result.hasUpdate).length;
        toast.success('检查完成', {
          description: updatableCount > 0 ? `发现 ${updatableCount} 个存在远程变更的 Skill` : '所有 Skill 都没有检测到远程变更',
        });
      }
    } catch (err) {
      console.error('批量检查更新失败:', err);
      if (!silent) {
        toast.error('检查更新失败', {
          description: err instanceof Error ? err.message : '未知错误',
        });
      }
    } finally {
      setCheckingAllUpdates(false);
    }
  }, [checkingAllUpdates, currentWorkspace, setCheckingAllUpdates, setSkillUpdates, setSkillsOrder, skills]);


  const toolFilters = [
    { value: 'all', label: '全部工具', icon: '🤖' },
    { value: 'claude-code', label: 'Claude Code', icon: '🤖' },
    { value: 'cursor', label: 'Cursor', icon: '⚡' },
    { value: 'codex', label: 'Codex', icon: '🔮' },
    { value: 'opencode', label: 'OpenCode', icon: '🌟' },
    { value: 'antigravity', label: 'Antigravity', icon: '🚀' },
  ] as const;

  const updatableCount = Object.values(skillUpdates).filter((result) => result.hasUpdate).length;
  const allSkillsChecked = skills.length > 0 && skills.every((skill) => Boolean(skillUpdates[skill.name]));

  useEffect(() => {
    setSkillUpdates({});
    setSkillsOrder({});
  }, [currentWorkspace, setSkillUpdates, setSkillsOrder]);

  useEffect(() => {
    if (loading || skills.length === 0 || allSkillsChecked) return;
    handleCheckAllUpdates(true);
  }, [skills, loading, allSkillsChecked, handleCheckAllUpdates]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 space-y-4 pt-1">
        <div className="page-hero px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-[-0.04em]">Skills 管理</h1>
                <Badge variant={skillsScope === 'global' ? 'secondary' : 'default'} className="gap-1">
                  {skillsScope === 'global' ? '全局' : currentWorkspace?.name}
                </Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {skillsScope === 'global'
                  ? '管理全局已安装的 Skills'
                  : `管理 ${currentWorkspace?.name} 工作区的 Skills`}
              </p>
              {updatableCount > 0 && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  发现 {updatableCount} 个 Skill 可更新
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="h-11 px-4">
                    <Plus className="mr-2 h-4 w-4" />
                    安装 Skill
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
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
                          onClick={() => handleScanRepo()}
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
                        <div className="space-y-2 max-h-[300px] overflow-y-auto rounded-lg border p-3">
                          {scannedSkills.map((skill) => (
                            <div
                              key={skill.name}
                              className={cn(
                                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                                skill.alreadyInstalled
                                  ? 'bg-muted/50 opacity-60'
                                  : selectedSkills.has(skill.name)
                                    ? 'border-primary bg-primary/5'
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
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Label
                                    htmlFor={`skill-${skill.name}`}
                                    className={cn(
                                      'cursor-pointer font-medium',
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
                                  <p className="mt-1 text-sm text-muted-foreground">
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
                                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                                  selectedTools.has(tool.value)
                                    ? 'border-primary bg-primary/5'
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
                                  className="flex flex-1 cursor-pointer items-center gap-2"
                                >
                                  <span>{tool.icon}</span>
                                  <span className="font-medium">{tool.label}</span>
                                </Label>
                              </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Skill 将被安装到选中工具的 skills 目录中
                        </p>
                      </div>
                    )}

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
                          onClick={() => handleInstallSkill()}
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
              <Button variant="outline" size="sm" onClick={loadSkills} disabled={loading} className="h-11 px-4">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCheckAllUpdates(false)}
                disabled={checkingAllUpdates || loading || skills.length === 0}
                className="h-11 px-4"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${checkingAllUpdates ? 'animate-spin' : ''}`} />
                检查更新
              </Button>
            </div>
            </div>
          </div>

        <div className="panel-surface flex flex-col gap-4 px-4 py-4 sm:flex-row sm:px-5">
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
              <Button variant="outline" className="h-11">
                <Filter className="mr-2 h-4 w-4" />
                过滤
                {filter.updateOnly && (
                  <Badge variant="secondary" className="ml-2">
                    仅更新
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>过滤 Skills</DialogTitle>
                <DialogDescription>选择要显示的 Skills 类型</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">仅看可更新</p>
                    <p className="text-xs text-muted-foreground">
                      只显示检测到远程内容变更的 Skills
                    </p>
                  </div>
                  <Checkbox
                    checked={Boolean(filter.updateOnly)}
                    onCheckedChange={(checked) =>
                      setFilter({ ...filter, updateOnly: checked === true })
                    }
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <GitAuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        challenge={authChallenge}
        loading={authDialogLoading}
        onConfirm={handleAuthConfirm}
      />

      {/* Skills 列表 */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-[24px] bg-muted/70" />
          ))}
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="panel-surface flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-lg font-medium">没有找到 Skills</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {skills.length === 0
              ? '还没有安装任何 Skills，请在 ~/.claude/skills 目录下添加'
              : filter.updateOnly
                ? '当前没有检测到可更新的 Skills'
                : '尝试调整搜索条件或过滤器'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              updateInfo={skillUpdates[skill.name]}
              updating={updatingSkillName === skill.name}
              onToggle={(enabled) => handleToggleSkill(skill.id, enabled)}
              onDelete={() => handleDeleteSkill(skill.name)}
              onUpdate={() => handleUpdateSkill(skill.name)}
              onOpenInstalledTool={(tool) => handleOpenInstalledTool(skill.name, tool, skill.enabled)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
