// Skill 市场状态管理
import { atom } from 'jotai';
import type { MarketplaceSource, MarketplaceCache } from '@/types/marketplace';

/**
 * 市场源列表
 */
export const marketplaceListAtom = atom<MarketplaceSource[]>([]);

/**
 * 当前选中的市场源
 */
export const selectedMarketplaceAtom = atom<MarketplaceSource | null>(null);

/**
 * 市场缓存映射 (sourceId -> MarketplaceCache)
 */
export const marketplaceCachesAtom = atom<Record<string, MarketplaceCache>>({});

/**
 * 市场加载状态
 */
export const marketplaceLoadingAtom = atom<boolean>(false);

/**
 * 市场错误信息
 */
export const marketplaceErrorAtom = atom<string | null>(null);

/**
 * 刷新中的市场源 ID 集合
 */
export const refreshingMarketplaceAtom = atom<Set<string>>(new Set<string>());
