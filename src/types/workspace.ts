// 工作区类型定义

/**
 * 工作区数据结构
 */
export interface Workspace {
  /** 工作区唯一标识 */
  id: string;
  /** 工作区名称 */
  name: string;
  /** 工作区路径 */
  path: string;
  /** 工作区图标（可选） */
  icon?: string;
  /** 工作区颜色标签（可选） */
  color?: string;
  /** 最后打开时间 */
  lastOpened: string;
  /** 创建时间 */
  createdAt: string;
  /** 工作区中的 skill 数量 */
  skillCount: number;
  /** 是否有 .claude 配置目录 */
  hasClaudeConfig: boolean;
}

/**
 * 工作区配置
 */
export interface WorkspaceConfig {
  /** 当前工作区 ID */
  currentWorkspace: string | null;
  /** 最近工作区显示数量限制 */
  recentLimit: number;
  /** 工作区列表 */
  workspaces: Workspace[];
}

/**
 * 工作区范围类型
 */
export type WorkspaceScope = 'global' | 'project';

/**
 * 工作区更新参数
 */
export interface UpdateWorkspaceParams {
  workspaceId: string;
  name?: string;
  color?: string;
  icon?: string;
}
