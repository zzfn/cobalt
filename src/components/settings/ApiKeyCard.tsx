import { useState } from 'react';
import { Key, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ApiKeyProfile } from '@/types/settings';

interface ApiKeyCardProps {
  profiles: ApiKeyProfile[];
  activeProfileId: string | null;
  currentApiKey: string;
  currentBaseUrl: string;
  onProfilesChange: (profiles: ApiKeyProfile[]) => void;
  onActiveProfileChange: (profileId: string | null) => void;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onSwitchProfile: (profileId: string) => void;
}

export default function ApiKeyCard({
  profiles,
  activeProfileId,
  currentApiKey,
  currentBaseUrl,
  onProfilesChange,
  onActiveProfileChange,
  onApiKeyChange,
  onBaseUrlChange,
  onSwitchProfile,
}: ApiKeyCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ApiKeyProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileApiKey, setProfileApiKey] = useState('');
  const [profileBaseUrl, setProfileBaseUrl] = useState('');

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setProfileName('');
    setProfileApiKey(currentApiKey);
    setProfileBaseUrl(currentBaseUrl);
    setDialogOpen(true);
  };

  const handleEditProfile = (profile: ApiKeyProfile) => {
    setEditingProfile(profile);
    setProfileName(profile.name);
    setProfileApiKey(profile.apiKey);
    setProfileBaseUrl(profile.baseUrl);
    setDialogOpen(true);
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;

    if (editingProfile) {
      // 编辑现有配置
      const updatedProfiles = profiles.map((p) =>
        p.id === editingProfile.id
          ? { ...p, name: profileName.trim(), apiKey: profileApiKey, baseUrl: profileBaseUrl }
          : p
      );
      onProfilesChange(updatedProfiles);
    } else {
      // 创建新配置
      const newProfile: ApiKeyProfile = {
        id: crypto.randomUUID(),
        name: profileName.trim(),
        apiKey: profileApiKey,
        baseUrl: profileBaseUrl,
        createdAt: new Date().toISOString(),
      };
      onProfilesChange([...profiles, newProfile]);
    }

    setDialogOpen(false);
  };

  const handleDeleteProfile = (profileId: string) => {
    const updatedProfiles = profiles.filter((p) => p.id !== profileId);
    onProfilesChange(updatedProfiles);
    if (activeProfileId === profileId) {
      onActiveProfileChange(null);
    }
  };

  const handleSwitchProfile = (profile: ApiKeyProfile) => {
    onSwitchProfile(profile.id);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API 配置
          </CardTitle>
          <CardDescription>
            管理 API Key 和 Base URL，支持多配置档案切换
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 配置档案列表 */}
          {profiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">配置档案</h4>
              <div className="flex flex-wrap gap-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                      activeProfileId === profile.id
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-accent'
                    )}
                  >
                    <button
                      onClick={() => handleSwitchProfile(profile)}
                      className="flex items-center gap-2"
                    >
                      {activeProfileId === profile.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">{profile.name}</span>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditProfile(profile)}
                        className="p-1 rounded hover:bg-accent"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="p-1 rounded hover:bg-destructive/20 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 当前配置 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">当前配置</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">API Key (ANTHROPIC_AUTH_TOKEN)</label>
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={currentApiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Base URL (ANTHROPIC_BASE_URL)</label>
                <Input
                  placeholder="https://api.anthropic.com"
                  value={currentBaseUrl}
                  onChange={(e) => onBaseUrlChange(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleCreateProfile}>
              <Plus className="h-4 w-4 mr-1" />
              保存为档案
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 编辑/创建对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? '编辑配置档案' : '新建配置档案'}</DialogTitle>
            <DialogDescription>
              {editingProfile
                ? '修改配置档案的名称和 API 配置'
                : '将当前配置保存为新的档案，方便快速切换'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">档案名称</label>
              <Input
                placeholder="如：个人账号、公司账号"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="sk-ant-..."
                value={profileApiKey}
                onChange={(e) => setProfileApiKey(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Base URL</label>
              <Input
                placeholder="https://api.anthropic.com"
                value={profileBaseUrl}
                onChange={(e) => setProfileBaseUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveProfile} disabled={!profileName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
