import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, FileText, Trash2, Eye, Code, Package, Tag, Folder, File, ChevronRight, ChevronDown, FolderOpen, RefreshCw, Download, AlertCircle, Share2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Tabs import removed - not used
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
import MarkdownEditor from '@/components/common/MarkdownEditor';
import { TargetToolsDialog } from '@/components/skills/TargetToolsDialog';
import { RemoveFromToolsDialog } from '@/components/skills/RemoveFromToolsDialog';
import type { SkillDetail as SkillDetailType, SkillUpdateCheckResult } from '@/types/skills';
import { AI_TOOL_META, type AiToolType } from '@/types/skills';
import { getSkillDetail, toggleSkill as toggleSkillApi, uninstallSkill, readSkillFile, checkSkillUpdate, updateSkill, setSkillRepository, applySkillToTools, removeSkillFromTools } from '@/services/skills';
import { logActivity } from '@/lib/activityLogger';
import { toast } from 'sonner';

// 根据文件扩展名获取语言类型
function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    // 编程语言
    'py': 'python',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'lua': 'lua',
    'perl': 'perl',
    'pl': 'perl',

    // Web 相关
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'vue': 'vue',
    'svelte': 'svelte',

    // 标记语言
    'md': 'markdown',
    'markdown': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json',
    'toml': 'toml',

    // Shell
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',

    // 其他
    'sql': 'sql',
    'graphql': 'graphql',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'txt': 'plaintext',
  };

  return languageMap[ext || ''] || 'plaintext';
}

// 文件树节点类型
interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

// 构建文件树
function buildFileTree(files: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  files.forEach(filePath => {
    const parts = filePath.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;

      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        existingNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : []
        };
        currentLevel.push(existingNode);
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });

  return root;
}

// 文件树节点组件
function FileTreeNode({
  node,
  selectedFile,
  onSelect,
  level = 0
}: {
  node: FileTreeNode;
  selectedFile: string | null;
  onSelect: (path: string) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0); // 根目录默认展开
  const isSelected = selectedFile === node.path;
  const isSkillMd = node.name === 'SKILL.md';

  if (node.type === 'file') {
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`
          w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
          transition-colors text-left
          ${isSelected
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
          }
          ${isSkillMd ? 'font-medium' : ''}
        `}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        <File className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-muted transition-colors text-left"
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-primary" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 text-primary" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillDetail() {
  const { skillName } = useParams<{ skillName: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<SkillDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [frontmatter, setFrontmatter] = useState<Record<string, any> | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);

  // 更新检测状态
  const [updateCheck, setUpdateCheck] = useState<SkillUpdateCheckResult | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  // 编辑 repository 状态
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [savingRepo, setSavingRepo] = useState(false);

  // 应用到其他工具状态
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applying, setApplying] = useState(false);

  // 从工具中移除状态
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  // 解析 YAML frontmatter
  const parseFrontmatter = (content: string): { metadata: Record<string, any>; content: string } => {
    const lines = content.split('\n');

    // 检查是否以 --- 开头
    if (lines[0]?.trim() !== '---') {
      return { metadata: {}, content };
    }

    // 查找结束的 ---
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        endIndex = i;
        break;
      }
    }

    // 如果找到结束标记，解析 frontmatter
    if (endIndex !== -1) {
      const frontmatterLines = lines.slice(1, endIndex);
      const metadata: Record<string, any> = {};

      frontmatterLines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        // 解析 key: value 格式
        const match = trimmed.match(/^([\w-]+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;

          // 处理带引号的字符串
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            metadata[key] = value.slice(1, -1);
          }
          // 处理数组 [item1, item2]
          else if (value.startsWith('[') && value.endsWith(']')) {
            metadata[key] = value.slice(1, -1).split(',').map(item => item.trim());
          }
          // 处理布尔值
          else if (value === 'true' || value === 'false') {
            metadata[key] = value === 'true';
          }
          // 处理数字
          else if (!isNaN(Number(value))) {
            metadata[key] = Number(value);
          }
          // 普通字符串，去除引号
          else {
            metadata[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      });

      return {
        metadata,
        content: lines.slice(endIndex + 1).join('\n').trimStart()
      };
    }

    return { metadata: {}, content };
  };

  // 当 skill content 加载时解析 frontmatter
  useEffect(() => {
    if (skill?.content) {
      const { metadata } = parseFrontmatter(skill.content);
      setFrontmatter(metadata);
    }
  }, [skill?.content]);

  // 优先使用 frontmatter 中的 name 和 description
  const displayName = frontmatter?.name || skill?.name || '';
  const displayDescription = frontmatter?.description || skill?.description || '';

  // 加载 Skill 详情的函数（提取到组件级别以便复用）
  const loadSkill = async () => {
    if (!skillName) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getSkillDetail(skillName);
      setSkill(data);
      // 默认选中 SKILL.md 文件
      if (data.files && data.files.includes('SKILL.md')) {
        setSelectedFile('SKILL.md');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载 Skill 详情失败';
      setError(message);
      console.error('加载 Skill 详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载 Skill 详情
  useEffect(() => {
    loadSkill();
  }, [skillName]);

  // 加载选中文件的内容
  useEffect(() => {
    if (!skillName || !selectedFile || selectedFile === 'SKILL.md') {
      setFileContent('');
      return;
    }

    const loadFileContent = async () => {
      setLoadingFile(true);
      try {
        const content = await readSkillFile(skillName, selectedFile);
        setFileContent(content);
      } catch (err) {
        console.error('加载文件内容失败:', err);
        setFileContent(`# 加载失败\n\n无法读取文件内容: ${err instanceof Error ? err.message : '未知错误'}`);
      } finally {
        setLoadingFile(false);
      }
    };

    loadFileContent();
  }, [skillName, selectedFile]);

  // 切换启用状态
  const handleToggle = async (enabled: boolean) => {
    if (!skill) return;

    // 乐观更新
    setSkill((prev) => (prev ? { ...prev, enabled } : null));

    try {
      await toggleSkillApi(skill.name, enabled);
      // 记录活动
      logActivity(
        'skill_toggle',
        `${enabled ? '启用' : '禁用'}了 Skill: ${skill.name}`,
        { skillName: skill.name, enabled }
      );
    } catch (err) {
      // 回滚
      setSkill((prev) => (prev ? { ...prev, enabled: !enabled } : null));
      console.error('切换 Skill 状态失败:', err);
    }
  };

  // 删除 Skill
  const handleDelete = async () => {
    if (!skill) return;

    try {
      await uninstallSkill(skill.name);
      alert(`Skill "${skill.name}" 已删除`);
      navigate('/skills');
    } catch (err) {
      console.error('删除 Skill 失败:', err);
      alert(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 应用到其他工具
  const handleApplyToTools = async (targetTools: string[]) => {
    if (!skill) return;

    setApplying(true);
    try {
      const result = await applySkillToTools(skill.name, targetTools);
      toast.success(result);
      // 重新加载 skill 详情以更新 installedBy
      await loadSkill();
    } catch (err) {
      const message = err instanceof Error ? err.message : '应用失败';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  // 从工具中移除
  const handleRemoveFromTools = async (tools: string[]) => {
    if (!skill) return;

    setRemoving(true);
    try {
      const result = await removeSkillFromTools(skill.name, tools);
      toast.success(result);
      // 重新加载 skill 详情以更新 installedBy
      await loadSkill();
    } catch (err) {
      const message = err instanceof Error ? err.message : '移除失败';
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  // 检查更新
  const handleCheckUpdate = async () => {
    if (!skill) return;
    setCheckingUpdate(true);
    try {
      const result = await checkSkillUpdate(skill.name);
      setUpdateCheck(result);
      if (result.error) {
        console.error('检查更新失败:', result.error);
      }
    } catch (err) {
      console.error('检查更新失败:', err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  // 保存仓库地址
  const handleSaveRepository = async () => {
    if (!skill || !repoUrl.trim()) return;
    setSavingRepo(true);
    try {
      await setSkillRepository(skill.name, repoUrl.trim());
      // 更新本地状态
      setSkill(prev => prev ? {
        ...prev,
        metadata: {
          ...prev.metadata,
          repository: repoUrl.trim()
        }
      } : null);
      setIsEditingRepo(false);
      // 重新检查更新
      await handleCheckUpdate();
    } catch (err) {
      console.error('保存仓库地址失败:', err);
      alert(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setSavingRepo(false);
    }
  };

  // 执行更新
  const handleUpdate = async () => {
    if (!skill) return;
    setUpdating(true);
    try {
      const result = await updateSkill(skill.name);
      alert(result);
      // 重新加载 skill 详情
      const data = await getSkillDetail(skill.name);
      setSkill(data);
      // 重置更新状态
      setUpdateCheck(null);
    } catch (err) {
      console.error('更新失败:', err);
      alert(`更新失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* 返回按钮骨架 */}
        <Skeleton className="h-9 w-32" />

        {/* 标题区域骨架 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>

        {/* 元信息骨架 */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>

        <Separator />

        {/* 内容卡片骨架 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Link to="/skills">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回 Skills 列表
          </Button>
        </Link>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <Sparkles className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {error || `Skill "${skillName}" 不存在`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              请检查 Skill 名称是否正确，或返回列表查看可用的 Skills
            </p>
            <Link to="/skills">
              <Button variant="outline">返回列表</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 返回按钮 */}
      <Link to="/skills">
        <Button variant="ghost" size="sm" className="gap-2 hover:gap-3 transition-all">
          <ArrowLeft className="h-4 w-4" />
          返回 Skills 列表
        </Button>
      </Link>

      {/* 标题区域 - 使用渐变背景卡片 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold tracking-tight mb-2">{displayName}</h1>
                {displayDescription && (
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {displayDescription}
                  </p>
                )}

                {/* 元信息标签 */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {skill.installedBy && skill.installedBy.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">已安装到：</span>
                      {skill.installedBy.map((toolId) => {
                        const tool = AI_TOOL_META[toolId as AiToolType];
                        return tool ? (
                          <Badge key={toolId} variant="secondary" className="gap-1.5">
                            <span>{tool.icon}</span>
                            {tool.displayName}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  {skill.metadata.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1.5">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* 操作区域 */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium">
                    {skill.enabled ? '已启用' : '已禁用'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {skill.enabled ? '正在使用中' : '当前未激活'}
                  </span>
                </div>
                <Switch
                  checked={skill.enabled}
                  onCheckedChange={handleToggle}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* 更新检测区域 */}
              <div className="flex flex-col items-end gap-2">
                {/* 没有仓库信息的提示 */}
                {updateCheck && !updateCheck.hasRepository ? (
                  <div className="flex flex-col items-end gap-2 max-w-[320px]">
                    <div className="flex items-center gap-1.5 text-amber-500 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>未配置仓库信息</span>
                    </div>
                    {isEditingRepo ? (
                      <div className="flex flex-col items-end gap-2 w-full">
                        <input
                          type="text"
                          placeholder="https://github.com/username/repo"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingRepo(false)}
                          >
                            取消
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveRepository}
                            disabled={savingRepo || !repoUrl.trim()}
                          >
                            {savingRepo ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              '保存'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground text-right">
                          配置仓库地址以启用更新检测
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setRepoUrl(skill.metadata?.repository || '');
                              setIsEditingRepo(true);
                            }}
                          >
                            配置仓库地址
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleCheckUpdate}
                            disabled={checkingUpdate}
                          >
                            {checkingUpdate ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            重新检查
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : updateCheck?.hasUpdate ? (
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="default" className="gap-1.5 bg-green-500/10 text-green-500 border-green-500/20">
                      <Download className="h-3 w-3" />
                      有新版本可用
                      {updateCheck.latestVersion && ` (${updateCheck.latestVersion})`}
                    </Badge>
                    {/* 显示文件变更摘要 */}
                    {(updateCheck.changedFiles?.length || 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {updateCheck.changedFiles!.length} 个文件变更
                      </span>
                    )}
                    {(updateCheck.newFiles?.length || 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {updateCheck.newFiles!.length} 个新文件
                      </span>
                    )}
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleUpdate}
                      disabled={updating}
                    >
                      {updating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {updating ? '更新中...' : '立即更新'}
                    </Button>
                  </div>
                ) : updateCheck?.error ? (
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="destructive" className="gap-1.5">
                      <AlertCircle className="h-3 w-3" />
                      检查失败
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleCheckUpdate}
                      disabled={checkingUpdate}
                    >
                      {checkingUpdate ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      重试
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleCheckUpdate}
                    disabled={checkingUpdate}
                  >
                    {checkingUpdate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : updateCheck ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {checkingUpdate ? '检查中...' : updateCheck ? '已是最新' : '检查更新'}
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                onClick={() => setShowApplyDialog(true)}
                disabled={applying}
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                应用到其他工具
              </Button>

              {skill.installedBy && skill.installedBy.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={() => setShowRemoveDialog(true)}
                  disabled={removing}
                >
                  {removing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  从工具中移除
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2 w-full">
                    <Trash2 className="h-4 w-4" />
                    删除 Skill
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
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* 左侧文件目录 */}
        {skill.files && skill.files.length > 0 && (
          <Card className="h-fit sticky top-6">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Folder className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">文件目录</CardTitle>
                  <CardDescription className="text-xs">
                    {skill.files.length} 个文件
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-0.5">
                {buildFileTree(skill.files).map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    selectedFile={selectedFile}
                    onSelect={setSelectedFile}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 右侧内容区域 */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {selectedFile || 'SKILL.md'}
                  </CardTitle>
                  <CardDescription>
                    {selectedFile && selectedFile !== 'SKILL.md' ? '文件内容' : 'Skill 主文档'}
                  </CardDescription>
                </div>
              </div>
              {skill.content && (!selectedFile || selectedFile === 'SKILL.md') && (
                <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
                  <Button
                    variant={viewMode === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('preview')}
                    className="h-8 gap-1.5 text-xs transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    预览
                  </Button>
                  <Button
                    variant={viewMode === 'code' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('code')}
                    className="h-8 gap-1.5 text-xs transition-all"
                  >
                    <Code className="h-3.5 w-3.5" />
                    源代码
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedFile || selectedFile === 'SKILL.md' ? (
              // 显示 SKILL.md 内容
              skill.content ? (
                <div className="transition-all duration-200">
                  {(() => {
                    const { content: contentWithoutFrontmatter } = parseFrontmatter(skill.content);
                    return viewMode === 'preview' ? (
                      <div className="markdown-preview p-8">
                        <ReactMarkdown>
                          {contentWithoutFrontmatter}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="border-t">
                        <MarkdownEditor value={skill.content} readOnly height="500px" />
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-lg font-medium mb-1">没有 SKILL.md 文件</p>
                  <p className="text-sm">该 Skill 暂无文档内容</p>
                </div>
              )
            ) : (
              // 显示选中文件的内容
              loadingFile ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">加载文件内容...</p>
                </div>
              ) : (
                <div className="border-t">
                  <MarkdownEditor
                    value={fileContent}
                    readOnly
                    height="500px"
                    language={getLanguageFromFilename(selectedFile)}
                  />
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* 应用到其他工具对话框 */}
      {skill && (
        <TargetToolsDialog
          open={showApplyDialog}
          onOpenChange={setShowApplyDialog}
          onConfirm={handleApplyToTools}
          defaultTools={skill.metadata.targetTools || []}
          skillName={skill.name}
          excludeTools={skill.installedBy || []}
        />
      )}

      {/* 从工具中移除对话框 */}
      {skill && (
        <RemoveFromToolsDialog
          open={showRemoveDialog}
          onOpenChange={setShowRemoveDialog}
          onConfirm={handleRemoveFromTools}
          installedTools={skill.installedBy || []}
          skillName={skill.name}
        />
      )}
    </div>
  );
}
