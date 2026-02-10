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
