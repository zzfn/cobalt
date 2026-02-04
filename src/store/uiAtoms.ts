import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// 侧边栏状态
export const sidebarCollapsedAtom = atomWithStorage<boolean>('sidebar-collapsed', false);

// 主题状态
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('theme', 'system');

// 实际应用的主题（考虑系统偏好）
export const resolvedThemeAtom = atom((get) => {
  const theme = get(themeAtom);
  if (theme === 'system') {
    // 检测系统主题偏好
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
});

// Toast 消息队列
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

export const toastMessagesAtom = atom<ToastMessage[]>([]);

// 添加 Toast 消息的 action atom
export const addToastAtom = atom(
  null,
  (get, set, message: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newMessage: ToastMessage = { ...message, id };
    set(toastMessagesAtom, [...get(toastMessagesAtom), newMessage]);

    // 自动移除
    const duration = message.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set(toastMessagesAtom, (prev) => prev.filter((m) => m.id !== id));
      }, duration);
    }
  }
);

// 移除 Toast 消息的 action atom
export const removeToastAtom = atom(null, (_get, set, id: string) => {
  set(toastMessagesAtom, (prev) => prev.filter((m) => m.id !== id));
});

// 全局加载状态
export const globalLoadingAtom = atom<boolean>(false);

// 当前活动页面
export const activePageAtom = atom<string>('/dashboard');
