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

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    body?: string;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

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
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              setDownloadProgress(0);
              totalDownloaded = 0;
              break;
            case 'Progress':
              totalDownloaded += event.data.chunkLength;
              setDownloadProgress(totalDownloaded);
              toast.loading(`下载中... ${(totalDownloaded / 1024 / 1024).toFixed(2)} MB`, {
                id: 'update-download',
              });
              break;
            case 'Finished':
              toast.success('更新下载完成，即将重启应用', {
                id: 'update-download',
              });
              break;
          }
        });

        // 重启应用以应用更新
        setTimeout(() => {
          relaunch();
        }, 1000);
      }
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败', {
        description: error instanceof Error ? error.message : '未知错误',
        id: 'update-download',
      });
      setDownloading(false);
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
            版本 {updateInfo?.version} 现已可用
          </DialogDescription>
        </DialogHeader>

        {updateInfo?.body && (
          <div className="max-h-60 overflow-y-auto rounded-md border p-4">
            <pre className="whitespace-pre-wrap text-sm">
              {updateInfo.body}
            </pre>
          </div>
        )}

        {downloading && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              下载进度: {downloadProgress > 0 ? `${downloadProgress} bytes` : '准备中...'}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={downloading}
          >
            稍后提醒
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={downloading}
          >
            {downloading ? '下载中...' : '立即更新'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
