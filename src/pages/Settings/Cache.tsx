import { useEffect, useState, useCallback, useMemo } from 'react';
import { HardDrive, Trash2, Loader2, FolderOpen, FileArchive, Database, ChevronDown, ChevronRight, FileText, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCacheInfo, clearCache, getConversationDetails, clearConversation } from '@/services/cache';
import type { CacheInfo, ProjectConversationInfo, ConversationFile, MessagePreview } from '@/services/cache';

// 格式化文件大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// 格式化时间戳
function formatTimestamp(timestamp: string): string {
  const seconds = parseInt(timestamp, 10);
  if (isNaN(seconds)) return '未知时间';
  const date = new Date(seconds * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`;
  return `${Math.floor(diffDays / 365)} 年前`;
}

// 消息预览组件
interface MessagePreviewProps {
  message: MessagePreview;
}

function MessagePreviewItem({ message }: MessagePreviewProps) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Badge variant={isUser ? 'default' : 'secondary'} className="shrink-0">
        {isUser ? '用户' : '助手'}
      </Badge>
      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
        {message.contentPreview}
      </p>
    </div>
  );
}

// 对话文件项组件
interface ConversationFileItemProps {
  file: ConversationFile;
  projectName: string;
  onDelete?: () => void;
}

function ConversationFileItem({ file, projectName, onDelete }: ConversationFileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;

    setDeleting(true);
    try {
      await clearConversation(projectName, file.sessionId);
      toast.success('已删除会话文件', {
        description: `已清理 ${formatBytes(file.fileSize)}`,
      });
      onDelete?.();
    } catch (error) {
      console.error('删除会话文件失败:', error);
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border rounded-md overflow-hidden group">
      <div
        className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
        <code className="text-xs text-muted-foreground flex-1 truncate">
          {file.sessionId.slice(0, 8)}...
        </code>
        <span className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</span>
        <span className="text-xs text-muted-foreground">{formatTimestamp(file.modifiedTime)}</span>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Trash2 className="mr-1 h-3 w-3" />
              删除
            </>
          )}
        </Button>

        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform" />
        )}
      </div>

      {isExpanded && file.messagePreview.length > 0 && (
        <div className="p-2 bg-muted/30 space-y-2 border-t">
          {file.messagePreview.map((msg, idx) => (
            <MessagePreviewItem key={idx} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

// 项目对话详情组件
interface ConversationDetailProps {
  project: ProjectConversationInfo;
  isExpanded: boolean;
  onToggle: () => void;
  onDeleteProject?: () => void;
  fileSortMode: ConversationFileSortMode;
}

type ConversationFileSortMode = 'modifiedDesc' | 'sizeDesc' | 'sessionIdAsc';
type ConversationProjectSortMode = 'nameAsc' | 'sizeDesc' | 'fileCountDesc';

function sortConversationFiles(files: ConversationFile[], mode: ConversationFileSortMode): ConversationFile[] {
  const sorted = [...files];
  switch (mode) {
    case 'sizeDesc':
      sorted.sort((a, b) => b.fileSize - a.fileSize);
      break;
    case 'sessionIdAsc':
      sorted.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
      break;
    case 'modifiedDesc':
    default:
      sorted.sort((a, b) => Number(b.modifiedTime) - Number(a.modifiedTime));
      break;
  }
  return sorted;
}

function sortConversationProjects(
  projects: ProjectConversationInfo[],
  mode: ConversationProjectSortMode
): ProjectConversationInfo[] {
  const sorted = [...projects];
  switch (mode) {
    case 'sizeDesc':
      sorted.sort((a, b) => b.totalSize - a.totalSize);
      break;
    case 'fileCountDesc':
      sorted.sort((a, b) => b.fileCount - a.fileCount);
      break;
    case 'nameAsc':
    default:
      sorted.sort((a, b) => a.projectName.localeCompare(b.projectName));
      break;
  }
  return sorted;
}

function ConversationDetail({ project, isExpanded, onToggle, onDeleteProject, fileSortMode }: ConversationDetailProps) {
  const [deleting, setDeleting] = useState(false);
  const sortedFiles = sortConversationFiles(project.files, fileSortMode);

  const handleDeleteProject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;

    setDeleting(true);
    try {
      await clearConversation(project.projectName);
      toast.success(`已删除 ${project.projectName} 的所有会话`, {
        description: `已清理 ${project.fileCount} 个文件，释放 ${formatBytes(project.totalSize)}`,
      });
      onDeleteProject?.();
    } catch (error) {
      console.error('删除项目会话失败:', error);
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden group">
      <div
        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{project.projectName}</span>
            <Badge variant="outline" className="shrink-0">
              {project.fileCount} 个文件
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{project.projectPath}</p>
        </div>
        <span className="text-sm text-muted-foreground">{formatBytes(project.totalSize)}</span>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          disabled={deleting}
          onClick={handleDeleteProject}
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Trash2 className="mr-1 h-3 w-3" />
              删除
            </>
          )}
        </Button>

        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
        )}
      </div>

      {isExpanded && (
        <div className="p-3 bg-muted/20 border-t space-y-2 max-h-96 overflow-y-auto">
          {sortedFiles.length > 0 ? (
            sortedFiles.map((file) => (
              <ConversationFileItem
                key={file.sessionId}
                file={file}
                projectName={project.projectName}
                onDelete={onDeleteProject}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">暂无会话文件</p>
          )}
        </div>
      )}
    </div>
  );
}

interface CacheCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sizeBytes: number;
  fileCount: number;
  cacheType: string;
  clearing: string | null;
  onClear: (type: string) => void;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  children?: React.ReactNode;
}

function CacheCard({
  title,
  description,
  icon: Icon,
  sizeBytes,
  fileCount,
  cacheType,
  clearing,
  onClear,
  showDetails = false,
  onToggleDetails,
  children
}: CacheCardProps) {
  const isClearing = clearing === cacheType || clearing === 'all';
  const isEmpty = fileCount === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onToggleDetails && fileCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleDetails}
              >
                {showDetails ? '收起详情' : '查看详情'}
                {showDetails ? (
                  <ChevronDown className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronRight className="ml-2 h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClear(cacheType)}
              disabled={isClearing || isEmpty}
            >
              {isClearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              清理
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>{fileCount} 个文件</span>
          <span>{formatBytes(sizeBytes)}</span>
        </div>
      </CardContent>
      {showDetails && children && (
        <CardContent className="pt-0 border-t">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export default function CacheSettings() {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [conversationDetails, setConversationDetails] = useState<ProjectConversationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const [showConversationDetails, setShowConversationDetails] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [fileSortMode, setFileSortMode] = useState<ConversationFileSortMode>('modifiedDesc');
  const [projectSortMode, setProjectSortMode] = useState<ConversationProjectSortMode>('nameAsc');

  const fetchConversationDetails = useCallback(async () => {
    setLoadingDetails(true);
    try {
      const details = await getConversationDetails();
      setConversationDetails(details);
      // 仅保留仍然存在的项目展开状态，避免删除后保留无效展开 key
      setExpandedProjects((prev) => {
        const next = new Set<string>();
        const projectNames = new Set(details.map((d) => d.projectName));
        for (const name of prev) {
          if (projectNames.has(name)) {
            next.add(name);
          }
        }
        return next;
      });
    } catch (error) {
      console.error('获取对话详情失败:', error);
      toast.error('获取对话详情失败', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const loadCacheInfo = useCallback(async () => {
    try {
      const info = await getCacheInfo();
      setCacheInfo(info);
    } catch (error) {
      console.error('获取缓存信息失败:', error);
      toast.error('获取缓存信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCacheInfo();
  }, [loadCacheInfo]);

  const handleClear = async (cacheType: string) => {
    setClearing(cacheType);
    try {
      const result = await clearCache(cacheType);
      toast.success('清理完成', {
        description: `已清理 ${result.cleared_files} 个文件，释放 ${formatBytes(result.cleared_bytes)}`,
      });
      await loadCacheInfo();
      // 如果清理的是对话记录，清空详情数据
      if (cacheType === 'conversations' || cacheType === 'all') {
        setConversationDetails([]);
        setShowConversationDetails(false);
        setExpandedProjects(new Set());
      }
    } catch (error) {
      console.error('清理缓存失败:', error);
      toast.error('清理缓存失败', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setClearing(null);
    }
  };

  const handleToggleConversationDetails = async () => {
    const newShowState = !showConversationDetails;
    setShowConversationDetails(newShowState);
    if (newShowState && conversationDetails.length === 0) {
      await fetchConversationDetails();
    }
  };

  const toggleProjectExpansion = (projectName: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectName)) {
        newSet.delete(projectName);
      } else {
        newSet.add(projectName);
      }
      return newSet;
    });
  };

  const handleRefreshConversationDetails = async () => {
    await fetchConversationDetails();
    await loadCacheInfo();
  };

  const sortedConversationDetails = useMemo(
    () => sortConversationProjects(conversationDetails, projectSortMode),
    [conversationDetails, projectSortMode]
  );

  const getSortLabel = () => {
    switch (fileSortMode) {
      case 'sizeDesc':
        return '文件大小';
      case 'sessionIdAsc':
        return '会话 ID';
      case 'modifiedDesc':
      default:
        return '最新修改';
    }
  };

  const handleCycleSortMode = () => {
    setFileSortMode((prev) => {
      if (prev === 'modifiedDesc') return 'sizeDesc';
      if (prev === 'sizeDesc') return 'sessionIdAsc';
      return 'modifiedDesc';
    });
  };

  const getProjectSortLabel = () => {
    switch (projectSortMode) {
      case 'sizeDesc':
        return '占用大小';
      case 'fileCountDesc':
        return '文件数量';
      case 'nameAsc':
      default:
        return '项目名称';
    }
  };

  const handleCycleProjectSortMode = () => {
    setProjectSortMode((prev) => {
      if (prev === 'nameAsc') return 'sizeDesc';
      if (prev === 'sizeDesc') return 'fileCountDesc';
      return 'nameAsc';
    });
  };

  const totalSize = cacheInfo
    ? cacheInfo.conversations.size_bytes + cacheInfo.backups.size_bytes + cacheInfo.marketplace.size_bytes
    : 0;

  const totalFiles = cacheInfo
    ? cacheInfo.conversations.file_count + cacheInfo.backups.file_count + cacheInfo.marketplace.file_count
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HardDrive className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">缓存管理</h1>
          <p className="text-muted-foreground">
            管理 Claude Code 产生的缓存数据
            {cacheInfo && ` · 共 ${formatBytes(totalSize)}`}
          </p>
        </div>
      </div>

      {cacheInfo && (
        <>
          <CacheCard
            title="对话记录"
            description="各项目的 .jsonl 会话记录"
            icon={FolderOpen}
            sizeBytes={cacheInfo.conversations.size_bytes}
            fileCount={cacheInfo.conversations.file_count}
            cacheType="conversations"
            clearing={clearing}
            onClear={handleClear}
            showDetails={showConversationDetails}
            onToggleDetails={handleToggleConversationDetails}
          >
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
              </div>
            ) : conversationDetails.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCycleProjectSortMode}>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    项目排序：{getProjectSortLabel()}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCycleSortMode}>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    文件排序：{getSortLabel()}
                  </Button>
                </div>
                {sortedConversationDetails.map((project) => (
                  <ConversationDetail
                    key={project.projectName}
                    project={project}
                    isExpanded={expandedProjects.has(project.projectName)}
                    onToggle={() => toggleProjectExpansion(project.projectName)}
                    onDeleteProject={handleRefreshConversationDetails}
                    fileSortMode={fileSortMode}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">暂无对话记录</p>
            )}
          </CacheCard>

          <CacheCard
            title="配置备份"
            description="历史配置备份文件"
            icon={FileArchive}
            sizeBytes={cacheInfo.backups.size_bytes}
            fileCount={cacheInfo.backups.file_count}
            cacheType="backups"
            clearing={clearing}
            onClear={handleClear}
          />

          <CacheCard
            title="市场源缓存"
            description="Skill 市场源的本地缓存"
            icon={Database}
            sizeBytes={cacheInfo.marketplace.size_bytes}
            fileCount={cacheInfo.marketplace.file_count}
            cacheType="marketplace"
            clearing={clearing}
            onClear={handleClear}
          />

          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => handleClear('all')}
              disabled={clearing !== null || totalFiles === 0}
            >
              {clearing === 'all' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              清理全部 ({formatBytes(totalSize)})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
