import { useEffect, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  marketplaceListAtom,
  marketplaceLoadingAtom,
  marketplaceErrorAtom,
  refreshingMarketplaceAtom,
} from '@/store/marketplaceAtoms';
import {
  listMarketplace,
  addMarketplace,
  removeMarketplace,
  toggleMarketplace,
  updateMarketplace,
  refreshMarketplace,
  refreshAllMarketplace,
} from '@/services/marketplace';
import type { MarketplaceSource, AddMarketplaceParams } from '@/types/marketplace';

export default function MarketplaceList() {
  const navigate = useNavigate();
  const [sources, setSources] = useAtom(marketplaceListAtom);
  const [loading, setLoading] = useAtom(marketplaceLoadingAtom);
  const setError = useSetAtom(marketplaceErrorAtom);
  const [refreshingSources, setRefreshingSources] = useAtom(refreshingMarketplaceAtom);

  // 添加对话框状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddMarketplaceParams>({
    name: '',
    url: '',
    tags: [],
    description: '',
  });
  const [adding, setAdding] = useState(false);

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<MarketplaceSource | null>(null);
  const [editing, setEditing] = useState(false);

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<MarketplaceSource | null>(null);

  // 加载市场源列表
  const loadSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMarketplace();
      setSources(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载市场源失败';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  // 添加市场源
  const handleAddSource = async () => {
    if (!addForm.name.trim() || !addForm.url.trim()) {
      toast.error('请填写名称和 URL');
      return;
    }

    setAdding(true);
    try {
      await addMarketplace(addForm);
      toast.success('市场源添加成功');
      setAddDialogOpen(false);
      setAddForm({ name: '', url: '', tags: [], description: '' });
      await loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : '添加市场源失败';
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  // 删除市场源
  const handleDeleteSource = async () => {
    if (!deletingSource) return;

    try {
      await removeMarketplace(deletingSource.id);
      toast.success('市场源已删除');
      setDeleteDialogOpen(false);
      setDeletingSource(null);
      await loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除市场源失败';
      toast.error(message);
    }
  };

  // 启用/禁用市场源
  const handleToggleSource = async (source: MarketplaceSource) => {
    try {
      await toggleMarketplace(source.id, !source.enabled);
      toast.success(source.enabled ? '市场源已禁用' : '市场源已启用');
      await loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      toast.error(message);
    }
  };

  // 编辑市场源
  const handleEditSource = async () => {
    if (!editingSource) return;

    setEditing(true);
    try {
      await updateMarketplace({
        sourceId: editingSource.id,
        name: editingSource.name,
        tags: editingSource.tags,
        description: editingSource.description,
        priority: editingSource.priority,
      });
      toast.success('市场源已更新');
      setEditDialogOpen(false);
      setEditingSource(null);
      await loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新市场源失败';
      toast.error(message);
    } finally {
      setEditing(false);
    }
  };

  // 刷新单个市场源
  const handleRefreshSource = async (source: MarketplaceSource) => {
    setRefreshingSources(new Set([...refreshingSources, source.id]));
    try {
      await refreshMarketplace(source.id);
      toast.success(`市场源 ${source.name} 刷新成功`);
      await loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新失败';
      toast.error(message);
    } finally {
      setRefreshingSources(
        new Set([...refreshingSources].filter((id) => id !== source.id))
      );
    }
  };

  // 刷新所有市场源
  const handleRefreshAll = async () => {
    const enabledSources = sources.filter((s) => s.enabled);
    setRefreshingSources(new Set(enabledSources.map((s) => s.id)));
    try {
      await refreshAllMarketplace();
      toast.success('所有市场源刷新成功');
      await loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新失败';
      toast.error(message);
    } finally {
      setRefreshingSources(new Set());
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Skill 市场</h1>
            <p className="text-muted-foreground">管理 Skill 市场源，浏览和安装 Skills</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={loading || refreshingSources.size > 0}
          >
            {refreshingSources.size > 0 ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新全部
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加市场源
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加市场源</DialogTitle>
                <DialogDescription>添加一个 GitHub 仓库作为 Skill 市场源</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">名称</Label>
                  <Input
                    id="name"
                    placeholder="例如：Official Agent Toolkit"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="url">仓库 URL</Label>
                  <Input
                    id="url"
                    placeholder="https://github.com/username/repo"
                    value={addForm.url}
                    onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">描述（可选）</Label>
                  <Input
                    id="description"
                    placeholder="简短描述这个市场源"
                    value={addForm.description}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">标签（可选，逗号分隔）</Label>
                  <Input
                    id="tags"
                    placeholder="例如：official, productivity"
                    value={addForm.tags?.join(', ')}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddSource} disabled={adding}>
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 数据源列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有添加任何市场源</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加第一个市场源
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <Card
              key={source.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/skills/marketplace/${source.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {source.name}
                      {!source.enabled && (
                        <Badge variant="secondary" className="text-xs">
                          已禁用
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {source.description || '暂无描述'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {source.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Skills 数量</span>
                    <span className="font-medium">{source.skillCount}</span>
                  </div>
                  {source.lastRefreshed && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">最后刷新</span>
                      <span className="font-medium">
                        {new Date(source.lastRefreshed).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshSource(source);
                      }}
                      disabled={refreshingSources.has(source.id)}
                    >
                      {refreshingSources.has(source.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSource(source);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(source.url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingSource(source);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <div className="flex-1" />
                    <Switch
                      checked={source.enabled}
                      onCheckedChange={() => {
                        handleToggleSource(source);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑市场源</DialogTitle>
          </DialogHeader>
          {editingSource && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">名称</Label>
                <Input
                  id="edit-name"
                  value={editingSource.name}
                  onChange={(e) =>
                    setEditingSource({ ...editingSource, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">描述</Label>
                <Input
                  id="edit-description"
                  value={editingSource.description || ''}
                  onChange={(e) =>
                    setEditingSource({ ...editingSource, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">标签（逗号分隔）</Label>
                <Input
                  id="edit-tags"
                  value={editingSource.tags.join(', ')}
                  onChange={(e) =>
                    setEditingSource({
                      ...editingSource,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditSource} disabled={editing}>
              {editing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除市场源 "{deletingSource?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSource}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
