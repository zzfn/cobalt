// 配置服务 - 封装 Tauri 后端调用
import { invoke } from '@tauri-apps/api/core';
import type { ClaudeCodeSettings, ApiKeyProfile } from '@/types/settings';
import type { DashboardStats, ConfigHealth } from '@/types/dashboard';
import { listInstalledSkills } from './skills';

// 后端返回的设置类型
interface BackendSettings {
  permissions: {
    allow: string[];
    deny: string[];
  };
  env: Record<string, string>;
}

// 备份信息
export interface BackupInfo {
  path: string;
  timestamp: string;
}

// API Key 配置档案列表
export interface ApiKeyProfiles {
  profiles: ApiKeyProfile[];
  activeProfileId: string | null;
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

/**
 * 读取 API Key 配置档案
 */
export async function readApiProfiles(): Promise<ApiKeyProfiles> {
  return invoke<ApiKeyProfiles>('read_api_profiles');
}

/**
 * 写入 API Key 配置档案
 */
export async function writeApiProfiles(profiles: ApiKeyProfiles): Promise<void> {
  await invoke('write_api_profiles', { profiles });
}

/**
 * 切换 API Key 配置档案
 */
export async function switchApiProfile(profileId: string): Promise<void> {
  await invoke('switch_api_profile', { profileId });
}

/**
 * 清除 API 配置（使用官方默认）
 */
export async function clearApiConfig(): Promise<void> {
  await invoke('clear_api_config');
}

/**
 * 更新环境变量（部分更新）
 */
export async function updateEnvVars(updates: Record<string, string>): Promise<void> {
  await invoke('update_env_vars', { updates });
}

/**
 * 获取仪表盘统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [skills, settings, profiles] = await Promise.all([
    listInstalledSkills(),
    readSettings(),
    readApiProfiles(),
  ]);

  return {
    skills: {
      total: skills.length,
      enabled: skills.filter(s => s.enabled).length,
      disabled: skills.filter(s => !s.enabled).length,
      bySource: skills.reduce((acc, s) => {
        acc[s.source] = (acc[s.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
    profiles: {
      total: profiles.profiles.length,
      activeId: profiles.activeProfileId,
    },
    config: {
      envVarsCount: Object.keys(settings.env).length,
      permissionsCount: settings.permissions.allow.length + settings.permissions.deny.length,
      hasGlobalInstructions: true,
    },
  };
}

/**
 * 获取配置健康状态
 */
export async function getConfigHealth(): Promise<ConfigHealth> {
  const checks: ConfigHealth['checks'] = {
    settingsJson: { status: 'ok', message: '配置正常' },
    claudeMd: { status: 'ok', message: '全局指令文件存在' },
    apiProfiles: { status: 'ok', message: 'API配置正常' },
  };

  // 简单的健康检查逻辑
  try {
    await readSettings();
  } catch {
    checks.settingsJson = { status: 'error', message: '无法读取设置' };
  }

  try {
    await readClaudeMd();
  } catch {
    checks.claudeMd = { status: 'warning', message: '全局指令文件不存在' };
  }

  try {
    await readApiProfiles();
  } catch {
    checks.apiProfiles = { status: 'error', message: '无法读取API配置' };
  }

  const overall = Object.values(checks).some(c => c.status === 'error')
    ? 'error'
    : Object.values(checks).some(c => c.status === 'warning')
      ? 'warning'
      : 'healthy';

  return { overall, checks };
}
