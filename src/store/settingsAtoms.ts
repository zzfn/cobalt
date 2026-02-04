import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { ClaudeSettings, ConfigPaths, ConfigBackup } from '@/types/settings';
import { defaultSettings } from '@/types/settings';

// 设置状态
export const settingsAtom = atomWithStorage<ClaudeSettings>('claude-settings', defaultSettings);

// 配置路径
export const configPathsAtom = atom<ConfigPaths | null>(null);

// 配置备份列表
export const configBackupsAtom = atom<ConfigBackup[]>([]);

// 设置加载状态
export const settingsLoadingAtom = atom<boolean>(false);

// 设置错误状态
export const settingsErrorAtom = atom<string | null>(null);

// 全局指令内容
export const globalInstructionsAtom = atom<string>('');

// 项目指令内容
export const projectInstructionsAtom = atom<string>('');

// 派生 atom：是否有未保存的更改
export const hasUnsavedChangesAtom = atom<boolean>(false);
