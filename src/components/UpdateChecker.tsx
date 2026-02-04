import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    body?: string;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [installing, setInstalling] = useState(false);

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await check();

      if (update?.available) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: update.version,
          body: update.body,
        });

        toast.info('发现新版本', {
          description: `版本 ${update.version} 可用`,
          action: {
            label: '立即更新',
            onClick: () => handleUpdate(),
          },
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;

    setDownloading(true);

    try {
      const update = await check();

      if (update?.available) {
        toast.loading('正在下载更新...', {
          id: 'update-download',
        });

        // 下载并安装更新
        let totalDownloaded = 0;
        let contentLength = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              setDownloadProgress(0);
              totalDownloaded = 0;
              contentLength = event.data.contentLength || 0;
              setTotalSize(contentLength);
              break;
            case 'Progress':
              totalDownloaded += event.data.chunkLength;
              setDownloadProgress(totalDownloaded);
              const downloaded = formatBytes(totalDownloaded);
              toast.loading(`下载中... ${downloaded}`, {
                id: 'update-download',
              });
              break;
            case 'Finished':
              setInstalling(true);
              toast.success('更新下载完成，正在安装...', {
                id: 'update-download',
              });
              break;
          }
        });

        // 关闭弹窗并重启应用
        setUpdateAvailable(false);
        await relaunch();
      }
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败', {
        description: error instanceof Error ? error.message : '未知错误',
        id: 'update-download',
      });
      setDownloading(false);
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  return (
    <Dialog open={updateAvailable} onOpenChange={setUpdateAvailable}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发现新版本</DialogTitle>
          <DialogDescription>
            版本 {updateInfo?.version} 已发布，建议立即更新
          </DialogDescription>
        </DialogHeader>

        {updateInfo?.body && (
          <div className="max-h-60 overflow-y-auto rounded-md border p-4">
            <pre className="whitespace-pre-wrap text-sm">
              {updateInfo.body}
            </pre>
          </div>
        )}

        {downloading && !installing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">下载中</span>
              <span className="font-medium">
                {downloadProgress > 0 ? formatBytes(downloadProgress) : '准备中...'}
              </span>
            </div>
            <Progress value={totalSize > 0 ? (downloadProgress / totalSize) * 100 : 0} />
          </div>
        )}

        {installing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">正在安装</span>
              <span className="font-medium">应用将自动重启</span>
            </div>
            <Progress value={100} />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={downloading || installing}
          >
            稍后提醒
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={downloading || installing}
          >
            {installing ? '安装中...' : downloading ? '下载中...' : '立即更新'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
