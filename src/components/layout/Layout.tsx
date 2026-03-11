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
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto bg-content-area/35">
        <div className="relative mx-auto max-w-[1440px] p-4 md:p-6 xl:p-8">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="panel-surface flex min-h-[420px] items-center justify-center">
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
