import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import Sidebar from './Sidebar';
import UpdateChecker from '@/components/UpdateChecker';
import ErrorBoundary from '@/components/ErrorBoundary';
import { resolvedThemeAtom, systemPrefersDarkAtom } from '@/store/uiAtoms';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useMarketplaceInit } from '@/hooks/useMarketplaceInit';

export default function Layout() {
  const resolvedTheme = useAtomValue(resolvedThemeAtom);
  const setSystemPrefersDark = useSetAtom(systemPrefersDarkAtom);

  // 初始化市场数据源
  useMarketplaceInit();

  // 监听系统主题变化
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [setSystemPrefersDark]);

  // 应用主题到 document 和窗口
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 更新 Tauri 窗口背景色
    const updateWindowTheme = async () => {
      try {
        const window = getCurrentWindow();
        await invoke('set_window_theme', {
          window,
          theme: resolvedTheme,
        });
      } catch (error) {
        console.error('Failed to update window theme:', error);
      }
    };

    updateWindowTheme();
  }, [resolvedTheme]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {/* Figma 风格：内容区使用极浅灰背景与侧边栏区分 */}
      <main className="flex-1 overflow-y-auto bg-content-area">
        <div className="container mx-auto p-8">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <Toaster />
      <UpdateChecker />
    </div>
  );
}
