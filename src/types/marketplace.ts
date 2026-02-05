// Skill 市场类型定义

export interface MarketplaceSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  tags: string[];
  description?: string;
  priority: number;
  lastRefreshed?: string;
  skillCount: number;
  autoUpdate: boolean;
  isCustom: boolean; // 标记是否为用户自定义的数据源
}

export interface MarketplaceSettings {
  autoRefreshInterval: number;
  enableAutoUpdate: boolean;
}

export interface MarketplaceConfig {
  version: string;
  sources: MarketplaceSource[];
  settings: MarketplaceSettings;
}

export interface CachedSkillInfo {
  name: string;
  version?: string;
  description?: string;
  tags: string[];
  targetTools: string[];
  installed: boolean;
  installedVersion?: string;
  hasUpdate: boolean;
}

export interface MarketplaceCache {
  sourceId: string;
  url: string;
  scannedAt: string;
  skills: CachedSkillInfo[];
}

export interface AddMarketplaceParams {
  name: string;
  url: string;
  tags?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface UpdateMarketplaceParams {
  sourceId: string;
  name?: string;
  tags?: string[];
  description?: string;
  priority?: number;
  [key: string]: unknown;
}
