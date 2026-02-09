// Skills 服务 - 封装 Tauri 后端调用
import { invoke } from '@tauri-apps/api/core';
import type { SkillRegistryEntry, SkillDetail, SkillUpdateCheckResult } from '@/types/skills';

/**
 * 解析格式化的 skill 字符串
 * 例如: "name: commit-work description: \"Create high-quality...\""
 */
function parseSkillField(value: string | undefined): string {
  if (!value) return '';

  // 匹配格式: name: xxx description: "yyy" 或 description: "xxx"
  const nameMatch = value.match(/name:\s*(\S+?)(?:\s+description:|$)/);
  const descMatch = value.match(/description:\s*"([^"]*)"|description:\s*(\S+)/);

  if (nameMatch) {
    return nameMatch[1];
  }
  if (descMatch) {
    return descMatch[1] || descMatch[2];
  }

  // 如果没有匹配到格式，直接返回原值
  return value;
}

// 后端返回的 Skill 注册表条目类型
interface BackendSkillEntry {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  installedBy?: string[];
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
  installedBy?: string[];
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
  const parsedName = parseSkillField(entry.name);
  const parsedDesc = parseSkillField(entry.description || entry.metadata?.description);

  return {
    id: entry.id,
    name: parsedName,
    description: parsedDesc,
    enabled: entry.enabled,
    installedBy: entry.installedBy as any,
    url: entry.metadata?.repository,
    metadata: {
      name: entry.metadata?.name || entry.name,
      version: entry.metadata?.version || '0.0.0',
      description: entry.metadata?.description || entry.description || '',
      tags: entry.metadata?.tags || [],
      targetTools: entry.metadata?.targetTools as any,
      repository: entry.metadata?.repository,
    },
  };
}

// 转换后端详情为前端类型
function toSkillDetail(detail: BackendSkillDetail): SkillDetail {
  const parsedName = parseSkillField(detail.name);
  const parsedDesc = parseSkillField(detail.description || detail.metadata?.description);

  return {
    id: detail.id,
    name: parsedName,
    description: parsedDesc,
    enabled: detail.enabled,
    installedBy: detail.installedBy as any,
    url: detail.metadata?.repository,
    content: detail.content,
    files: detail.files,
    metadata: {
      name: detail.metadata?.name || detail.name,
      version: detail.metadata?.version || '0.0.0',
      description: detail.metadata?.description || detail.description || '',
      tags: detail.metadata?.tags || [],
      targetTools: detail.metadata?.targetTools as any,
      repository: detail.metadata?.repository,
    },
  };
}

/**
 * 获取所有已安装的 Skills
 * @param workspacePath 可选的工作区路径，如果提供则获取工作区的 skills
 */
export async function listInstalledSkills(workspacePath?: string | null): Promise<SkillRegistryEntry[]> {
  const skills = await invoke<BackendSkillEntry[]>('list_installed_skills', {
    workspacePath: workspacePath ?? null,
  });
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
 * 读取 Skill 中的指定文件内容
 */
export async function readSkillFile(skillName: string, filePath: string): Promise<string> {
  return invoke<string>('read_skill_file', { skillName, filePath });
}

/**
 * 扫描远程仓库中的 Skills（不安装）
 */
export async function scanRepoSkills(repoUrl: string): Promise<import('@/types/skills').ScannedSkillInfo[]> {
  console.log('🔍 [Service] scanRepoSkills 被调用');
  console.log('📦 [Service] 仓库 URL:', repoUrl);

  try {
    const result = await invoke<import('@/types/skills').ScannedSkillInfo[]>('scan_repo_skills', { repoUrl });
    console.log('✅ [Service] 扫描成功:', result);
    return result;
  } catch (error) {
    console.error('❌ [Service] 扫描失败:', error);
    throw error;
  }
}

/**
 * 从远程仓库安装 Skill（支持选择性安装和选择目标工具）
 */
export async function installSkillFromRepo(
  repoUrl: string,
  skillNames?: string[],
  targetTools?: string[],
  workspacePath?: string | null
): Promise<string> {
  console.log('📡 [Service] installSkillFromRepo 被调用');
  console.log('📦 [Service] 仓库 URL:', repoUrl);
  console.log('📝 [Service] 指定安装:', skillNames);
  console.log('🎯 [Service] 目标工具:', targetTools);
  console.log('📁 [Service] 工作区路径:', workspacePath);

  try {
    const result = await invoke<string>('install_skill_from_repo', {
      repoUrl,
      skillNames,
      targetTools: targetTools || null,
      workspacePath: workspacePath ?? null
    });
    console.log('✅ [Service] 安装成功:', result);
    return result;
  } catch (error) {
    console.error('❌ [Service] 安装失败:', error);
    throw error;
  }
}

/**
 * 创建新 Skill 的参数
 */
export interface CreateSkillParams {
  name: string;
  description?: string;
  userInvocable?: boolean;
  allowedTools?: string;
  argumentHint?: string;
  template?: 'basic' | 'tool-calling' | 'agent';
}

/**
 * 创建新 Skill
 */
export async function createSkill(params: CreateSkillParams): Promise<string> {
  return invoke<string>('create_skill', { params });
}

/**
 * 检查 Skill 是否有更新
 */
export async function checkSkillUpdate(skillName: string): Promise<SkillUpdateCheckResult> {
  return invoke<SkillUpdateCheckResult>('check_skill_update', { skillName });
}

/**
 * 更新 Skill 到最新版本
 */
export async function updateSkill(skillName: string): Promise<string> {
  return invoke<string>('update_skill', { skillName });
}

/**
 * 设置 Skill 的仓库地址
 */
export async function setSkillRepository(skillName: string, repository: string): Promise<void> {
  return invoke<void>('set_skill_repository', { skillName, repository });
}

/**
 * 将已安装的 Skill 应用到其他 AI 工具
 */
export async function applySkillToTools(skillName: string, targetTools: string[]): Promise<string> {
  return invoke<string>('apply_skill_to_tools', { skillName, targetTools });
}

/**
 * 从指定的 AI 工具中移除 Skill
 */
export async function removeSkillFromTools(skillName: string, tools: string[]): Promise<string> {
  return invoke<string>('remove_skill_from_tools', { skillName, tools });
}
