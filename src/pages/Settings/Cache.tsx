import { useEffect, useState, useCallback } from 'react';
import { HardDrive, Trash2, Loader2, FolderOpen, FileArchive, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCacheInfo, clearCache } from '@/services/cache';
import type { CacheInfo } from '@/services/cache';

// 格式化文件大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
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
}

function CacheCard({ title, description, icon: Icon, sizeBytes, fileCount, cacheType, clearing, onClear }: CacheCardProps) {
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
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>{fileCount} 个文件</span>
          <span>{formatBytes(sizeBytes)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CacheSettings() {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);

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
    } catch (error) {
      console.error('清理缓存失败:', error);
      toast.error('清理缓存失败', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setClearing(null);
    }
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
          />

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
