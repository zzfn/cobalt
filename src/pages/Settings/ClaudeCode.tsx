import { useEffect, useState } from 'react';
import { Terminal, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PermissionsCard from '@/components/settings/PermissionsCard';
import EnvVariablesCard from '@/components/settings/EnvVariablesCard';
import ApiKeyCard from '@/components/settings/ApiKeyCard';
import {
  readSettings,
  writeSettings,
  readApiProfiles,
  writeApiProfiles,
  switchApiProfile,
} from '@/services/config';
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

  // 从 env 中提取 API Key 和 Base URL
  const currentApiKey = settings.env[ENV_API_KEY] || '';
  const currentBaseUrl = settings.env[ENV_BASE_URL] || '';

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const [settingsData, profilesData] = await Promise.all([
        readSettings(),
        readApiProfiles(),
      ]);
      setSettings(settingsData);
      setProfiles(profilesData.profiles);
      setActiveProfileId(profilesData.activeProfileId);
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
      // 记录活动
      logActivity('settings_update', '更新了 Claude Code 配置', {
        envVarsCount: Object.keys(settings.env).length,
        permissionsCount: settings.permissions.allow.length + settings.permissions.deny.length,
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

  // 更新权限
  const handleAllowChange = (allow: string[]) => {
    setSettings((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, allow },
    }));
    setHasChanges(true);
  };

  const handleDenyChange = (deny: string[]) => {
    setSettings((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, deny },
    }));
    setHasChanges(true);
  };

  // 更新环境变量
  const handleEnvChange = (env: Record<string, string>) => {
    setSettings((prev) => ({ ...prev, env }));
    setHasChanges(true);
  };

  // 更新 API Key
  const handleApiKeyChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      env: { ...prev.env, [ENV_API_KEY]: value },
    }));
    setHasChanges(true);
  };

  // 更新 Base URL
  const handleBaseUrlChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      env: { ...prev.env, [ENV_BASE_URL]: value },
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
          <Terminal className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Claude Code 配置</h1>
            <p className="text-muted-foreground">管理 Claude Code 的核心配置</p>
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
      />

      {/* 权限管理 */}
      <PermissionsCard
        allow={settings.permissions.allow}
        deny={settings.permissions.deny}
        onAllowChange={handleAllowChange}
        onDenyChange={handleDenyChange}
      />

      {/* 环境变量 */}
      <EnvVariablesCard env={settings.env} onChange={handleEnvChange} />
    </div>
  );
}
