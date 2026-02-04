import { NavLink, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import {
  LayoutDashboard,
  Settings,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Terminal,
  FileJson,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { sidebarCollapsedAtom, themeAtom, resolvedThemeAtom } from '@/store/uiAtoms';

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
    title: '设置',
    href: '/settings',
    icon: Settings,
    children: [
      {
        title: '通用设置',
        href: '/settings/general',
        icon: Settings,
      },
      {
        title: '全局指令',
        href: '/settings/instructions',
        icon: FileText,
      },
      {
        title: 'Claude Code',
        href: '/settings/claude-code',
        icon: Terminal,
      },
      {
        title: 'settings.json',
        href: '/settings/settings-json',
        icon: FileJson,
      },
    ],
  },
  {
    title: 'Skills',
    href: '/skills',
    icon: Sparkles,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [resolvedTheme] = useAtom(resolvedThemeAtom);
  const location = useLocation();

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
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = hasChildren && location.pathname.startsWith(item.href);

    return (
      <div key={item.href}>
        <NavLink
          to={hasChildren ? item.children![0].href : item.href}
          className={({ isActive: linkActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              (linkActive || isActive) && 'bg-accent text-accent-foreground',
              collapsed && 'justify-center px-2',
              depth > 0 && !collapsed && 'ml-4'
            )
          }
        >
          <item.icon className={cn('h-4 w-4 shrink-0', collapsed && 'h-5 w-5')} />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
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

      {/* 导航 */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => renderNavItem(item))}
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
      </div>
    </aside>
  );
}
