import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Toaster } from '@/components/ui/sonner';
import Sidebar from './Sidebar';
import UpdateChecker from '@/components/UpdateChecker';
import { resolvedThemeAtom } from '@/store/uiAtoms';

export default function Layout() {
  const resolvedTheme = useAtomValue(resolvedThemeAtom);

  // 应用主题到 document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
