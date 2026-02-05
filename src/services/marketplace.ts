// Skill 市场服务层
import { invoke } from '@tauri-apps/api/core';
import type {
  MarketplaceSource,
  MarketplaceCache,
  AddMarketplaceParams,
  UpdateMarketplaceParams,
} from '@/types/marketplace';

/**
 * 列出所有市场源
 */
export async function listMarketplace(): Promise<MarketplaceSource[]> {
  return invoke('list_marketplace');
}

/**
 * 添加市场源
 */
export async function addMarketplace(params: AddMarketplaceParams): Promise<MarketplaceSource> {
  return invoke('add_marketplace', params);
}

/**
 * 删除市场源
 */
export async function removeMarketplace(sourceId: string): Promise<void> {
  return invoke('remove_marketplace', { sourceId });
}

/**
 * 启用/禁用市场源
 */
export async function toggleMarketplace(sourceId: string, enabled: boolean): Promise<void> {
  return invoke('toggle_marketplace', { sourceId, enabled });
}

/**
 * 更新市场源信息
 */
export async function updateMarketplace(params: UpdateMarketplaceParams): Promise<MarketplaceSource> {
  return invoke('update_marketplace', params);
}

/**
 * 刷新单个市场源
 */
export async function refreshMarketplace(sourceId: string): Promise<MarketplaceCache> {
  return invoke('refresh_marketplace', { sourceId });
}

/**
 * 刷新所有市场源
 */
export async function refreshAllMarketplace(): Promise<MarketplaceCache[]> {
  return invoke('refresh_all_marketplace');
}

/**
 * 获取市场源的 Skills（从缓存）
 */
export async function getMarketplaceSkills(sourceId: string): Promise<MarketplaceCache> {
  return invoke('get_marketplace_skills', { sourceId });
}

/**
 * 从市场源安装 Skills
 */
export async function installSkillFromMarketplace(
  sourceId: string,
  skillNames: string[]
): Promise<string> {
  return invoke('install_skill_from_marketplace', { sourceId, skillNames });
}
