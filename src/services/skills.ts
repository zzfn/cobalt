// Skills 服务 - 封装 Tauri 后端调用
import { invoke } from '@tauri-apps/api/core';
import type { SkillRegistryEntry, SkillDetail } from '@/types/skills';

// 后端返回的 Skill 注册表条目类型
interface BackendSkillEntry {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  source: string;
  installedAt?: string;
  metadata?: {
    name: string;
    version?: string;
    description?: string;
    tags?: string[];
    targetTools?: string[];
    repository?: string;
    commitHash?: string;
  };
}

// 后端返回的 Skill 详情类型
interface BackendSkillDetail {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  source: string;
  content: string;
  metadata?: {
    name: string;
    version?: string;
    description?: string;
    tags?: string[];
    targetTools?: string[];
    repository?: string;
    commitHash?: string;
  };
  files: string[];
}

// 转换后端数据为前端类型
function toSkillRegistryEntry(entry: BackendSkillEntry): SkillRegistryEntry {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description || entry.metadata?.description || '',
    enabled: entry.enabled,
    source: (entry.source as 'local' | 'remote' | 'builtin') || 'local',
    metadata: {
      name: entry.metadata?.name || entry.name,
      version: entry.metadata?.version || '0.0.0',
      description: entry.metadata?.description || entry.description || '',
      tags: entry.metadata?.tags || [],
      targetTools: entry.metadata?.targetTools as any,
    },
  };
}

// 转换后端详情为前端类型
function toSkillDetail(detail: BackendSkillDetail): SkillDetail {
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description || detail.metadata?.description || '',
    enabled: detail.enabled,
    source: (detail.source as 'local' | 'remote' | 'builtin') || 'local',
    content: detail.content,
    metadata: {
      name: detail.metadata?.name || detail.name,
      version: detail.metadata?.version || '0.0.0',
      description: detail.metadata?.description || detail.description || '',
      tags: detail.metadata?.tags || [],
      targetTools: detail.metadata?.targetTools as any,
    },
  };
}

/**
 * 获取所有已安装的 Skills
 */
export async function listInstalledSkills(): Promise<SkillRegistryEntry[]> {
  const skills = await invoke<BackendSkillEntry[]>('list_installed_skills');
  return skills.map(toSkillRegistryEntry);
}

/**
 * 获取 Skill 详情
 */
export async function getSkillDetail(skillName: string): Promise<SkillDetail> {
  const detail = await invoke<BackendSkillDetail>('read_skill_md', {
    skillName,
  });
  return toSkillDetail(detail);
}

/**
 * 启用/禁用 Skill
 */
export async function toggleSkill(
  skillName: string,
  enabled: boolean
): Promise<void> {
  await invoke('toggle_skill', { skillName, enabled });
}

/**
 * 卸载 Skill
 */
export async function uninstallSkill(skillName: string): Promise<void> {
  await invoke('uninstall_skill', { skillName });
}

/**
 * 列出 Skill 文件
 */
export async function listSkillFiles(skillName: string): Promise<string[]> {
  return invoke<string[]>('list_skill_files', { skillName });
}

/**
 * 从远程仓库安装 Skill
 */
export async function installSkillFromRepo(repoUrl: string): Promise<string> {
  console.log('📡 [Service] installSkillFromRepo 被调用');
  console.log('📦 [Service] 仓库 URL:', repoUrl);

  try {
    const result = await invoke<string>('install_skill_from_repo', { repoUrl });
    console.log('✅ [Service] 安装成功:', result);
    return result;
  } catch (error) {
    console.error('❌ [Service] 安装失败:', error);
    throw error;
  }
}
