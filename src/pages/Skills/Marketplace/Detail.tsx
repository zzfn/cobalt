import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  Loader2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { marketplaceListAtom, marketplaceCachesAtom } from '@/store/marketplaceAtoms';
import {
  getMarketplaceSkills,
  refreshMarketplace,
  installSkillFromMarketplace,
} from '@/services/marketplace';
import type { CachedSkillInfo } from '@/types/marketplace';

export default function MarketplaceDetail() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const navigate = useNavigate();
  const [sources] = useAtom(marketplaceListAtom);
  const [caches, setCaches] = useAtom(marketplaceCachesAtom);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'installed' | 'not-installed' | 'has-update'>('all');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const source = sources.find((s) => s.id === sourceId);
  const cache = sourceId ? caches[sourceId] : null;

  // 加载市场源的 Skills
  const loadSourceSkills = async () => {
    if (!sourceId) return;

    setLoading(true);
    try {
      const data = await getMarketplaceSkills(sourceId);
      setCaches({ ...caches, [sourceId]: data });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载 Skills 失败';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sourceId) {
      loadSourceSkills();
    }
  }, [sourceId]);

  // 刷新市场源
  const handleRefresh = async () => {
    if (!sourceId) return;

    setRefreshing(true);
    try {
      const data = await refreshMarketplace(sourceId);
      setCaches({ ...caches, [sourceId]: data });
      toast.success('市场源刷新成功');
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新失败';
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  };

  // 安装选中的 Skills
  const handleInstallSelected = async () => {
    if (!sourceId || selectedSkills.size === 0) return;

    setInstalling(true);
    try {
      await installSkillFromMarketplace(sourceId, Array.from(selectedSkills));
      toast.success(`成功安装 ${selectedSkills.size} 个 Skill(s)`);
      setSelectedSkills(new Set());
      await loadSourceSkills();
    } catch (err) {
      const message = err instanceof Error ? err.message : '安装失败';
      toast.error(message);
    } finally {
      setInstalling(false);
    }
  };

  // 安装单个 Skill
  const handleInstallSkill = async (skillName: string) => {
    if (!sourceId) return;

    try {
      await installSkillFromMarketplace(sourceId, [skillName]);
      toast.success(`Skill ${skillName} 安装成功`);
      await loadSourceSkills();
    } catch (err) {
      const message = err instanceof Error ? err.message : '安装失败';
      toast.error(message);
    }
  };

  // 切换选中状态
  const toggleSkillSelection = (skillName: string) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(skillName)) {
      newSelected.delete(skillName);
    } else {
      newSelected.add(skillName);
    }
    setSelectedSkills(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (!cache) return;
    const filteredSkills = getFilteredSkills();
    if (selectedSkills.size === filteredSkills.length) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(filteredSkills.map((s) => s.name)));
    }
  };

  // 筛选 Skills
  const getFilteredSkills = (): CachedSkillInfo[] => {
    if (!cache) return [];

    let filtered = cache.skills;

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description?.toLowerCase().includes(query) ||
          skill.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // 状态过滤
    if (filterStatus === 'installed') {
      filtered = filtered.filter((skill) => skill.installed);
    } else if (filterStatus === 'not-installed') {
      filtered = filtered.filter((skill) => !skill.installed);
    } else if (filterStatus === 'has-update') {
      filtered = filtered.filter((skill) => skill.hasUpdate);
    }

    return filtered;
  };

  const filteredSkills = getFilteredSkills();

  if (!source) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">市场源不存在</p>
          <Button className="mt-4" onClick={() => navigate('/skills/marketplace')}>
            返回市场列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/skills/marketplace')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{source.name}</h1>
            <p className="text-muted-foreground">{source.description || '暂无描述'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新
          </Button>
          {selectedSkills.size > 0 && (
            <Button onClick={handleInstallSelected} disabled={installing}>
              {installing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              安装选中 ({selectedSkills.size})
            </Button>
          )}
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索 Skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
          >
            全部
          </Button>
          <Button
            variant={filterStatus === 'installed' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('installed')}
          >
            已安装
          </Button>
          <Button
            variant={filterStatus === 'not-installed' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('not-installed')}
          >
            未安装
          </Button>
          <Button
            variant={filterStatus === 'has-update' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('has-update')}
          >
            有更新
          </Button>
        </div>
      </div>

      {/* Skills 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !cache || cache.skills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">该市场源中没有 Skills</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新市场源
            </Button>
          </CardContent>
        </Card>
      ) : filteredSkills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">没有找到匹配的 Skills</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 全选控制 */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              checked={selectedSkills.size === filteredSkills.length && filteredSkills.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              全选 ({filteredSkills.length} 个 Skills)
            </span>
          </div>

          {/* Skills 卡片列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <Card key={skill.name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedSkills.has(skill.name)}
                      onCheckedChange={() => toggleSkillSelection(skill.name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {skill.name}
                        {skill.installed && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            已安装
                          </Badge>
                        )}
                        {skill.hasUpdate && (
                          <Badge variant="default" className="text-xs">
                            有更新
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {skill.description || '暂无描述'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {skill.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {skill.version && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">版本</span>
                        <span className="font-medium">{skill.version}</span>
                      </div>
                    )}
                    {skill.installedVersion && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">已安装版本</span>
                        <span className="font-medium">{skill.installedVersion}</span>
                      </div>
                    )}
                    {skill.targetTools.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">目标工具</span>
                        <span className="font-medium">{skill.targetTools.join(', ')}</span>
                      </div>
                    )}
                    <Button
                      className="w-full mt-2"
                      variant={skill.installed ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleInstallSkill(skill.name)}
                      disabled={skill.installed && !skill.hasUpdate}
                    >
                      {skill.hasUpdate ? '更新' : skill.installed ? '已安装' : '安装'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
