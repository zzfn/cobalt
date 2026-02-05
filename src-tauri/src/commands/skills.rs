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
    pub target_tools: Vec<String>,
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

/// 从远程仓库安装 Skill
#[tauri::command]
pub fn install_skill_from_repo(repo_url: String) -> Result<String, String> {
    use std::process::Command;

    println!("🔧 [Backend] 开始安装 Skill");
    println!("📦 [Backend] 仓库 URL: {}", repo_url);

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

    // 获取 commit hash
    println!("🔍 [Backend] 获取 commit hash...");
    let commit_hash = Command::new("git")
        .args(&["-C", temp_dir.to_str().unwrap(), "rev-parse", "HEAD"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string());

    if let Some(ref hash) = commit_hash {
        println!("✅ [Backend] Commit hash: {}", hash);
    }

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
    let installed_skills = install_skills_from_dir(&source_dir, &skills_dir, &repo_url, commit_hash.as_deref())?;

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

/// 从目录中扫描并安装 skills
fn install_skills_from_dir(
    source_dir: &PathBuf,
    target_skills_dir: &PathBuf,
    repo_url: &str,
    commit_hash: Option<&str>,
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

        install_single_skill(source_dir, target_skills_dir, skill_name, repo_url, commit_hash)?;
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
                        println!("📦 [Backend] 发现 skill: {}", skill_name);
                        match install_single_skill(&path, target_skills_dir, skill_name, repo_url, commit_hash) {
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
    commit_hash: Option<&str>,
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
        meta.commit_hash = commit_hash.map(|s| s.to_string());
    } else {
        metadata = Some(SkillMetadata {
            name: skill_name.to_string(),
            version: None,
            description: None,
            tags: Vec::new(),
            target_tools: Vec::new(),
            repository: Some(repo_url.to_string()),
            commit_hash: commit_hash.map(|s| s.to_string()),
        });
    }

    // 添加到注册表
    let mut registry = read_skill_registry()
        .map_err(|e| format!("读取注册表失败: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    registry.skills.push(SkillRegistryEntry {
        id: skill_name.to_string(),
        name: skill_name.to_string(),
        description: metadata.as_ref().and_then(|m| m.description.clone()),
        enabled: true,
        source: "remote".to_string(),
        installed_at: Some(now),
        metadata,
    });

    write_skill_registry(registry)
        .map_err(|e| format!("写入注册表失败: {}", e))?;

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
fn parse_skill_frontmatter(content: &str, default_name: &str) -> Option<SkillMetadata> {
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
        commit_hash: None,
    })
}
