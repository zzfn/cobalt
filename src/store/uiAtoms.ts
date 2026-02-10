import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// 侧边栏状态
export const sidebarCollapsedAtom = atomWithStorage<boolean>('sidebar-collapsed', false);

// 主题状态
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('theme', 'system');

// 系统主题偏好（用于实时响应系统主题变化）
export const systemPrefersDarkAtom = atom(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
);

// 实际应用的主题（考虑系统偏好）
export const resolvedThemeAtom = atom((get) => {
  const theme = get(themeAtom);
  if (theme === 'system') {
    const prefersDark = get(systemPrefersDarkAtom);
    return prefersDark ? 'dark' : 'light';
  }
  return theme;
});
