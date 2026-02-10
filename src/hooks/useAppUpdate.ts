import { useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';

/**
 * 从未知错误对象中提取错误消息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') return JSON.stringify(error);
  return '未知错误';
}

/**
 * 应用更新 hook - 提供检查更新和下载安装功能
 */
export function useAppUpdate() {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  const checkForUpdate = async (currentVersion?: string) => {
    setCheckingUpdate(true);
    try {
      const update = await check();
      if (update?.available) {
        return update;
      } else {
        toast.success('已是最新版本', {
          description: currentVersion ? `当前版本 ${currentVersion}` : '当前已是最新版本',
          duration: 3000,
        });
        return null;
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      toast.error('检查更新失败', {
        description: getErrorMessage(error),
        duration: 5000,
      });
      return null;
    } finally {
      setCheckingUpdate(false);
    }
  };

  const downloadAndInstall = async () => {
    setUpdating(true);
    try {
      const update = await check();
      if (!update?.available) {
        toast.info('更新已不可用，请稍后重试');
        return;
      }

      toast.loading('正在下载更新...', { id: 'app-update' });

      await update.downloadAndInstall((event) => {
        if (event.event === 'Finished') {
          toast.success('更新安装完成，应用将在 2 秒后重启...', {
            id: 'app-update',
            duration: 2000,
          });
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        await relaunch();
      } catch (relaunchError) {
        console.error('自动重启失败:', relaunchError);
        toast.error('请手动重启应用以完成更新', { duration: 5000 });
      }
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败', {
        description: getErrorMessage(error),
        id: 'app-update',
      });
    } finally {
      setUpdating(false);
    }
  };

  return { checkingUpdate, updating, checkForUpdate, downloadAndInstall };
}
