// Skills 相关类型定义

/**
 * Skill 元数据
 */
export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Skill 注册表条目
 */
export interface SkillRegistryEntry {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  source: 'local' | 'remote' | 'builtin';
  path?: string;
  url?: string;
  metadata: SkillMetadata;
}

/**
 * Skill 详情
 */
export interface SkillDetail extends SkillRegistryEntry {
  content: string;
  readme?: string;
  dependencies?: string[];
  examples?: SkillExample[];
}

/**
 * Skill 示例
 */
export interface SkillExample {
  title: string;
  description?: string;
  input: string;
  output?: string;
}

/**
 * Skill 过滤器
 */
export interface SkillFilter {
  search?: string;
  source?: 'all' | 'local' | 'remote' | 'builtin';
  enabled?: boolean;
  tags?: string[];
}

/**
 * Skill 排序选项
 */
export type SkillSortOption = 'name' | 'updatedAt' | 'createdAt';

/**
 * Skill 列表状态
 */
export interface SkillListState {
  items: SkillRegistryEntry[];
  filter: SkillFilter;
  sortBy: SkillSortOption;
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  error?: string;
}
