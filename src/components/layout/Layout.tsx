import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Toaster } from '@/components/ui/sonner';
import Sidebar from './Sidebar';
import UpdateChecker from '@/components/UpdateChecker';
import { resolvedThemeAtom } from '@/store/uiAtoms';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useMarketplaceInit } from '@/hooks/useMarketplaceInit';

export default function Layout() {
  const resolvedTheme = useAtomValue(resolvedThemeAtom);

  // 初始化市场数据源
  useMarketplaceInit();

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
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
      <Toaster />
      <UpdateChecker />
    </div>
  );
}
