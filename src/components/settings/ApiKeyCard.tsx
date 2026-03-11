import { useState } from 'react';
import { Key, Plus, Trash2, Check, Pencil, Globe, Copy, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { ApiKeyProfile } from '@/types/settings';
import { logActivity } from '@/lib/activityLogger';

interface ApiKeyCardProps {
  profiles: ApiKeyProfile[];
  activeProfileId: string | null;
  currentApiKey: string;
  currentBaseUrl: string;
  onProfilesChange: (profiles: ApiKeyProfile[]) => void;
  onActiveProfileChange: (profileId: string | null) => void;
  onSwitchProfile: (profileId: string) => void;
  onSaveProfiles: (profiles: ApiKeyProfile[], activeProfileId: string | null) => Promise<void>;
  onUseOfficialApi: () => Promise<void>;
}

export default function ApiKeyCard({
  profiles,
  activeProfileId,
  currentApiKey,
  currentBaseUrl,
  onProfilesChange,
  onActiveProfileChange,
  onSwitchProfile,
  onSaveProfiles,
  onUseOfficialApi,
}: ApiKeyCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ApiKeyProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileApiKey, setProfileApiKey] = useState('');
  const [profileBaseUrl, setProfileBaseUrl] = useState('');
  const [deletingProfile, setDeletingProfile] = useState<ApiKeyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [showProfileApiKey, setShowProfileApiKey] = useState(false);

  // 遮蔽 API Key 显示
  const maskApiKey = (key: string) => {
    if (!key) return '未设置';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 7)}...${key.slice(-4)}`;
  };

  // 提取域名显示
  const extractDomain = (url: string) => {
    if (!url) return '未设置';
    try {
      const u = new URL(url);
      return u.host;
    } catch {
      return url;
    }
  };

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setProfileName('');
    setProfileApiKey('');
    setProfileBaseUrl('');
    setShowProfileApiKey(false);
    setDialogOpen(true);
  };

  const handleEditProfile = (e: React.MouseEvent, profile: ApiKeyProfile) => {
    e.stopPropagation();
    setEditingProfile(profile);
    setProfileName(profile.name);
    setProfileApiKey(profile.apiKey);
    setProfileBaseUrl(profile.baseUrl);
    setDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;

    setSaving(true);
    try {
      let updatedProfiles: ApiKeyProfile[];

      if (editingProfile) {
        updatedProfiles = profiles.map((p) =>
          p.id === editingProfile.id
            ? { ...p, name: profileName.trim(), apiKey: profileApiKey, baseUrl: profileBaseUrl }
            : p
        );
      } else {
        const newProfile: ApiKeyProfile = {
          id: crypto.randomUUID(),
          name: profileName.trim(),
          apiKey: profileApiKey,
          baseUrl: profileBaseUrl,
          createdAt: new Date().toISOString(),
        };
        updatedProfiles = [...profiles, newProfile];
      }

      // 立即保存到后端
      await onSaveProfiles(updatedProfiles, activeProfileId);
      onProfilesChange(updatedProfiles);

      toast.success(editingProfile ? '档案已更新' : '档案已创建');
      setDialogOpen(false);
    } catch (error) {
      toast.error(editingProfile ? '更新档案失败' : '创建档案失败', {
        description: String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = (e: React.MouseEvent, profile: ApiKeyProfile) => {
    e.stopPropagation();
    setDeletingProfile(profile);
  };

  const confirmDeleteProfile = async () => {
    if (!deletingProfile) return;

    try {
      const updatedProfiles = profiles.filter((p) => p.id !== deletingProfile.id);
      const newActiveProfileId = activeProfileId === deletingProfile.id ? null : activeProfileId;

      await onSaveProfiles(updatedProfiles, newActiveProfileId);
      onProfilesChange(updatedProfiles);
      if (activeProfileId === deletingProfile.id) {
        onActiveProfileChange(null);
      }

      toast.success('档案已删除');
      setDeletingProfile(null);
    } catch (error) {
      toast.error('删除档案失败', {
        description: String(error),
      });
    }
  };

  const handleSwitchProfile = (profile: ApiKeyProfile) => {
    if (activeProfileId !== profile.id) {
      onSwitchProfile(profile.id);
      // 记录活动
      logActivity('profile_switch', `切换到 API 配置档案: ${profile.name}`, {
        profileId: profile.id,
        profileName: profile.name,
      });
    }
  };

  const handleDuplicateProfile = async (e: React.MouseEvent, profile: ApiKeyProfile) => {
    e.stopPropagation();
    try {
      const newProfile: ApiKeyProfile = {
        id: crypto.randomUUID(),
        name: `${profile.name} (副本)`,
        apiKey: profile.apiKey,
        baseUrl: profile.baseUrl,
        createdAt: new Date().toISOString(),
      };
      const updatedProfiles = [...profiles, newProfile];

      // 立即保存到后端
      await onSaveProfiles(updatedProfiles, activeProfileId);
      onProfilesChange(updatedProfiles);

      toast.success('档案已复制');
    } catch (error) {
      toast.error('复制档案失败', {
        description: String(error),
      });
    }
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
            管理多个 API Key 配置，点击卡片可快速切换
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 配置档案卡片网格 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* 官方 API 卡片 */}
            <div
              onClick={async () => {
                try {
                  await onUseOfficialApi();
                } catch (error) {
                  toast.error('切换到官方 API 失败', {
                    description: String(error),
                  });
                }
              }}
              className={cn(
                'group relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md',
                !activeProfileId && !currentApiKey && !currentBaseUrl
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
              )}
            >
              {/* 激活标记 */}
              {!activeProfileId && !currentApiKey && !currentBaseUrl && (
                <div className="absolute -top-2 -right-2 rounded-full bg-primary p-1">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              {/* 档案名称 */}
              <div className="mb-3">
                <h4 className="font-medium truncate">官方 API</h4>
              </div>

              {/* 描述 */}
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs truncate">使用 Anthropic 官方 API</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono text-xs truncate">api.anthropic.com</span>
                </div>
              </div>
            </div>

            {profiles.map((profile) => {
              const isActive = activeProfileId === profile.id;

              return (
                <div
                  key={profile.id}
                  onClick={() => handleSwitchProfile(profile)}
                  className={cn(
                    'group relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
                  )}
                >
                  {/* 激活标记 */}
                  {isActive && (
                    <div className="absolute -top-2 -right-2 rounded-full bg-primary p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}

                  {/* 档案名称 */}
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium truncate pr-2">{profile.name}</h4>
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicateProfile(e, profile)}
                        className="p-1.5 rounded-md hover:bg-background"
                        title="复制"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => handleEditProfile(e, profile)}
                        className="p-1.5 rounded-md hover:bg-background"
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProfile(e, profile)}
                        className="p-1.5 rounded-md transition-colors hover:bg-destructive/10 text-destructive"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* API Key 预览 */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Key className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono text-xs truncate">
                        {maskApiKey(profile.apiKey)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono text-xs truncate">
                        {extractDomain(profile.baseUrl)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 新建卡片 */}
            <button
              onClick={handleCreateProfile}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-primary/5 min-h-[120px]"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">新建配置</span>
            </button>
          </div>

        </CardContent>
      </Card>

      {/* 编辑/创建对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? '编辑配置档案' : '新建配置档案'}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? '修改配置档案的名称和 API 设置'
                : '创建新的 API 配置档案'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">档案名称</label>
              <Input
                placeholder="如：官方 API、代理服务"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <Input
                  type={showProfileApiKey ? 'text' : 'password'}
                  placeholder="sk-ant-..."
                  value={profileApiKey}
                  onChange={(e) => setProfileApiKey(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowProfileApiKey((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showProfileApiKey ? '隐藏 API Key' : '显示 API Key'}
                  title={showProfileApiKey ? '隐藏 API Key' : '显示 API Key'}
                >
                  {showProfileApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
            <Button onClick={handleSaveProfile} disabled={!profileName.trim() || saving}>
              {saving ? '保存中...' : editingProfile ? '保存修改' : '创建档案'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProfile} onOpenChange={(open) => !open && setDeletingProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除配置档案</AlertDialogTitle>
            <AlertDialogDescription>
              {`确定要删除“${deletingProfile?.name ?? ''}”吗？此操作不可撤销。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
