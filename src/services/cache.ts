// 缓存管理服务
import { invoke } from '@tauri-apps/api/core';

export interface CacheItem {
  size_bytes: number;
  file_count: number;
  path: string;
}

export interface CacheInfo {
  conversations: CacheItem;
  backups: CacheItem;
  marketplace: CacheItem;
}

export interface ClearCacheResult {
  cleared_bytes: number;
  cleared_files: number;
}

export interface ClearConversationResult {
  clearedFiles: number;
  clearedBytes: number;
  affectedProjects: string[];
}

export interface MessagePreview {
  role: string;
  contentPreview: string;
  timestamp: string;
}

export interface ConversationFile {
  sessionId: string;
  fileName: string;
  fileSize: number;
  modifiedTime: string;
  messagePreview: MessagePreview[];
}

export interface ProjectConversationInfo {
  projectName: string;
  projectPath: string;
  fileCount: number;
  totalSize: number;
  files: ConversationFile[];
}

/**
 * 获取各类缓存信息
 */
export async function getCacheInfo(): Promise<CacheInfo> {
  return invoke<CacheInfo>('get_cache_info');
}

/**
 * 按类型清理缓存
 */
export async function clearCache(cacheType: string): Promise<ClearCacheResult> {
  return invoke<ClearCacheResult>('clear_cache', { cacheType });
}

/**
 * 获取对话记录详情
 */
export async function getConversationDetails(): Promise<ProjectConversationInfo[]> {
  return invoke<ProjectConversationInfo[]>('get_conversation_details');
}

/**
 * 清理对话记录
 * @param projectName 项目名称，不传则清理所有
 * @param sessionId 会话 ID，不传则清理项目下的所有会话
 */
export async function clearConversation(projectName?: string, sessionId?: string): Promise<ClearConversationResult> {
  return invoke<ClearConversationResult>('clear_conversation', { projectName, sessionId });
}
