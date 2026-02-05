// Skills 管理命令
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Claude 配置目录路径
fn get_claude_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".claude"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// Skills 目录路径
fn get_skills_dir() -> Result<PathBuf, String> {
    Ok(get_claude_dir()?.join("skills"))
}

/// 获取所有 AI Tools 的 skills 目录映射
/// 返回 Vec<(tool_name, directory_path)>
/// 目录定义参考 skill-manager 项目
fn get_all_tool_skills_dirs() -> Vec<(&'static str, PathBuf)> {
    let mut dirs = Vec::new();

    if let Some(home) = dirs::home_dir() {
        // Claude Code: ~/.claude/skills/
        dirs.push(("claude-code", home.join(".claude").join("skills")));

        // Antigravity: ~/.gemini/antigravity/global_skills/
        dirs.push(("antigravity", home.join(".gemini").join("antigravity").join("global_skills")));

        // OpenCode: ~/.config/opencode/skills/
        dirs.push(("opencode", home.join(".config").join("opencode").join("skills")));

        // Codex: ~/.codex/skills/
        dirs.push(("codex", home.join(".codex").join("skills")));

        // Cursor: ~/.cursor/skills/
        dirs.push(("cursor", home.join(".cursor").join("skills")));
    }

    dirs
}

/// 扫描指定目录获取所有 skill 名称
fn scan_skills_in_dir(dir: &PathBuf) -> Vec<String> {
    let mut skills = Vec::new();

    if !dir.exists() {
        return skills;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // 检查是否包含 SKILL.md
                if path.join("SKILL.md").exists() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        skills.push(name.to_string());
                    }
                }
            }
        }
    }

    skills
}

/// Skill 元数据
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillMetadata {
    pub name: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub target_tools: Vec<String>,
    #[serde(default)]
    pub repository: Option<String>,
    #[serde(default)]
    pub source_id: Option<String>,
}

/// Skill 注册表条目
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillRegistryEntry {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub installed_by: Vec<String>,  // 记录被哪些 AI 工具安装
    #[serde(default)]
    pub installed_at: Option<String>,
    #[serde(default)]
    pub metadata: Option<SkillMetadata>,
}

/// Skill 注册表
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillRegistry {
    #[serde(default)]
    pub skills: Vec<SkillRegistryEntry>,
}

/// 读取 skill-registry.json
#[tauri::command]
pub fn read_skill_registry() -> Result<SkillRegistry, String> {
    let registry_path = get_skills_dir()?.join("skill-registry.json");

    if !registry_path.exists() {
        return Ok(SkillRegistry::default());
    }

    let content = fs::read_to_string(&registry_path)
        .map_err(|e| format!("读取 skill-registry.json 失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析 skill-registry.json 失败: {}", e))
}

/// 写入 skill-registry.json
#[tauri::command]
pub fn write_skill_registry(registry: SkillRegistry) -> Result<(), String> {
    let skills_dir = get_skills_dir()?;

    // 确保目录存在
    fs::create_dir_all(&skills_dir).map_err(|e| format!("创建 skills 目录失败: {}", e))?;

    let registry_path = skills_dir.join("skill-registry.json");

    let content = serde_json::to_string_pretty(&registry)
        .map_err(|e| format!("序列化 registry 失败: {}", e))?;

    fs::write(&registry_path, content).map_err(|e| format!("写入 skill-registry.json 失败: {}", e))
}

/// Skill 详情
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDetail {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    #[serde(default)]
    pub installed_by: Vec<String>,
    pub content: String,
    pub metadata: Option<SkillMetadata>,
    pub files: Vec<String>,
}

/// 读取 Skill 的 SKILL.md 内容
#[tauri::command]
pub fn read_skill_md(skill_name: String) -> Result<SkillDetail, String> {
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 尝试从两个目录中查找
    let enabled_path = skills_dir.join(&skill_name);
    let disabled_path = disabled_skills_dir.join(&skill_name);

    let (skill_dir, enabled) = if enabled_path.exists() {
        (enabled_path, true)
    } else if disabled_path.exists() {
        (disabled_path, false)
    } else {
        return Err(format!("Skill '{}' 不存在", skill_name));
    };

    // 读取 SKILL.md
    let skill_md_path = skill_dir.join("SKILL.md");
    let content = if skill_md_path.exists() {
        fs::read_to_string(&skill_md_path)
            .map_err(|e| format!("读取 SKILL.md 失败: {}", e))?
    } else {
        String::new()
    };

    // 读取 metadata.json（如果存在）
    let metadata_path = skill_dir.join("metadata.json");
    let metadata: Option<SkillMetadata> = if metadata_path.exists() {
        let meta_content = fs::read_to_string(&metadata_path)
            .map_err(|e| format!("读取 metadata.json 失败: {}", e))?;
        serde_json::from_str(&meta_content).ok()
    } else {
        None
    };

    // 列出文件
    let files = list_skill_files_internal(&skill_dir)?;

    // 从注册表获取 installed_by
    let registry = read_skill_registry()?;
    let entry = registry.skills.iter().find(|s| s.name == skill_name);

    Ok(SkillDetail {
        id: entry.map(|e| e.id.clone()).unwrap_or_else(|| skill_name.clone()),
        name: skill_name,
        description: metadata.as_ref().and_then(|m| m.description.clone()),
        enabled,  // 根据文件位置判断状态
        installed_by: entry.map(|e| e.installed_by.clone()).unwrap_or_else(Vec::new),
        content,
        metadata,
        files,
    })
}

/// 内部函数：列出 skill 目录下的文件（递归）
fn list_skill_files_internal(skill_dir: &PathBuf) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    collect_files_recursive(skill_dir, skill_dir, &mut files)?;
    files.sort();
    Ok(files)
}

/// 递归收集文件
fn collect_files_recursive(
    base_dir: &PathBuf,
    current_dir: &PathBuf,
    files: &mut Vec<String>,
) -> Result<(), String> {
    let entries = fs::read_dir(current_dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            let file_name = entry.file_name();

            // 跳过 .git 目录和隐藏文件
            if let Some(name) = file_name.to_str() {
                if name.starts_with('.') {
                    continue;
                }
            }

            if path.is_dir() {
                // 递归处理子目录
                collect_files_recursive(base_dir, &path, files)?;
            } else if path.is_file() {
                // 计算相对路径
                if let Ok(relative_path) = path.strip_prefix(base_dir) {
                    files.push(relative_path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(())
}

/// 列出 Skill 包含的文件
#[tauri::command]
pub fn list_skill_files(skill_name: String) -> Result<Vec<String>, String> {
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 尝试从两个目录中查找
    let enabled_path = skills_dir.join(&skill_name);
    let disabled_path = disabled_skills_dir.join(&skill_name);

    let skill_dir = if enabled_path.exists() {
        enabled_path
    } else if disabled_path.exists() {
        disabled_path
    } else {
        return Err(format!("Skill '{}' 不存在", skill_name));
    };

    list_skill_files_internal(&skill_dir)
}

/// 读取 Skill 中的指定文件内容
#[tauri::command]
pub fn read_skill_file(skill_name: String, file_path: String) -> Result<String, String> {
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 尝试从两个目录中查找
    let enabled_path = skills_dir.join(&skill_name);
    let disabled_path = disabled_skills_dir.join(&skill_name);

    let skill_dir = if enabled_path.exists() {
        enabled_path
    } else if disabled_path.exists() {
        disabled_path
    } else {
        return Err(format!("Skill '{}' 不存在", skill_name));
    };

    // 构建完整文件路径
    let full_path = skill_dir.join(&file_path);

    // 安全检查：确保文件在 skill 目录内
    if !full_path.starts_with(&skill_dir) {
        return Err("非法的文件路径".to_string());
    }

    // 检查文件是否存在
    if !full_path.exists() {
        return Err(format!("文件 '{}' 不存在", file_path));
    }

    // 读取文件内容
    fs::read_to_string(&full_path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

/// 启用/禁用 Skill（通过移动文件实现）
#[tauri::command]
pub fn toggle_skill(skill_name: String, enabled: bool) -> Result<(), String> {
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 确保禁用目录存在
    fs::create_dir_all(&disabled_skills_dir)
        .map_err(|e| format!("创建 .disabled_skills 目录失败: {}", e))?;

    let source_dir = if enabled {
        // 启用：从 .disabled_skills 移动到 skills
        disabled_skills_dir.join(&skill_name)
    } else {
        // 禁用：从 skills 移动到 .disabled_skills
        skills_dir.join(&skill_name)
    };

    let target_dir = if enabled {
        skills_dir.join(&skill_name)
    } else {
        disabled_skills_dir.join(&skill_name)
    };

    // 检查源目录是否存在
    if !source_dir.exists() {
        return Err(format!(
            "Skill '{}' 不存在于 {} 目录",
            skill_name,
            if enabled { ".disabled_skills" } else { "skills" }
        ));
    }

    // 检查目标目录是否已存在
    if target_dir.exists() {
        return Err(format!(
            "目标位置已存在 skill '{}'",
            skill_name
        ));
    }

    // 移动目录
    fs::rename(&source_dir, &target_dir)
        .map_err(|e| format!("移动 skill 目录失败: {}", e))?;

    Ok(())
}

/// 卸载 Skill
#[tauri::command]
pub fn uninstall_skill(skill_name: String) -> Result<(), String> {
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 尝试从两个目录中删除
    let enabled_path = skills_dir.join(&skill_name);
    let disabled_path = disabled_skills_dir.join(&skill_name);

    let mut deleted = false;

    if enabled_path.exists() {
        fs::remove_dir_all(&enabled_path)
            .map_err(|e| format!("删除 skill 目录失败: {}", e))?;
        deleted = true;
    }

    if disabled_path.exists() {
        fs::remove_dir_all(&disabled_path)
            .map_err(|e| format!("删除 skill 目录失败: {}", e))?;
        deleted = true;
    }

    if !deleted {
        return Err(format!("Skill '{}' 不存在", skill_name));
    }

    // 从注册表中移除
    let mut registry = read_skill_registry()?;
    registry.skills.retain(|s| s.name != skill_name);
    write_skill_registry(registry)?;

    Ok(())
}

/// 获取所有已安装的 Skills（扫描多个 AI Tools 目录）
#[tauri::command]
pub fn list_installed_skills() -> Result<Vec<SkillRegistryEntry>, String> {
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 首先扫描所有 AI Tools 的目录，建立 skill -> tools 映射
    let tool_dirs = get_all_tool_skills_dirs();
    let mut skill_to_tools: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();

    for (tool_name, tool_dir) in &tool_dirs {
        let tool_skills = scan_skills_in_dir(tool_dir);
        for skill_name in tool_skills {
            skill_to_tools
                .entry(skill_name)
                .or_insert_with(Vec::new)
                .push(tool_name.to_string());
        }
    }

    let mut skills = Vec::new();
    let registry = read_skill_registry()?;

    // 扫描启用的 skills 目录
    if skills_dir.exists() {
        let entries = fs::read_dir(&skills_dir)
            .map_err(|e| format!("读取 skills 目录失败: {}", e))?;

        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(name) = path.file_name() {
                        let skill_name = name.to_string_lossy().to_string();

                        // 跳过 skill-registry.json 所在的目录
                        if skill_name == "skill-registry.json" {
                            continue;
                        }

                        // 从注册表查找或创建新条目
                        let existing = registry.skills.iter().find(|s| s.name == skill_name);

                        // 自动检测该 skill 被哪些 tools 安装
                        let installed_by = skill_to_tools
                            .get(&skill_name)
                            .cloned()
                            .unwrap_or_else(Vec::new);

                        if let Some(entry) = existing {
                            let mut skill_entry = entry.clone();
                            skill_entry.enabled = true;  // 在 skills/ 目录 = 启用
                            // 合并自动检测到的 tools（去重）
                            for tool in installed_by {
                                if !skill_entry.installed_by.contains(&tool) {
                                    skill_entry.installed_by.push(tool);
                                }
                            }
                            skills.push(skill_entry);
                        } else {
                            // 尝试读取 metadata
                            let metadata_path = path.join("metadata.json");
                            let metadata: Option<SkillMetadata> = if metadata_path.exists() {
                                fs::read_to_string(&metadata_path)
                                    .ok()
                                    .and_then(|c| serde_json::from_str(&c).ok())
                            } else {
                                None
                            };

                            skills.push(SkillRegistryEntry {
                                id: skill_name.clone(),
                                name: skill_name.clone(),
                                description: metadata.as_ref().and_then(|m| m.description.clone()),
                                enabled: true,
                                installed_by,
                                installed_at: None,
                                metadata,
                            });
                        }
                    }
                }
            }
        }
    }

    // 扫描禁用的 skills 目录
    if disabled_skills_dir.exists() {
        let entries = fs::read_dir(&disabled_skills_dir)
            .map_err(|e| format!("读取 .disabled_skills 目录失败: {}", e))?;

        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(name) = path.file_name() {
                        let skill_name = name.to_string_lossy().to_string();

                        // 从注册表查找或创建新条目
                        let existing = registry.skills.iter().find(|s| s.name == skill_name);

                        // 自动检测该 skill 被哪些 tools 安装
                        let installed_by = skill_to_tools
                            .get(&skill_name)
                            .cloned()
                            .unwrap_or_else(Vec::new);

                        if let Some(entry) = existing {
                            let mut skill_entry = entry.clone();
                            skill_entry.enabled = false;  // 在 .disabled_skills/ 目录 = 禁用
                            // 合并自动检测到的 tools（去重）
                            for tool in installed_by {
                                if !skill_entry.installed_by.contains(&tool) {
                                    skill_entry.installed_by.push(tool);
                                }
                            }
                            skills.push(skill_entry);
                        } else {
                            // 尝试读取 metadata
                            let metadata_path = path.join("metadata.json");
                            let metadata: Option<SkillMetadata> = if metadata_path.exists() {
                                fs::read_to_string(&metadata_path)
                                    .ok()
                                    .and_then(|c| serde_json::from_str(&c).ok())
                            } else {
                                None
                            };

                            skills.push(SkillRegistryEntry {
                                id: skill_name.clone(),
                                name: skill_name.clone(),
                                description: metadata.as_ref().and_then(|m| m.description.clone()),
                                enabled: false,
                                installed_by,
                                installed_at: None,
                                metadata,
                            });
                        }
                    }
                }
            }
        }
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(skills)
}

/// 扫描仓库中的 Skills 信息（不安装）
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedSkillInfo {
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub already_installed: bool,
}

#[tauri::command]
pub async fn scan_repo_skills(repo_url: String) -> Result<Vec<ScannedSkillInfo>, String> {
    use std::process::Command;

    println!("🔍 [Backend] 开始扫描仓库中的 Skills");
    println!("📦 [Backend] 仓库 URL: {}", repo_url);

    // 从 URL 提取仓库名称
    let repo_name = repo_url
        .trim_end_matches('/')
        .split('/')
        .last()
        .ok_or_else(|| "无效的仓库 URL".to_string())?
        .trim_end_matches(".git");

    // 创建临时目录用于克隆
    let temp_dir = std::env::temp_dir().join(format!("cobalt-skill-scan-{}", repo_name));
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|e| format!("删除临时目录失败: {}", e))?;
    }

    // 克隆仓库到临时目录（浅克隆）
    println!("⏳ [Backend] 开始克隆仓库...");
    let output = Command::new("git")
        .args(&["clone", "--depth", "1", &repo_url, temp_dir.to_str().unwrap()])
        .output()
        .map_err(|e| format!("执行 git clone 失败: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("克隆仓库失败: {}", error));
    }
    println!("✅ [Backend] 仓库克隆成功");

    // 检查是否有 skills 子目录
    let skills_subdir = temp_dir.join("skills");
    let source_dir = if skills_subdir.exists() && skills_subdir.is_dir() {
        println!("✅ [Backend] 发现 skills/ 子目录");
        skills_subdir
    } else {
        println!("📝 [Backend] 未找到 skills/ 子目录，将整个仓库作为单个 skill");
        temp_dir.clone()
    };

    // 扫描 skills
    let scanned_skills = scan_skills_in_directory(&source_dir)?;

    // 清理临时目录
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    if scanned_skills.is_empty() {
        return Err("未找到可安装的 skills".to_string());
    }

    println!("🎉 [Backend] 扫描到 {} 个 skill(s)", scanned_skills.len());
    Ok(scanned_skills)
}

/// 扫描目录中的 skills 信息
fn scan_skills_in_directory(source_dir: &PathBuf) -> Result<Vec<ScannedSkillInfo>, String> {
    let mut skills = Vec::new();
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 检查是否是单个 skill（包含 SKILL.md）
    let skill_md = source_dir.join("SKILL.md");
    if skill_md.exists() {
        println!("📖 [Backend] 发现 SKILL.md，作为单个 skill");
        let skill_name = source_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("skill");

        // 读取 metadata
        let content = fs::read_to_string(&skill_md).ok();
        let metadata = content.and_then(|c| parse_skill_frontmatter(&c, skill_name));

        // 检查是否已安装
        let already_installed = skills_dir.join(skill_name).exists()
            || disabled_skills_dir.join(skill_name).exists();

        skills.push(ScannedSkillInfo {
            name: skill_name.to_string(),
            description: metadata.as_ref().and_then(|m| m.description.clone()),
            version: metadata.as_ref().and_then(|m| m.version.clone()),
            already_installed,
        });
        return Ok(skills);
    }

    // 否则扫描子目录
    println!("🔍 [Backend] 扫描子目录中的 skills...");
    let entries = fs::read_dir(source_dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_dir() {
                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    if let Some(skill_name) = path.file_name().and_then(|n| n.to_str()) {
                        println!("📦 [Backend] 发现 skill: {}", skill_name);

                        // 读取 metadata
                        let content = fs::read_to_string(&skill_md).ok();
                        let metadata = content.and_then(|c| parse_skill_frontmatter(&c, skill_name));

                        // 检查是否已安装
                        let already_installed = skills_dir.join(skill_name).exists()
                            || disabled_skills_dir.join(skill_name).exists();

                        skills.push(ScannedSkillInfo {
                            name: skill_name.to_string(),
                            description: metadata.as_ref().and_then(|m| m.description.clone()),
                            version: metadata.as_ref().and_then(|m| m.version.clone()),
                            already_installed,
                        });
                    }
                }
            }
        }
    }

    Ok(skills)
}

/// 从远程仓库安装 Skill（支持选择性安装）
#[tauri::command]
pub async fn install_skill_from_repo(repo_url: String, skill_names: Option<Vec<String>>) -> Result<String, String> {
    use std::process::Command;

    println!("🔧 [Backend] 开始安装 Skill");
    println!("📦 [Backend] 仓库 URL: {}", repo_url);
    if let Some(ref names) = skill_names {
        println!("📝 [Backend] 指定安装: {:?}", names);
    }

    let skills_dir = get_skills_dir()?;
    println!("📁 [Backend] Skills 目录: {:?}", skills_dir);

    // 确保 skills 目录存在
    fs::create_dir_all(&skills_dir).map_err(|e| {
        let err = format!("创建 skills 目录失败: {}", e);
        eprintln!("❌ [Backend] {}", err);
        err
    })?;

    // 从 URL 提取仓库名称
    let repo_name = repo_url
        .trim_end_matches('/')
        .split('/')
        .last()
        .ok_or_else(|| {
            let err = "无效的仓库 URL".to_string();
            eprintln!("❌ [Backend] {}", err);
            err
        })?
        .trim_end_matches(".git");

    println!("📝 [Backend] 仓库名称: {}", repo_name);

    // 创建临时目录用于克隆
    let temp_dir = std::env::temp_dir().join(format!("cobalt-skill-{}", repo_name));
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|e| format!("删除临时目录失败: {}", e))?;
    }

    println!("📂 [Backend] 临时目录: {:?}", temp_dir);

    // 克隆仓库到临时目录
    println!("⏳ [Backend] 开始克隆仓库...");
    let output = Command::new("git")
        .args(&["clone", &repo_url, temp_dir.to_str().unwrap()])
        .output()
        .map_err(|e| {
            let err = format!("执行 git clone 失败: {}", e);
            eprintln!("❌ [Backend] {}", err);
            err
        })?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        let err = format!("克隆仓库失败: {}", error);
        eprintln!("❌ [Backend] {}", err);
        return Err(err);
    }
    println!("✅ [Backend] 仓库克隆成功");

    // 检查是否有 skills 子目录
    let skills_subdir = temp_dir.join("skills");
    let source_dir = if skills_subdir.exists() && skills_subdir.is_dir() {
        println!("✅ [Backend] 发现 skills/ 子目录");
        skills_subdir
    } else {
        println!("📝 [Backend] 未找到 skills/ 子目录，将整个仓库作为单个 skill");
        temp_dir.clone()
    };

    // 扫描并安装 skills
    let installed_skills = install_skills_from_dir(&source_dir, &skills_dir, &repo_url, skill_names.as_ref())?;

    // 清理临时目录
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    if installed_skills.is_empty() {
        return Err("未找到可安装的 skills".to_string());
    }

    println!("🎉 [Backend] 成功安装 {} 个 skill(s)", installed_skills.len());
    Ok(format!("成功安装 {} 个 skill: {}", installed_skills.len(), installed_skills.join(", ")))
}

/// 从目录中扫描并安装 skills（支持选择性安装）
fn install_skills_from_dir(
    source_dir: &PathBuf,
    target_skills_dir: &PathBuf,
    repo_url: &str,
    selected_skills: Option<&Vec<String>>,
) -> Result<Vec<String>, String> {
    let mut installed = Vec::new();

    // 检查是否是单个 skill（包含 SKILL.md）
    let skill_md = source_dir.join("SKILL.md");
    if skill_md.exists() {
        println!("📖 [Backend] 发现 SKILL.md，作为单个 skill 安装");
        let skill_name = source_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("skill");

        // 如果指定了要安装的 skills，检查是否包含当前 skill
        if let Some(selected) = selected_skills {
            if !selected.contains(&skill_name.to_string()) {
                println!("⏭️  [Backend] 跳过未选中的 skill: {}", skill_name);
                return Ok(installed);
            }
        }

        install_single_skill(source_dir, target_skills_dir, skill_name, repo_url)?;
        installed.push(skill_name.to_string());
        return Ok(installed);
    }

    // 否则扫描子目录
    println!("🔍 [Backend] 扫描子目录中的 skills...");
    let entries = fs::read_dir(source_dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_dir() {
                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    if let Some(skill_name) = path.file_name().and_then(|n| n.to_str()) {
                        // 如果指定了要安装的 skills，检查是否包含当前 skill
                        if let Some(selected) = selected_skills {
                            if !selected.contains(&skill_name.to_string()) {
                                println!("⏭️  [Backend] 跳过未选中的 skill: {}", skill_name);
                                continue;
                            }
                        }

                        println!("📦 [Backend] 发现 skill: {}", skill_name);
                        match install_single_skill(&path, target_skills_dir, skill_name, repo_url) {
                            Ok(_) => {
                                installed.push(skill_name.to_string());
                            }
                            Err(e) => {
                                eprintln!("⚠️  [Backend] 安装 {} 失败: {}", skill_name, e);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(installed)
}

/// 安装单个 skill
fn install_single_skill(
    source_path: &PathBuf,
    target_skills_dir: &PathBuf,
    skill_name: &str,
    repo_url: &str,
) -> Result<(), String> {
    let target_dir = target_skills_dir.join(skill_name);

    // 检查是否已存在
    if target_dir.exists() {
        println!("⚠️  [Backend] Skill '{}' 已存在，跳过", skill_name);
        return Err(format!("Skill '{}' 已存在", skill_name));
    }

    // 复制目录
    copy_dir_recursive(source_path, &target_dir)
        .map_err(|e| format!("复制目录失败: {}", e))?;

    // 解析 SKILL.md 的 frontmatter
    let skill_md_path = target_dir.join("SKILL.md");
    let mut metadata: Option<SkillMetadata> = None;

    if skill_md_path.exists() {
        if let Ok(content) = fs::read_to_string(&skill_md_path) {
            metadata = parse_skill_frontmatter(&content, skill_name);
            if metadata.is_some() {
                println!("✅ [Backend] 成功解析 {} 的 frontmatter", skill_name);
            }
        }
    }

    // 如果没有从 SKILL.md 解析到 metadata，尝试读取 metadata.json
    if metadata.is_none() {
        let metadata_path = target_dir.join("metadata.json");
        if metadata_path.exists() {
            metadata = fs::read_to_string(&metadata_path)
                .ok()
                .and_then(|c| serde_json::from_str(&c).ok());
        }
    }

    // 更新 metadata
    if let Some(ref mut meta) = metadata {
        meta.repository = Some(repo_url.to_string());
    } else {
        metadata = Some(SkillMetadata {
            name: skill_name.to_string(),
            version: None,
            description: None,
            tags: Vec::new(),
            target_tools: Vec::new(),
            repository: Some(repo_url.to_string()),
            source_id: None,
        });
    }

    // 添加到注册表
    let mut registry = read_skill_registry()
        .map_err(|e| format!("读取注册表失败: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    // 检查是否已存在该 skill
    if let Some(existing) = registry.skills.iter_mut().find(|s| s.name == skill_name) {
        // 已存在，更新安装工具列表
        if !existing.installed_by.contains(&"claude-code".to_string()) {
            existing.installed_by.push("claude-code".to_string());
        }
        existing.installed_at = Some(now);
        if metadata.is_some() {
            existing.metadata = metadata;
        }
    } else {
        // 新安装
        registry.skills.push(SkillRegistryEntry {
            id: skill_name.to_string(),
            name: skill_name.to_string(),
            description: metadata.as_ref().and_then(|m| m.description.clone()),
            enabled: true,
            installed_by: vec!["claude-code".to_string()],
            installed_at: Some(now),
            metadata,
        });
    }

    write_skill_registry(registry)
        .map_err(|e| format!("写入注册表失败: {}", e))?;

    // 生成清单文件
    let manifest = generate_skill_manifest(&target_dir, Some(repo_url))?;
    write_skill_manifest(&target_dir, &manifest)?;

    println!("✅ [Backend] Skill '{}' 安装成功", skill_name);
    Ok(())
}

/// 递归复制目录
fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("创建目录失败: {}", e))?;

    let entries = fs::read_dir(src).map_err(|e| format!("读取源目录失败: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            let file_name = entry.file_name();

            // 跳过 .git 目录
            if file_name == ".git" {
                continue;
            }

            let dst_path = dst.join(&file_name);

            if path.is_dir() {
                copy_dir_recursive(&path, &dst_path)?;
            } else {
                fs::copy(&path, &dst_path).map_err(|e| format!("复制文件失败: {}", e))?;
            }
        }
    }

    Ok(())
}

/// 解析 SKILL.md 的 frontmatter
pub fn parse_skill_frontmatter(content: &str, default_name: &str) -> Option<SkillMetadata> {
    use regex::Regex;

    // 匹配 YAML frontmatter: ---\n...\n---
    let re = Regex::new(r"(?s)^---\s*\n(.*?)\n---").ok()?;
    let caps = re.captures(content)?;
    let frontmatter = caps.get(1)?.as_str();

    // 解析 YAML
    let yaml: serde_yaml::Value = serde_yaml::from_str(frontmatter).ok()?;

    let name = yaml.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(default_name)
        .to_string();

    let description = yaml.get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let version = yaml.get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tags = yaml.get("tags")
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    // 解析 allowed-tools 字段
    let target_tools = yaml.get("allowed-tools")
        .and_then(|v| v.as_str())
        .map(|s| {
            s.split(',')
                .map(|t| t.trim().to_string())
                .collect()
        })
        .unwrap_or_default();

    Some(SkillMetadata {
        name,
        version,
        description,
        tags,
        target_tools,
        repository: None,
        source_id: None,
    })
}

/// 创建 Skill 的参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSkillParams {
    pub name: String,
    pub description: Option<String>,
    pub user_invocable: Option<bool>,
    pub allowed_tools: Option<String>,
    pub argument_hint: Option<String>,
    pub template: Option<String>, // "basic", "tool-calling", "agent"
}

/// 创建新 Skill
#[tauri::command]
pub fn create_skill(params: CreateSkillParams) -> Result<String, String> {
    let skills_dir = get_skills_dir()?;
    let skill_dir = skills_dir.join(&params.name);

    // 检查是否已存在
    if skill_dir.exists() {
        return Err(format!("Skill '{}' 已存在", params.name));
    }

    // 创建目录
    fs::create_dir_all(&skill_dir)
        .map_err(|e| format!("创建 skill 目录失败: {}", e))?;

    // 生成 SKILL.md 内容
    let skill_content = generate_skill_md(&params)?;

    // 写入 SKILL.md
    let skill_md_path = skill_dir.join("SKILL.md");
    fs::write(&skill_md_path, skill_content)
        .map_err(|e| format!("写入 SKILL.md 失败: {}", e))?;

    // 生成清单文件
    let manifest = generate_skill_manifest(&skill_dir, None)?;
    write_skill_manifest(&skill_dir, &manifest)?;

    // 添加到注册表
    let mut registry = read_skill_registry()?;
    let now = chrono::Utc::now().to_rfc3339();

    registry.skills.push(SkillRegistryEntry {
        id: params.name.clone(),
        name: params.name.clone(),
        description: params.description.clone(),
        enabled: true,
        installed_by: vec!["claude-code".to_string()],
        installed_at: Some(now),
        metadata: Some(SkillMetadata {
            name: params.name.clone(),
            version: Some("0.1.0".to_string()),
            description: params.description,
            tags: Vec::new(),
            target_tools: Vec::new(),
            repository: None,
            source_id: None,
        }),
    });

    write_skill_registry(registry)?;

    Ok(format!("Skill '{}' 创建成功", params.name))
}

/// 生成 SKILL.md 内容
fn generate_skill_md(params: &CreateSkillParams) -> Result<String, String> {
    let template = params.template.as_deref().unwrap_or("basic");

    // 生成 frontmatter
    let mut frontmatter = format!("---\nname: {}\n", params.name);
    if let Some(desc) = &params.description {
        frontmatter.push_str(&format!("description: {}\n", desc));
    }
    if let Some(invocable) = params.user_invocable {
        frontmatter.push_str(&format!("user-invocable: {}\n", invocable));
    }
    if let Some(tools) = &params.allowed_tools {
        frontmatter.push_str(&format!("allowed-tools: {}\n", tools));
    }
    if let Some(hint) = &params.argument_hint {
        frontmatter.push_str(&format!("argument-hint: {}\n", hint));
    }
    frontmatter.push_str("---\n\n");

    // 根据模板生成内容
    let content = match template {
        "basic" => generate_basic_template(&params.name),
        "tool-calling" => generate_tool_calling_template(&params.name),
        "agent" => generate_agent_template(&params.name),
        _ => generate_basic_template(&params.name),
    };

    Ok(format!("{}{}", frontmatter, content))
}

/// 生成基础模板
fn generate_basic_template(name: &str) -> String {
    format!(r#"# {}

## 描述

这是一个新创建的 Skill。

## 使用方法

调用此 Skill：
```
/{} [参数]
```

## 功能

- 功能 1
- 功能 2
- 功能 3
"#, name, name)
}

/// 生成工具调用模板
fn generate_tool_calling_template(name: &str) -> String {
    format!(r#"# {}

## 描述

这是一个工具调用型 Skill，可以使用 Claude Code 的工具。

## 可用工具

- Read：读取文件
- Write：写入文件
- Bash：执行命令
- Grep：搜索内容
- Glob：查找文件

## 使用方法

```
/{} [参数]
```
"#, name, name)
}

/// 计算文件的 SHA256 hash
fn calculate_file_hash(path: &PathBuf) -> Result<String, String> {
    use sha2::{Sha256, Digest};
    use std::io::Read;

    let mut file = fs::File::open(path)
        .map_err(|e| format!("打开文件失败: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file.read(&mut buffer)
            .map_err(|e| format!("读取文件失败: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

/// 为 skill 生成清单文件
fn generate_skill_manifest(skill_dir: &PathBuf, repo_url: Option<&str>) -> Result<SkillManifest, String> {
    let mut manifest = SkillManifest::default();
    let skill_md_path = skill_dir.join("SKILL.md");

    // 尝试从 SKILL.md 解析 frontmatter
    if skill_md_path.exists() {
        if let Ok(content) = fs::read_to_string(&skill_md_path) {
            if let Some(metadata) = parse_skill_frontmatter(&content, "") {
                manifest.name = metadata.name;
                manifest.version = metadata.version.unwrap_or_else(|| "0.1.0".to_string());
                manifest.description = metadata.description;
            }
        }
    }

    // 如果无法解析，使用目录名
    if manifest.name.is_empty() {
        manifest.name = skill_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
    }

    if manifest.version.is_empty() {
        manifest.version = "0.1.0".to_string();
    }

    manifest.repository = repo_url.map(|s| s.to_string());
    manifest.generated_at = chrono::Utc::now().to_rfc3339();

    // 计算所有文件的 hash
    let mut files = Vec::new();
    collect_file_hashes(skill_dir, skill_dir, &mut files)?;
    manifest.files = files;

    Ok(manifest)
}

/// 递归收集文件 hash
fn collect_file_hashes(
    base_dir: &PathBuf,
    current_dir: &PathBuf,
    files: &mut Vec<SkillFileInfo>,
) -> Result<(), String> {
    let entries = fs::read_dir(current_dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = entry.file_name();

        // 跳过 .git 目录、隐藏文件和 .manifest.json
        if let Some(name) = file_name.to_str() {
            if name.starts_with('.') || name == ".manifest.json" {
                continue;
            }
        }

        if path.is_dir() {
            collect_file_hashes(base_dir, &path, files)?;
        } else if path.is_file() {
            if let Ok(relative_path) = path.strip_prefix(base_dir) {
                let relative = relative_path.to_string_lossy().to_string();
                if let Ok(hash) = calculate_file_hash(&path) {
                    let metadata = fs::metadata(&path)
                        .map_err(|e| format!("获取文件元数据失败: {}", e))?;
                    files.push(SkillFileInfo {
                        path: relative,
                        hash,
                        size: metadata.len(),
                    });
                }
            }
        }
    }

    Ok(())
}

/// 读取 skill 的清单文件
fn read_skill_manifest(skill_dir: &PathBuf) -> Option<SkillManifest> {
    let manifest_path = skill_dir.join(".manifest.json");
    if manifest_path.exists() {
        fs::read_to_string(&manifest_path)
            .ok()
            .and_then(|c| serde_json::from_str(&c).ok())
    } else {
        None
    }
}

/// 写入 skill 的清单文件
fn write_skill_manifest(skill_dir: &PathBuf, manifest: &SkillManifest) -> Result<(), String> {
    let manifest_path = skill_dir.join(".manifest.json");
    let content = serde_json::to_string_pretty(manifest)
        .map_err(|e| format!("序列化清单失败: {}", e))?;
    fs::write(&manifest_path, content)
        .map_err(|e| format!("写入清单文件失败: {}", e))
}

/// 生成代理模板
fn generate_agent_template(name: &str) -> String {
    format!(r#"# {}

## 描述

这是一个代理型 Skill，可以启动子代理执行复杂任务。

## 配置

- context: fork
- agent: general-purpose
- allowed-tools: Read, Write, Bash, Grep, Glob

## 使用方法

```
/{} [任务描述]
```
"#, name, name)
}

/// Skill 文件信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillFileInfo {
    pub path: String,
    pub hash: String,
    pub size: u64,
}

/// Skill 清单文件
#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SkillManifest {
    pub version: String,
    pub name: String,
    pub description: Option<String>,
    pub repository: Option<String>,
    pub files: Vec<SkillFileInfo>,
    pub generated_at: String,
}

/// Skill 更新检查结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUpdateCheckResult {
    pub has_update: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_version: Option<String>,
    /// 是否有仓库信息
    pub has_repository: bool,
    /// 是否有清单文件
    pub has_manifest: bool,
    /// 变更的文件列表
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changed_files: Option<Vec<String>>,
    /// 新增的文件列表
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_files: Option<Vec<String>>,
    /// 删除的文件列表
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removed_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// 检查 Skill 是否有更新（基于文件 hash 对比）
#[tauri::command]
pub async fn check_skill_update(skill_name: String) -> Result<SkillUpdateCheckResult, String> {
    use std::process::Command;

    println!("🔍 [Backend] 检查 Skill '{}' 的更新", skill_name);

    // 获取 skill 目录
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");
    let skill_dir = if skills_dir.join(&skill_name).exists() {
        skills_dir.join(&skill_name)
    } else if disabled_skills_dir.join(&skill_name).exists() {
        disabled_skills_dir.join(&skill_name)
    } else {
        return Err(format!("Skill '{}' 不存在", skill_name));
    };

    // 读取注册表获取 skill 信息
    let registry = read_skill_registry()?;
    let entry = registry
        .skills
        .iter()
        .find(|s| s.name == skill_name)
        .cloned();

    // 获取 repository URL - 优先从注册表，然后尝试读取 .manifest.json，最后尝试 SKILL.md
    let repo_url = entry
        .as_ref()
        .and_then(|e| e.metadata.as_ref())
        .and_then(|m| m.repository.clone())
        .or_else(|| {
            // 尝试从 .manifest.json 读取
            read_skill_manifest(&skill_dir).and_then(|m| m.repository)
        })
        .or_else(|| {
            // 尝试从 SKILL.md 的 frontmatter 读取
            let skill_md = skill_dir.join("SKILL.md");
            if skill_md.exists() {
                fs::read_to_string(&skill_md)
                    .ok()
                    .and_then(|content| parse_skill_frontmatter(&content, ""))
                    .and_then(|m| m.repository)
            } else {
                None
            }
        });

    let current_version = entry
        .as_ref()
        .and_then(|e| e.metadata.as_ref())
        .and_then(|m| m.version.clone());

    // 如果没有仓库信息，返回提示
    let repo_url = match repo_url {
        Some(url) => url,
        None => {
            return Ok(SkillUpdateCheckResult {
                has_update: false,
                current_version,
                latest_version: None,
                has_repository: false,
                has_manifest: false,
                changed_files: None,
                new_files: None,
                removed_files: None,
                error: Some("该 Skill 没有配置仓库信息。请创建 .manifest.json 文件并添加 repository 字段。".to_string()),
            });
        }
    };

    // 读取本地清单文件
    let local_manifest = read_skill_manifest(&skill_dir);

    // 创建临时目录用于克隆远程仓库
    let temp_dir = std::env::temp_dir().join(format!("cobalt-skill-check-{}", skill_name));
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 克隆仓库（浅克隆，只获取最新版本）
    println!("📡 [Backend] 克隆远程仓库: {}", repo_url);
    let output = Command::new("git")
        .args(&["clone", "--depth", "1", &repo_url, temp_dir.to_str().unwrap()])
        .output()
        .map_err(|e| format!("执行 git clone 失败: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Ok(SkillUpdateCheckResult {
            has_update: false,
            current_version,
            latest_version: None,
            has_repository: true,
            has_manifest: local_manifest.is_some(),
            changed_files: None,
            new_files: None,
            removed_files: None,
            error: Some(format!("克隆远程仓库失败: {}", error)),
        });
    }

    // 确定远程 skill 目录
    let remote_skill_dir = if temp_dir.join("skills").exists() {
        let skills_subdir = temp_dir.join("skills");
        // 查找与当前 skill 同名的目录
        let target = skills_subdir.join(&skill_name);
        if target.exists() {
            target
        } else {
            // 尝试查找包含 SKILL.md 的子目录（允许名称差异）
            let entries = fs::read_dir(&skills_subdir)
                .map_err(|e| format!("读取 skills 子目录失败: {}", e))?;
            let mut found = None;
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && path.join("SKILL.md").exists() {
                    // 检查是否匹配（允许 skill-name 和 skill_name 的差异）
                    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if name.replace("-", "_") == skill_name.replace("-", "_") {
                        found = Some(path);
                        break;
                    }
                }
            }
            // 如果在 skills/ 子目录中找不到，返回错误
            match found {
                Some(path) => path,
                None => {
                    let _ = fs::remove_dir_all(&temp_dir);
                    return Ok(SkillUpdateCheckResult {
                        has_update: false,
                        current_version,
                        latest_version: None,
                        has_repository: true,
                        has_manifest: local_manifest.is_some(),
                        changed_files: None,
                        new_files: None,
                        removed_files: None,
                        error: Some(format!("在仓库的 skills/ 目录中找不到 skill '{}'", skill_name)),
                    });
                }
            }
        }
    } else if temp_dir.join("SKILL.md").exists() {
        // 整个仓库就是一个 skill
        temp_dir.clone()
    } else {
        // 既没有 skills 子目录，也不是单个 skill
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok(SkillUpdateCheckResult {
            has_update: false,
            current_version,
            latest_version: None,
            has_repository: true,
            has_manifest: local_manifest.is_some(),
            changed_files: None,
            new_files: None,
            removed_files: None,
            error: Some(format!("仓库中找不到 skill '{}'", skill_name)),
        });
    };

    // 生成远程清单
    println!("📋 [Backend] 生成远程清单，目录: {:?}", remote_skill_dir);
    let remote_manifest = generate_skill_manifest(&remote_skill_dir, Some(&repo_url)).ok();

    // 对比本地和远程清单
    println!("🔍 [Backend] 对比本地和远程清单");
    println!("   本地清单: {:?}", local_manifest.as_ref().map(|m| format!("version={}, files={}", m.version, m.files.len())));
    println!("   远程清单: {:?}", remote_manifest.as_ref().map(|m| format!("version={}, files={}", m.version, m.files.len())));
    let comparison_result = compare_manifests(local_manifest.as_ref(), remote_manifest.as_ref());

    // 清理临时目录
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    Ok(SkillUpdateCheckResult {
        has_update: comparison_result.has_changes,
        current_version,
        latest_version: remote_manifest.as_ref().map(|m| m.version.clone()),
        has_repository: true,
        has_manifest: local_manifest.is_some(),
        changed_files: Some(comparison_result.changed),
        new_files: Some(comparison_result.new),
        removed_files: Some(comparison_result.removed),
        error: None,
    })
}

/// 清单对比结果
struct ManifestComparison {
    has_changes: bool,
    changed: Vec<String>,
    new: Vec<String>,
    removed: Vec<String>,
}

/// 对比两个清单
fn compare_manifests(
    local: Option<&SkillManifest>,
    remote: Option<&SkillManifest>,
) -> ManifestComparison {
    let mut result = ManifestComparison {
        has_changes: false,
        changed: Vec::new(),
        new: Vec::new(),
        removed: Vec::new(),
    };

    let local_files: std::collections::HashMap<&str, &str> = local
        .map(|m| m.files.iter().map(|f| (f.path.as_str(), f.hash.as_str())).collect())
        .unwrap_or_default();

    let remote_files: std::collections::HashMap<&str, &str> = remote
        .map(|m| m.files.iter().map(|f| (f.path.as_str(), f.hash.as_str())).collect())
        .unwrap_or_default();

    // 检查变更和新增的文件
    for (path, remote_hash) in &remote_files {
        match local_files.get(*path) {
            Some(local_hash) => {
                if local_hash != remote_hash {
                    result.changed.push(path.to_string());
                }
            }
            None => {
                result.new.push(path.to_string());
            }
        }
    }

    // 检查删除的文件
    for path in local_files.keys() {
        if !remote_files.contains_key(*path) {
            result.removed.push(path.to_string());
        }
    }

    result.has_changes = !result.changed.is_empty() || !result.new.is_empty() || !result.removed.is_empty();
    result
}

/// 更新 Skill 到最新版本
#[tauri::command]
pub async fn update_skill(skill_name: String) -> Result<String, String> {
    use std::process::Command;

    println!("🔄 [Backend] 开始更新 Skill '{}'", skill_name);

    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 确定 skill 当前位置
    let is_enabled = skills_dir.join(&skill_name).exists();
    let skill_dir = if is_enabled {
        skills_dir.join(&skill_name)
    } else {
        disabled_skills_dir.join(&skill_name)
    };

    if !skill_dir.exists() {
        return Err(format!("Skill '{}' 目录不存在", skill_name));
    }

    // 读取注册表
    let mut registry = read_skill_registry()?;
    let entry = registry
        .skills
        .iter()
        .find(|s| s.name == skill_name)
        .cloned();

    // 获取 repository URL - 优先从注册表，然后从 .manifest.json，最后从 SKILL.md
    let repo_url = entry
        .as_ref()
        .and_then(|e| e.metadata.as_ref())
        .and_then(|m| m.repository.clone())
        .or_else(|| {
            // 尝试从 .manifest.json 读取
            read_skill_manifest(&skill_dir).and_then(|m| m.repository)
        })
        .or_else(|| {
            // 尝试从 SKILL.md 的 frontmatter 读取
            let skill_md = skill_dir.join("SKILL.md");
            if skill_md.exists() {
                fs::read_to_string(&skill_md)
                    .ok()
                    .and_then(|content| parse_skill_frontmatter(&content, ""))
                    .and_then(|m| m.repository)
            } else {
                None
            }
        })
        .ok_or_else(|| format!("Skill '{}' 没有仓库信息", skill_name))?;

    // 备份当前 skill
    let backup_dir = skill_dir.with_extension(".backup");
    if backup_dir.exists() {
        let _ = fs::remove_dir_all(&backup_dir);
    }

    println!("📦 [Backend] 备份当前版本到: {:?}", backup_dir);
    copy_dir_recursive(&skill_dir, &backup_dir)
        .map_err(|e| format!("备份失败: {}", e))?;

    // 创建临时目录用于克隆
    let temp_dir = std::env::temp_dir().join(format!("cobalt-skill-update-{}", skill_name));
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 克隆仓库
    println!("⏳ [Backend] 克隆仓库...");
    let output = Command::new("git")
        .args(&["clone", &repo_url, temp_dir.to_str().unwrap()])
        .output()
        .map_err(|e| format!("执行 git clone 失败: {}", e))?;

    if !output.status.success() {
        let _ = fs::remove_dir_all(&backup_dir);
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("克隆仓库失败: {}", error));
    }

    // 检查是否有 skills 子目录
    let skills_subdir = temp_dir.join("skills");
    let source_dir = if skills_subdir.exists() && skills_subdir.is_dir() {
        // 在 skills/ 子目录中查找
        let skill_subdir = skills_subdir.join(&skill_name);
        if skill_subdir.exists() {
            skill_subdir
        } else {
            // 查找包含 SKILL.md 的子目录
            let entries = fs::read_dir(&skills_subdir)
                .map_err(|e| format!("读取 skills 子目录失败: {}", e))?;
            let mut found = None;
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && path.join("SKILL.md").exists() {
                    // 检查是否匹配（允许 skill-name 和 skill_name 的差异）
                    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if name.replace("-", "_") == skill_name.replace("-", "_") {
                        found = Some(path);
                        break;
                    }
                }
            }
            // 如果在 skills/ 子目录中找不到，返回错误而不是回退到整个仓库
            found.ok_or_else(|| format!("在仓库的 skills/ 目录中找不到 skill '{}'", skill_name))?
        }
    } else if temp_dir.join("SKILL.md").exists() {
        // 整个仓库就是一个 skill
        temp_dir.clone()
    } else {
        // 既没有 skills 子目录，也不是单个 skill
        let _ = fs::remove_dir_all(&backup_dir);
        let _ = fs::remove_dir_all(&temp_dir);
        return Err(format!("仓库中找不到 skill '{}'", skill_name));
    };

    // 删除旧版本
    println!("🗑️  [Backend] 删除旧版本...");
    fs::remove_dir_all(&skill_dir)
        .map_err(|e| format!("删除旧版本失败: {}", e))?;

    // 复制新版本
    println!("📋 [Backend] 复制新版本...");
    if let Err(e) = copy_dir_recursive(&source_dir, &skill_dir) {
        // 恢复备份
        let _ = copy_dir_recursive(&backup_dir, &skill_dir);
        let _ = fs::remove_dir_all(&backup_dir);
        return Err(format!("复制新版本失败: {}", e));
    }

    // 生成新的清单文件
    let new_manifest = generate_skill_manifest(&skill_dir, Some(&repo_url))?;
    write_skill_manifest(&skill_dir, &new_manifest)?;

    // 更新注册表中的版本信息
    if let Some(entry) = registry.skills.iter_mut().find(|s| s.name == skill_name) {
        // 更新已有条目
        if let Some(ref mut meta) = entry.metadata {
            meta.version = Some(new_manifest.version.clone());
            meta.repository = Some(repo_url.clone());
        }
    } else {
        // 添加新条目
        let now = chrono::Utc::now().to_rfc3339();
        registry.skills.push(SkillRegistryEntry {
            id: skill_name.clone(),
            name: skill_name.clone(),
            description: new_manifest.description.clone(),
            enabled: is_enabled,
            installed_by: vec!["claude-code".to_string()],
            installed_at: Some(now),
            metadata: Some(SkillMetadata {
                name: skill_name.clone(),
                version: Some(new_manifest.version.clone()),
                description: new_manifest.description.clone(),
                tags: Vec::new(),
                target_tools: Vec::new(),
                repository: Some(repo_url.clone()),
                source_id: None,
            }),
        });
    }

    write_skill_registry(registry)?;

    // 清理临时文件
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }
    if backup_dir.exists() {
        let _ = fs::remove_dir_all(&backup_dir);
    }

    println!("✅ [Backend] Skill '{}' 更新成功", skill_name);
    Ok("成功更新到最新版本".to_string())
}

/// 设置 Skill 的仓库地址
#[tauri::command]
pub fn set_skill_repository(skill_name: String, repository: String) -> Result<(), String> {
    println!("📝 [Backend] 设置 Skill '{}' 的仓库地址: {}", skill_name, repository);

    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 确定 skill 目录
    let skill_dir = if skills_dir.join(&skill_name).exists() {
        skills_dir.join(&skill_name)
    } else if disabled_skills_dir.join(&skill_name).exists() {
        disabled_skills_dir.join(&skill_name)
    } else {
        return Err(format!("Skill '{}' 不存在", skill_name));
    };

    // 读取或创建清单文件
    let mut manifest = read_skill_manifest(&skill_dir).unwrap_or_else(|| {
        // 如果没有清单文件，尝试生成一个
        generate_skill_manifest(&skill_dir, None).unwrap_or_default()
    });

    // 更新仓库地址
    manifest.repository = Some(repository.clone());

    // 写入清单文件
    write_skill_manifest(&skill_dir, &manifest)?;

    // 同时更新注册表
    let mut registry = read_skill_registry()?;
    if let Some(entry) = registry.skills.iter_mut().find(|s| s.name == skill_name) {
        // 更新已有条目
        if let Some(ref mut meta) = entry.metadata {
            meta.repository = Some(repository.clone());
        } else {
            entry.metadata = Some(SkillMetadata {
                name: skill_name.clone(),
                version: Some(manifest.version.clone()),
                description: manifest.description.clone(),
                tags: Vec::new(),
                target_tools: Vec::new(),
                repository: Some(repository.clone()),
                source_id: None,
            });
        }
    } else {
        // 添加新条目
        let now = chrono::Utc::now().to_rfc3339();
        registry.skills.push(SkillRegistryEntry {
            id: skill_name.clone(),
            name: skill_name.clone(),
            description: manifest.description.clone(),
            enabled: skills_dir.join(&skill_name).exists(),
            installed_by: vec!["claude-code".to_string()],
            installed_at: Some(now),
            metadata: Some(SkillMetadata {
                name: skill_name.clone(),
                version: Some(manifest.version.clone()),
                description: manifest.description.clone(),
                tags: Vec::new(),
                target_tools: Vec::new(),
                repository: Some(repository.clone()),
                source_id: None,
            }),
        });
    }
    write_skill_registry(registry)?;

    println!("✅ [Backend] 仓库地址设置成功");
    Ok(())
}
