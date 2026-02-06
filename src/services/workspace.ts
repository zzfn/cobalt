// 工作区服务 - 封装 Tauri 后端调用
import { invoke } from '@tauri-apps/api/core';
import type { Workspace, UpdateWorkspaceParams } from '@/types/workspace';

/**
 * 获取所有工作区列表
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  return invoke<Workspace[]>('list_workspaces');
}

/**
 * 添加工作区
 */
export async function addWorkspace(path: string): Promise<Workspace> {
  return invoke<Workspace>('add_workspace', { path });
}

/**
 * 移除工作区
 */
export async function removeWorkspace(workspaceId: string): Promise<void> {
  return invoke<void>('remove_workspace', { workspaceId });
}

/**
 * 切换工作区
 * @param workspaceId 工作区 ID，传 null 切换到全局
 */
export async function switchWorkspace(workspaceId: string | null): Promise<Workspace | null> {
  return invoke<Workspace | null>('switch_workspace', { workspaceId });
}

/**
 * 获取当前工作区
 */
export async function getCurrentWorkspace(): Promise<Workspace | null> {
  return invoke<Workspace | null>('get_current_workspace');
}

/**
 * 更新工作区信息
 */
export async function updateWorkspace(params: UpdateWorkspaceParams): Promise<Workspace> {
  return invoke<Workspace>('update_workspace', {
    workspaceId: params.workspaceId,
    name: params.name,
    color: params.color,
    icon: params.icon,
  });
}

/**
 * 刷新工作区信息
 */
export async function refreshWorkspace(workspaceId: string): Promise<Workspace> {
  return invoke<Workspace>('refresh_workspace', { workspaceId });
}

/**
 * 初始化工作区的 .claude/skills 目录
 */
export async function initWorkspaceSkillsDir(workspaceId: string): Promise<string> {
  return invoke<string>('init_workspace_skills_dir', { workspaceId });
}
