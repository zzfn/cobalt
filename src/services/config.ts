// 配置服务 - 封装 Tauri 后端调用
import { invoke } from '@tauri-apps/api/core';
import type { ClaudeCodeSettings } from '@/types/settings';

// 后端返回的设置类型
interface BackendSettings {
  permissions: {
    allow: string[];
    deny: string[];
  };
  apiKeyHelper?: string;
  env: Record<string, string>;
}

// 备份信息
export interface BackupInfo {
  path: string;
  timestamp: string;
}

/**
 * 获取 Claude 配置目录路径
 */
export async function getClaudeConfigDir(): Promise<string> {
  return invoke<string>('get_claude_config_dir');
}

/**
 * 读取 settings.json
 */
export async function readSettings(): Promise<ClaudeCodeSettings> {
  const settings = await invoke<BackendSettings>('read_settings');
  return {
    permissions: settings.permissions || { allow: [], deny: [] },
    apiKeyHelper: settings.apiKeyHelper,
    env: settings.env || {},
  };
}

/**
 * 写入 settings.json
 */
export async function writeSettings(settings: ClaudeCodeSettings): Promise<void> {
  await invoke('write_settings', { settings });
}

/**
 * 读取 CLAUDE.md（全局指令）
 */
export async function readClaudeMd(): Promise<string> {
  return invoke<string>('read_claude_md');
}

/**
 * 写入 CLAUDE.md（全局指令）
 */
export async function writeClaudeMd(content: string): Promise<void> {
  await invoke('write_claude_md', { content });
}

/**
 * 备份配置
 */
export async function backupConfig(): Promise<BackupInfo> {
  return invoke<BackupInfo>('backup_config');
}
