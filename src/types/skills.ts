// Skills 相关类型定义

/**
 * 支持的 AI 工具类型
 */
export type AiToolType = 'claude-code' | 'cursor' | 'codex' | 'opencode' | 'antigravity' | 'cobalt';

/**
 * AI 工具元信息
 */
export interface AiToolMeta {
  id: AiToolType;
  name: string;
  displayName: string;
  icon: string;
}

/**
 * AI 工具元数据映射
 */
export const AI_TOOL_META: Record<AiToolType, AiToolMeta> = {
  'claude-code': {
    id: 'claude-code',
    name: 'claude-code',
    displayName: 'Claude Code',
    icon: '🤖',
  },
  'cursor': {
    id: 'cursor',
    name: 'cursor',
    displayName: 'Cursor',
    icon: '⚡',
  },
  'codex': {
    id: 'codex',
    name: 'codex',
    displayName: 'Codex',
    icon: '🔮',
  },
  'opencode': {
    id: 'opencode',
    name: 'opencode',
    displayName: 'OpenCode',
    icon: '🌟',
  },
  'antigravity': {
    id: 'antigravity',
    name: 'antigravity',
    displayName: 'Antigravity',
    icon: '🚀',
  },
  'cobalt': {
    id: 'cobalt',
    name: 'cobalt',
    displayName: 'Cobalt',
    icon: '💎',
  },
};

/**
 * Skill 元数据
 */
export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  targetTools?: AiToolType[];  // 该 Skill 适用的 AI 工具
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
  installedBy?: AiToolType[];  // 记录被哪些 AI 工具安装
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
  installedBy?: AiToolType | 'all';  // 按安装工具过滤
  targetTool?: AiToolType | 'all';  // 按 AI 工具过滤
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
