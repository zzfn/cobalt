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
    pub repository: Option<String>,
    #[serde(default)]
    pub commit_hash: Option<String>,
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
    pub source: String,
    #[serde(default)]
    pub installed_at: Option<String>,
    #[serde(default)]
    pub metadata: Option<SkillMetadata>,
}

/// Skill 注册表
#[derive(Debug, Serialize, Deserialize, Default)]
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
    pub source: String,
    pub content: String,
    pub metadata: Option<SkillMetadata>,
    pub files: Vec<String>,
}

/// 读取 Skill 的 SKILL.md 内容
#[tauri::command]
pub fn read_skill_md(skill_name: String) -> Result<SkillDetail, String> {
    let skills_dir = get_skills_dir()?;
    let skill_dir = skills_dir.join(&skill_name);

    if !skill_dir.exists() {
        return Err(format!("Skill '{}' 不存在", skill_name));
    }

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

    // 从注册表获取状态
    let registry = read_skill_registry()?;
    let entry = registry.skills.iter().find(|s| s.name == skill_name);

    Ok(SkillDetail {
        id: entry.map(|e| e.id.clone()).unwrap_or_else(|| skill_name.clone()),
        name: skill_name,
        description: metadata.as_ref().and_then(|m| m.description.clone()),
        enabled: entry.map(|e| e.enabled).unwrap_or(true),
        source: entry.map(|e| e.source.clone()).unwrap_or_else(|| "local".to_string()),
        content,
        metadata,
        files,
    })
}

/// 内部函数：列出 skill 目录下的文件
fn list_skill_files_internal(skill_dir: &PathBuf) -> Result<Vec<String>, String> {
    let mut files = Vec::new();

    let entries = fs::read_dir(skill_dir)
        .map_err(|e| format!("读取 skill 目录失败: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name() {
                    files.push(name.to_string_lossy().to_string());
                }
            }
        }
    }

    files.sort();
    Ok(files)
}

/// 列出 Skill 包含的文件
#[tauri::command]
pub fn list_skill_files(skill_name: String) -> Result<Vec<String>, String> {
    let skill_dir = get_skills_dir()?.join(&skill_name);

    if !skill_dir.exists() {
        return Err(format!("Skill '{}' 不存在", skill_name));
    }

    list_skill_files_internal(&skill_dir)
}

/// 启用/禁用 Skill
#[tauri::command]
pub fn toggle_skill(skill_name: String, enabled: bool) -> Result<(), String> {
    let mut registry = read_skill_registry()?;

    let skill = registry
        .skills
        .iter_mut()
        .find(|s| s.name == skill_name)
        .ok_or_else(|| format!("Skill '{}' 未在注册表中找到", skill_name))?;

    skill.enabled = enabled;

    write_skill_registry(registry)
}

/// 卸载 Skill
#[tauri::command]
pub fn uninstall_skill(skill_name: String) -> Result<(), String> {
    let skills_dir = get_skills_dir()?;
    let skill_dir = skills_dir.join(&skill_name);

    // 删除 skill 目录
    if skill_dir.exists() {
        fs::remove_dir_all(&skill_dir).map_err(|e| format!("删除 skill 目录失败: {}", e))?;
    }

    // 从注册表中移除
    let mut registry = read_skill_registry()?;
    registry.skills.retain(|s| s.name != skill_name);
    write_skill_registry(registry)?;

    Ok(())
}

/// 获取所有已安装的 Skills（扫描目录）
#[tauri::command]
pub fn list_installed_skills() -> Result<Vec<SkillRegistryEntry>, String> {
    let skills_dir = get_skills_dir()?;

    if !skills_dir.exists() {
        return Ok(Vec::new());
    }

    let mut skills = Vec::new();
    let registry = read_skill_registry()?;

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

                    if let Some(entry) = existing {
                        skills.push(entry.clone());
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
                            source: "local".to_string(),
                            installed_at: None,
                            metadata,
                        });
                    }
                }
            }
        }
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(skills)
}
