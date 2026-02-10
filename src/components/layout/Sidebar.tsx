import { Link, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { useAppUpdate } from '@/hooks/useAppUpdate';
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
  HardDrive,
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
      { title: 'Skills', href: '/skills', icon: Sparkles },
      { title: 'Skill 市场', href: '/skills/marketplace', icon: Database },
      { title: 'Token 用量', href: '/token-usage', icon: BarChart3 },
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
          { title: '缓存管理', href: '/settings/cache', icon: HardDrive },
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
  const { checkingUpdate, checkForUpdate } = useAppUpdate();

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
            // Figma 风格：简洁布局，充足内边距
            'flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-sm',
            // 默认状态：透明背景
            'bg-sidebar-item text-foreground',
            // 悬停状态：极浅灰
            'hover:bg-sidebar-item-hover',
            // 选中状态：克制的背景色
            isActive && 'bg-sidebar-item-active',
            collapsed && 'justify-center px-2',
            depth > 0 && !collapsed && 'ml-4'
          )}
        >
          <item.icon className={cn('h-4 w-4 shrink-0', collapsed && 'h-5 w-5')} />
          {!collapsed && <span className="font-medium">{item.title}</span>}
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
        // Figma 风格：纯白/深色背景，细线右边框
        'flex h-screen flex-col bg-sidebar border-r border-sidebar-border',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo 区域 - 极简设计 */}
      <div className={cn(
        'flex h-12 items-center border-b border-sidebar-border px-4',
        collapsed && 'justify-center px-2'
      )}>
        {!collapsed ? (
          <span className="text-sm font-semibold tracking-tight">Cobalt</span>
        ) : (
          <span className="text-sm font-bold tracking-tight">C</span>
        )}
      </div>

      {/* 工作区选择器 */}
      <div className={cn(
        'border-b border-sidebar-border px-2 py-2',
        collapsed && 'flex justify-center py-2'
      )}>
        <WorkspaceSelector collapsed={collapsed} />
      </div>

      {/* 导航区域 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navGroups.map((group, index) => (
          <div key={index}>
            {group.items.map((item) => renderNavItem(item))}
            {index < navGroups.length - 1 && (
              <Separator className="my-3 bg-sidebar-border/50" />
            )}
          </div>
        ))}
      </nav>

      {/* 底部操作区域 */}
      <div className={cn(
        'border-t border-sidebar-border p-2 space-y-0.5',
        collapsed && 'flex flex-col items-center'
      )}>
        {/* 主题切换 - 极简按钮样式 */}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={toggleTheme}
          className={cn(
            'h-9 rounded-sm hover:bg-sidebar-item-hover',
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

        {/* 折叠按钮 */}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'h-9 rounded-sm hover:bg-sidebar-item-hover',
            collapsed && 'w-10 h-10'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2 text-sm">收起</span>
            </>
          )}
        </Button>

        {/* 版本号和检查更新 */}
        {version && (
          <div className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground pt-1.5 pb-0.5',
            collapsed ? 'flex-col px-0 gap-1' : 'justify-between px-3'
          )}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{collapsed ? `v${version.split('.')[0]}` : `v${version}`}</span>
              {!collapsed && (
                <span className="text-muted-foreground/70">
                  {ccVersion ? `CC ${ccVersion}` : 'CC --'}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-sm hover:bg-sidebar-item-hover"
              onClick={() => checkForUpdate(version)}
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
