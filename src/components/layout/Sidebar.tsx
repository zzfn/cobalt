import { Link, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Settings,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Key,
  FileJson,
  RefreshCw,
  Database,
  Terminal,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { sidebarCollapsedAtom, themeAtom, resolvedThemeAtom } from '@/store/uiAtoms';
import WorkspaceSelector from '@/components/workspace/WorkspaceSelector';
import { getClaudeCodeVersion } from '@/services/tokenUsage';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: '仪表板',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Skills',
    href: '/skills',
    icon: Sparkles,
  },
  {
    title: 'Skill 市场',
    href: '/skills/marketplace',
    icon: Database,
  },
  {
    title: 'Token 用量',
    href: '/token-usage',
    icon: BarChart3,
  },
  {
    title: 'Claude Code',
    href: '/settings/claude-code',
    icon: Terminal,
    children: [
      {
        title: 'API Key',
        href: '/settings/claude-code',
        icon: Key,
      },
      {
        title: 'CLAUDE.md',
        href: '/settings/instructions',
        icon: FileText,
      },
      {
        title: 'settings.json',
        href: '/settings/settings-json',
        icon: FileJson,
      },
    ],
  },
  {
    title: '通用设置',
    href: '/settings/general',
    icon: Settings,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [resolvedTheme] = useAtom(resolvedThemeAtom);
  const location = useLocation();
  const [version, setVersion] = useState<string>('');
  const [ccVersion, setCcVersion] = useState<string>('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    getVersion().then(setVersion).catch(console.error);
    getClaudeCodeVersion().then(setCcVersion).catch(() => setCcVersion(''));
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const update = await check();

      if (update?.available) {
        toast.info('发现新版本', {
          description: `版本 ${update.version} 可用，请重启应用以更新`,
          duration: 5000,
        });
      } else {
        toast.success('已是最新版本', {
          description: `当前版本 ${version}`,
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

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;

    // 精确匹配逻辑
    const isActive = (() => {
      if (location.pathname === item.href) return true;

      // 有子菜单时，任意子项匹配则父级高亮
      if (hasChildren) {
        return item.children!.some(
          (child) => location.pathname === child.href || location.pathname.startsWith(child.href + '/')
        );
      }

      // 特殊处理 /skills 路由：只有访问 /skills/:skillName 时才高亮
      if (item.href === '/skills') {
        return location.pathname.startsWith('/skills/') &&
               !location.pathname.startsWith('/skills/marketplace');
      }

      // 其他路由使用默认逻辑
      return location.pathname.startsWith(item.href + '/');
    })();

    const isExpanded = hasChildren;

    return (
      <div key={item.href}>
        <Link
          to={hasChildren ? item.children![0].href : item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            isActive && 'bg-accent text-accent-foreground',
            collapsed && 'justify-center px-2',
            depth > 0 && !collapsed && 'ml-4'
          )}
        >
          <item.icon className={cn('h-4 w-4 shrink-0', collapsed && 'h-5 w-5')} />
          {!collapsed && <span>{item.title}</span>}
        </Link>
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b px-4', collapsed && 'justify-center px-2')}>
        {!collapsed ? (
          <span className="text-lg font-semibold">Cobalt</span>
        ) : (
          <span className="text-lg font-bold">C</span>
        )}
      </div>

      {/* 工作区选择器 */}
      <div className={cn('border-b p-2', collapsed && 'flex justify-center')}>
        <WorkspaceSelector collapsed={collapsed} />
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.slice(0, 4).map((item) => renderNavItem(item))}
        <Separator className="my-2" />
        {navItems.slice(4).map((item) => renderNavItem(item))}
      </nav>

      <Separator />

      {/* 底部操作 */}
      <div className={cn('p-2 space-y-1', collapsed && 'flex flex-col items-center')}>
        {/* 主题切换 */}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={toggleTheme}
          className={cn('w-full', collapsed && 'w-10')}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          {!collapsed && (
            <span className="ml-2">
              {theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}
            </span>
          )}
        </Button>

        {/* 折叠按钮 */}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={() => setCollapsed(!collapsed)}
          className={cn('w-full', collapsed && 'w-10')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">收起侧边栏</span>
            </>
          )}
        </Button>

        {/* 版本号和检查更新 */}
        {version && (
          <div className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground py-2',
            collapsed ? 'flex-col px-0' : 'justify-between px-3'
          )}>
            <div className="flex flex-col gap-0.5">
              <span>{collapsed ? `v${version.split('.')[0]}` : `v${version}`}</span>
              {!collapsed && (
                <span className="text-muted-foreground/70">
                  {ccVersion ? `CC ${ccVersion}` : 'CC --'}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              title="检查更新"
            >
              <RefreshCw className={cn('h-3 w-3', checkingUpdate && 'animate-spin')} />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
