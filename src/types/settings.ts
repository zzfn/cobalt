// Claude 设置相关类型定义

/**
 * Claude 全局设置（UI 应用设置）
 */
export interface ClaudeSettings {
  // 通用设置
  theme: 'light' | 'dark' | 'system';
  language: string;

  // API 设置
  apiKey?: string;
  apiEndpoint?: string;

  // 编辑器设置
  editorFontSize: number;
  editorTabSize: number;
  editorWordWrap: boolean;

  // 其他设置
  autoSave: boolean;
  autoSaveInterval: number;
}

/**
 * Claude Code settings.json 配置
 */
export interface ClaudeCodeSettings {
  permissions: {
    allow: string[];
    deny: string[];
  };
  apiKeyHelper?: string;
  env: Record<string, string>;
}

/**
 * 配置文件路径
 */
export interface ConfigPaths {
  globalConfig: string;
  projectConfig: string;
  skillsDir: string;
  backupsDir: string;
}

/**
 * 配置备份
 */
export interface ConfigBackup {
  id: string;
  name: string;
  createdAt: string;
  type: 'global' | 'project' | 'skill';
  filePath: string;
  size: number;
}

/**
 * 默认设置
 */
export const defaultSettings: ClaudeSettings = {
  theme: 'system',
  language: 'zh-CN',
  editorFontSize: 14,
  editorTabSize: 2,
  editorWordWrap: true,
  autoSave: true,
  autoSaveInterval: 30000,
};
