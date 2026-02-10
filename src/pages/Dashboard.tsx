import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  LayoutDashboard,
  Sparkles,
  ToggleRight,
  Key,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import StatCard from '@/components/dashboard/StatCard';
import ActivityList from '@/components/dashboard/ActivityList';
import QuickActions from '@/components/dashboard/QuickActions';
import SystemStatus from '@/components/dashboard/SystemStatus';
import SkillsOverview from '@/components/dashboard/MiniSkillCard';
import {
  dashboardStatsAtom,
  recentActivitiesAtom,
  configHealthAtom,
  dashboardLoadingAtom,
  dashboardErrorAtom,
} from '@/store/dashboardAtoms';
import { skillsListAtom } from '@/store/skillsAtoms';
import { getDashboardStats, getConfigHealth, readConversationHistory } from '@/services/config';
import { clearActivities } from '@/lib/activityLogger';
import { listInstalledSkills, toggleSkill } from '@/services/skills';

export default function Dashboard() {
  const [stats, setStats] = useAtom(dashboardStatsAtom);
  const [activities, setActivities] = useAtom(recentActivitiesAtom);
  const [health, setHealth] = useAtom(configHealthAtom);
  const [loading, setLoading] = useAtom(dashboardLoadingAtom);
  const [error, setError] = useAtom(dashboardErrorAtom);
  const [skills, setSkills] = useAtom(skillsListAtom);

  // 加载仪表盘数据
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardStats, configHealth, installedSkills] = await Promise.all([
        getDashboardStats(),
        getConfigHealth(),
        listInstalledSkills(),
      ]);

      setStats(dashboardStats);
      setHealth(configHealth);
      setSkills(installedSkills);

      // 从 Claude Code history.jsonl 加载对话记录
      const conversationHistory = await readConversationHistory(20);
      setActivities(conversationHistory);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载仪表盘数据失败';
      setError(message);
      toast.error('加载失败', { description: message });
    } finally {
      setLoading(false);
    }
  }, [setStats, setHealth, setSkills, setActivities, setError, setLoading]);

  // 初始加载
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 切换 Skill 状态
  const handleToggleSkill = async (skillName: string, enabled: boolean) => {
    // 乐观更新
    const previousSkills = [...skills];
    setSkills((prev) =>
      prev.map((s) => (s.name === skillName ? { ...s, enabled } : s))
    );

    try {
      await toggleSkill(skillName, enabled);
      toast.success(enabled ? 'Skill 已启用' : 'Skill 已禁用', {
        description: skillName,
      });

      // 刷新统计数据
      const newStats = await getDashboardStats();
      setStats(newStats);
    } catch (err) {
      // 回滚
      setSkills(previousSkills);
      toast.error('操作失败', {
        description: err instanceof Error ? err.message : '切换 Skill 状态失败',
      });
    }
  };

  // 清除活动记录
  const handleClearActivities = () => {
    clearActivities();
    setActivities([]);
    toast.success('活动记录已清除');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">仪表板</h1>
            <p className="text-muted-foreground">
              欢迎使用 Cobalt - Claude 配置管理工具
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDashboardData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">加载失败</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Skills 总数"
          value={stats?.skills.total ?? 0}
          description={`${stats?.skills.enabled ?? 0} 个已启用`}
          icon={Sparkles}
          href="/skills"
          loading={loading}
        />
        <StatCard
          title="已启用"
          value={stats?.skills.enabled ?? 0}
          description={`${stats?.skills.disabled ?? 0} 个已禁用`}
          icon={ToggleRight}
          href="/skills"
          loading={loading}
        />
        <StatCard
          title="配置档案"
          value={stats?.profiles.total ?? 0}
          description={stats?.profiles.activeId ? '1 个激活' : '未激活'}
          icon={Key}
          href="/settings/general"
          loading={loading}
        />
      </div>

      {/* 主内容区域 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：最近活动 */}
        <div className="lg:col-span-2 space-y-6">
          <ActivityList
            activities={activities}
            onClear={handleClearActivities}
            loading={loading}
          />
          <SkillsOverview
            skills={skills}
            onToggleSkill={handleToggleSkill}
            loading={loading}
          />
        </div>

        {/* 右侧：快捷操作和系统状态 */}
        <div className="space-y-6">
          <QuickActions />
          <SystemStatus health={health} loading={loading} />
        </div>
      </div>
    </div>
  );
}
