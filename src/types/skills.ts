// Skills 相关类型定义

/**
 * 支持的 AI 工具类型
 */
export type AiToolType = 'claude-code' | 'cursor' | 'codex' | 'opencode' | 'antigravity' | 'droid';

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
 * 从后端获取的 AI 工具信息
 */
export interface AiToolInfo {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  relativePath: string;  // 相对路径，如 ".claude/skills/"
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
  'droid': {
    id: 'droid',
    name: 'droid',
    displayName: 'Droid',
    icon: '🦾',
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
  repository?: string;  // 仓库 URL
  sourceId?: string;  // 市场源 ID
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
  files?: string[];  // Skill 目录下的所有文件列表
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
 * Skill 清单文件 (.manifest.json)
 */
export interface SkillManifest {
  version: string;
  name: string;
  description?: string;
  /** 仓库 URL，用于更新检测 */
  repository?: string;
  /** 文件列表，包含 hash 和 size */
  files: {
    path: string;
    hash: string;
    size: number;
  }[];
  /** 生成时间 */
  generatedAt: string;
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
 * Skill 更新检查结果
 */
export interface SkillUpdateCheckResult {
  hasUpdate: boolean;
  currentVersion?: string;
  latestVersion?: string;
  /** 是否有仓库信息 */
  hasRepository: boolean;
  /** 是否有清单文件 */
  hasManifest: boolean;
  /** 变更的文件列表 */
  changedFiles?: string[];
  /** 新增的文件列表 */
  newFiles?: string[];
  /** 删除的文件列表 */
  removedFiles?: string[];
  error?: string;
}

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

/**
 * 扫描到的 Skill 信息
 */
export interface ScannedSkillInfo {
  name: string;
  description?: string;
  version?: string;
  alreadyInstalled: boolean;
}

export interface GitAuthInput {
  method: 'https' | 'ssh';
  username?: string;
  secret: string;
}

export interface GitAuthChallenge {
  message: string;
  suggestedMethod: 'https' | 'ssh';
  canUseHttps: boolean;
  canUseSsh: boolean;
}
