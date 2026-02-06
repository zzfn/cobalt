import { atom } from 'jotai';
import type { Workspace } from '@/types/workspace';

// 工作区列表
export const workspacesListAtom = atom<Workspace[]>([]);

// 当前工作区（null 表示全局）
export const currentWorkspaceAtom = atom<Workspace | null>(null);

// 工作区加载状态
export const workspacesLoadingAtom = atom<boolean>(false);

// 工作区错误状态
export const workspacesErrorAtom = atom<string | null>(null);

// 派生 atom：是否在全局模式
export const isGlobalModeAtom = atom((get) => {
  return get(currentWorkspaceAtom) === null;
});

// 派生 atom：当前工作区路径（用于 skills 加载）
export const currentWorkspacePathAtom = atom((get) => {
  const workspace = get(currentWorkspaceAtom);
  return workspace?.path ?? null;
});

// 派生 atom：最近使用的工作区（按最后打开时间排序）
export const recentWorkspacesAtom = atom((get) => {
  const workspaces = get(workspacesListAtom);
  return [...workspaces]
    .sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime())
    .slice(0, 5);
});

// 派生 atom：当前工作区的 skills 目录路径
export const currentSkillsDirAtom = atom((get) => {
  const workspace = get(currentWorkspaceAtom);
  if (workspace) {
    return `${workspace.path}/.claude/skills`;
  }
  return null; // 全局模式返回 null
});
