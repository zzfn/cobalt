import { useEffect, useState } from 'react';
import { Key, Save, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ApiKeyCard from '@/components/settings/ApiKeyCard';
import {
  readSettings,
  writeSettings,
  readApiProfiles,
  writeApiProfiles,
  switchApiProfile,
  clearApiConfig,
  detectEnvConflicts,
  removeEnvFromShell,
} from '@/services/config';
import type { EnvConflict } from '@/services/config';
import { logActivity } from '@/lib/activityLogger';
import type { ClaudeCodeSettings, ApiKeyProfile } from '@/types/settings';

// 环境变量 key 常量
const ENV_API_KEY = 'ANTHROPIC_AUTH_TOKEN';
const ENV_BASE_URL = 'ANTHROPIC_BASE_URL';

export default function ClaudeCodeSettings() {
  const [settings, setSettings] = useState<ClaudeCodeSettings>({
    permissions: { allow: [], deny: [] },
    env: {},
  });
  const [profiles, setProfiles] = useState<ApiKeyProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [envConflicts, setEnvConflicts] = useState<EnvConflict[]>([]);
  const [removingConflicts, setRemovingConflicts] = useState(false);

  // 从 env 中提取 API Key 和 Base URL
  const currentApiKey = settings.env?.[ENV_API_KEY] || '';
  const currentBaseUrl = settings.env?.[ENV_BASE_URL] || '';

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const [settingsData, profilesData, conflicts] = await Promise.all([
        readSettings(),
        readApiProfiles(),
        detectEnvConflicts(),
      ]);
      setSettings(settingsData);
      setProfiles(profilesData.profiles);
      setActiveProfileId(profilesData.activeProfileId);
      setEnvConflicts(conflicts);
      setHasChanges(false);
    } catch (error) {
      toast.error('加载配置失败', {
        description: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        writeSettings(settings),
        writeApiProfiles({ profiles, activeProfileId }),
      ]);
      toast.success('配置已保存');
      setHasChanges(false);
      logActivity('settings_update', '更新了 API Key 配置', {
        profilesCount: profiles.length,
      });
    } catch (error) {
      toast.error('保存配置失败', {
        description: String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  // 切换配置档案
  const handleSwitchProfile = async (profileId: string) => {
    try {
      await switchApiProfile(profileId);
      // 重新加载配置以获取更新后的 env
      await loadConfig();
      toast.success('已切换配置档案');
    } catch (error) {
      toast.error('切换配置档案失败', {
        description: String(error),
      });
    }
  };

  // 使用官方 API（清除自定义配置）
  const handleUseOfficialApi = async () => {
    try {
      await clearApiConfig();
      // 重新加载配置
      await loadConfig();
      toast.success('已切换到官方 API');
    } catch (error) {
      toast.error('切换失败', {
        description: String(error),
      });
    }
  };

  // 更新 API Key
  const handleApiKeyChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      env: { ...(prev.env || {}), [ENV_API_KEY]: value },
    }));
    setHasChanges(true);
  };

  // 更新 Base URL
  const handleBaseUrlChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      env: { ...(prev.env || {}), [ENV_BASE_URL]: value },
    }));
    setHasChanges(true);
  };

  // 更新配置档案
  const handleProfilesChange = (newProfiles: ApiKeyProfile[]) => {
    setProfiles(newProfiles);
    setHasChanges(true);
  };

  const handleActiveProfileChange = (profileId: string | null) => {
    setActiveProfileId(profileId);
    setHasChanges(true);
  };

  // 保存配置档案（立即保存）
  const handleSaveProfiles = async (
    newProfiles: ApiKeyProfile[],
    newActiveProfileId: string | null
  ) => {
    await writeApiProfiles({ profiles: newProfiles, activeProfileId: newActiveProfileId });
  };

  // 删除冲突的环境变量
  const handleRemoveConflicts = async () => {
    if (envConflicts.length === 0) return;

    setRemovingConflicts(true);
    try {
      const modifiedFiles = await removeEnvFromShell(envConflicts);
      const fileList = modifiedFiles.map(f => `~/${f}`).join(', ');
      toast.success('已删除冲突的环境变量', {
        description: `修改了: ${fileList}\n请在终端执行 source 命令使其生效`,
        action: {
          label: '复制命令',
          onClick: () => {
            const sourceCmd = modifiedFiles.map(f => `source ~/${f}`).join(' && ');
            navigator.clipboard.writeText(sourceCmd);
            toast.success('已复制到剪贴板');
          },
        },
        duration: 10000,
      });
      setEnvConflicts([]);
      logActivity('settings_update', '删除了 Shell 环境变量冲突', {
        files: modifiedFiles,
        conflicts: envConflicts.length,
      });
    } catch (error) {
      toast.error('删除环境变量失败', {
        description: String(error),
      });
    } finally {
      setRemovingConflicts(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">API Key</h1>
            <p className="text-muted-foreground">管理 Claude Code 的 API 配置档案</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadConfig}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* API 配置 */}
      {/* 环境变量冲突提示 */}
      {envConflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>检测到环境变量冲突</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveConflicts}
              disabled={removingConflicts}
              className="ml-2"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {removingConflicts ? '删除中...' : '删除冲突变量'}
            </Button>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm mb-2">
              以下 Shell 环境变量会覆盖 Cobalt 的配置，导致配置不生效：
            </p>
            <ul className="text-sm space-y-1">
              {envConflicts.map((conflict, index) => (
                <li key={index} className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-destructive/10 rounded text-xs">
                    {conflict.key}
                  </code>
                  <span className="text-muted-foreground">
                    在 ~/{conflict.shellFile} 第 {conflict.lineNumber} 行
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm mt-2 text-muted-foreground">
              点击「删除冲突变量」后将移除这些环境变量。删除后需要在终端执行 source 命令使其生效。
            </p>
          </AlertDescription>
        </Alert>
      )}

      <ApiKeyCard
        profiles={profiles}
        activeProfileId={activeProfileId}
        currentApiKey={currentApiKey}
        currentBaseUrl={currentBaseUrl}
        onProfilesChange={handleProfilesChange}
        onActiveProfileChange={handleActiveProfileChange}
        onApiKeyChange={handleApiKeyChange}
        onBaseUrlChange={handleBaseUrlChange}
        onSwitchProfile={handleSwitchProfile}
        onSaveProfiles={handleSaveProfiles}
        onUseOfficialApi={handleUseOfficialApi}
      />
    </div>
  );
}
