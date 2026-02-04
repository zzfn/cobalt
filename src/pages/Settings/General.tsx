import { useAtom } from 'jotai';
import { Settings, Sun, Moon, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { settingsAtom } from '@/store/settingsAtoms';
import { themeAtom } from '@/store/uiAtoms';

export default function GeneralSettings() {
  const [settings, setSettings] = useAtom(settingsAtom);
  const [theme, setTheme] = useAtom(themeAtom);

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
    </div>
  );
}
