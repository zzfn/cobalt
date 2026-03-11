import { Link, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Settings,
  FileText,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Key,
  FileJson,
  RefreshCw,
  Database,
  Terminal,
  BarChart3,
  HardDrive,
  PanelLeftClose,
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

interface NavGroup {
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { title: '仪表板', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Skill 市场', href: '/skills/marketplace', icon: Database },
      { title: 'Skills', href: '/skills', icon: Sparkles },
    ],
  },
  {
    items: [
      {
        title: 'Claude Code',
        href: '/settings/claude-code',
        icon: Terminal,
        children: [
          { title: 'API Key', href: '/settings/claude-code', icon: Key },
          { title: 'CLAUDE.md', href: '/settings/instructions', icon: FileText },
          { title: 'settings.json', href: '/settings/settings-json', icon: FileJson },
          { title: 'claude.json', href: '/settings/claude-json', icon: FileJson },
          { title: '缓存管理', href: '/settings/cache', icon: HardDrive },
          { title: 'Token 用量', href: '/token-usage', icon: BarChart3 },
        ],
      },
      { title: '通用设置', href: '/settings/general', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [resolvedTheme] = useAtom(resolvedThemeAtom);
  const location = useLocation();
  const [version, setVersion] = useState<string>('');
  const [ccVersion, setCcVersion] = useState<string>('');
  const { checkingUpdate, checkForUpdate, downloadAndInstall } = useAppUpdate();

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
            'flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm transition-all duration-200',
            'bg-sidebar-item text-foreground/80',
            'hover:bg-sidebar-item-hover hover:text-foreground',
            isActive && 'bg-sidebar-item-active text-foreground shadow-[0_12px_30px_-24px_rgba(25,39,52,0.7)]',
            collapsed && 'justify-center px-2.5',
            depth > 0 && !collapsed && 'ml-4 text-[13px]'
          )}
        >
          <item.icon className={cn('h-4 w-4 shrink-0', collapsed && 'h-[18px] w-[18px]')} />
          {!collapsed && (
            <span className={cn('font-medium tracking-[-0.02em]', isActive && 'translate-x-0.5')}>
              {item.title}
            </span>
          )}
        </Link>
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'relative m-3 flex h-[calc(100vh-24px)] flex-col rounded-[28px] border border-sidebar-border/80 bg-sidebar/88 shadow-[0_24px_70px_-34px_rgba(25,39,52,0.4)] backdrop-blur-xl',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-[88px]' : 'w-[292px]'
      )}
    >
      <div className={cn(
        'flex h-20 items-center border-b border-sidebar-border/70 px-5',
        collapsed && 'justify-center px-3'
      )}>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary text-sm font-semibold text-white shadow-[0_14px_30px_-16px_hsl(var(--primary)/0.9)]">
                Co
              </div>
              <div className="min-w-0">
                <span className="block text-[15px] font-semibold tracking-[-0.03em]">Cobalt</span>
                <span className="block text-xs text-muted-foreground">AI Workspace Console</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary text-sm font-semibold text-white shadow-[0_14px_30px_-16px_hsl(var(--primary)/0.9)]">
            C
          </div>
        )}
      </div>

      <div className={cn(
        'border-b border-sidebar-border/70 px-3 py-3',
        collapsed && 'flex justify-center py-3'
      )}>
        <WorkspaceSelector collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navGroups.map((group, index) => (
          <div key={index}>
            {group.items.map((item) => renderNavItem(item))}
            {index < navGroups.length - 1 && (
              <Separator className="my-4 bg-sidebar-border/60" />
            )}
          </div>
        ))}
      </nav>

      <div className={cn(
        'border-t border-sidebar-border/70 p-3 space-y-1.5',
        collapsed && 'flex flex-col items-center'
      )}>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={toggleTheme}
          className={cn(
            'h-10 justify-start rounded-[16px] hover:bg-sidebar-item-hover',
            collapsed && 'w-10 h-10'
          )}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          {!collapsed && (
            <span className="ml-2 text-sm">
              {theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'h-10 justify-start rounded-[16px] hover:bg-sidebar-item-hover',
            collapsed && 'w-10 h-10'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="ml-2 text-sm">收起侧栏</span>
            </>
          )}
        </Button>

        {version && (
          <div className={cn(
            'flex items-center gap-2 text-muted-foreground/70',
            collapsed ? 'flex-col gap-1 px-0 py-1.5' : 'justify-between px-1 py-1'
          )}>
            <div className="flex min-w-0 flex-col gap-0.5 leading-none">
              <span className="text-[11px] font-medium text-foreground/75">
                {collapsed ? `v${version.split('.')[0]}` : `Cobalt v${version}`}
              </span>
              {!collapsed && (
                <span className="truncate text-[10px] text-muted-foreground/65">
                  {ccVersion ? `CC ${ccVersion}` : 'CC --'}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-[8px] hover:bg-sidebar-item-hover"
              onClick={async () => {
                const update = await checkForUpdate(version);
                if (update) {
                  toast.info('发现新版本', {
                    description: `版本 ${update.version} 可用，点击立即更新`,
                    action: {
                      label: '立即更新',
                      onClick: () => downloadAndInstall(update),
                    },
                    duration: 10000,
                  });
                }
              }}
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
