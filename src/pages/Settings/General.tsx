import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { Settings, Sun, Moon, Monitor, RefreshCw } from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { settingsAtom } from '@/store/settingsAtoms';
import { themeAtom } from '@/store/uiAtoms';

export default function GeneralSettings() {
  const [settings, setSettings] = useAtom(settingsAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  // 获取当前版本
  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const update = await check();

      if (update?.available) {
        toast.info('发现新版本', {
          description: `版本 ${update.version} 可用`,
          action: {
            label: '立即更新',
            onClick: () => handleDownloadUpdate(),
          },
          duration: 10000,
        });
      } else {
        toast.success('已是最新版本', {
          description: currentVersion ? `当前版本 ${currentVersion}` : '当前已是最新版本',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);

      // 获取更详细的错误信息
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }

      toast.error('检查更新失败', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdating(true);
    try {
      const update = await check();
      if (!update?.available) {
        toast.info('更新已不可用，请稍后重试');
        setUpdating(false);
        return;
      }

      toast.loading('正在下载更新...', { id: 'settings-update' });

      await update.downloadAndInstall((event) => {
        if (event.event === 'Finished') {
          toast.success('更新安装完成，应用将在 2 秒后重启...', {
            id: 'settings-update',
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
        setUpdating(false);
      }
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败', {
        description: error instanceof Error ? error.message : '未知错误',
        id: 'settings-update',
      });
      setUpdating(false);
    }
  };

  const themeOptions = [
    { value: 'light' as const, label: '浅色', icon: Sun },
    { value: 'dark' as const, label: '深色', icon: Moon },
    { value: 'system' as const, label: '跟随系统', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">通用设置</h1>
          <p className="text-muted-foreground">配置应用的基本设置</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>外观</CardTitle>
          <CardDescription>自定义应用的外观主题</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((option) => (
              <Button
                key={option.value}
                variant={theme === option.value ? 'default' : 'outline'}
                onClick={() => setTheme(option.value)}
                className="flex items-center gap-2"
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>编辑器</CardTitle>
          <CardDescription>配置代码编辑器的行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自动换行</p>
              <p className="text-sm text-muted-foreground">在编辑器中自动换行长行</p>
            </div>
            <Switch
              checked={settings.editorWordWrap}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, editorWordWrap: checked })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">字体大小</p>
              <p className="text-sm text-muted-foreground">编辑器的字体大小</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings({
                    ...settings,
                    editorFontSize: Math.max(10, settings.editorFontSize - 1),
                  })
                }
              >
                -
              </Button>
              <span className="w-8 text-center">{settings.editorFontSize}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings({
                    ...settings,
                    editorFontSize: Math.min(24, settings.editorFontSize + 1),
                  })
                }
              >
                +
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自动保存</CardTitle>
          <CardDescription>配置自动保存行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">启用自动保存</p>
              <p className="text-sm text-muted-foreground">自动保存编辑的内容</p>
            </div>
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoSave: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>应用更新</CardTitle>
          <CardDescription>检查并安装应用更新</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">检查更新</p>
              <p className="text-sm text-muted-foreground">
                {currentVersion ? `当前版本: v${currentVersion}` : '手动检查应用更新'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate || updating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
              {updating ? '更新中...' : checkingUpdate ? '检查中...' : '检查更新'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
