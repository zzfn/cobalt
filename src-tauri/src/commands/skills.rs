// Skills 管理命令
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

const AUTH_REQUIRED_PREFIX: &str = "COBALT_AUTH_REQUIRED:";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitAuthInput {
    pub method: String, // "https" | "ssh"
    pub username: Option<String>, // 仅 https 需要
    pub secret: String, // PAT 或 SSH passphrase
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GitAuthChallenge {
    pub message: String,
    pub suggested_method: String,
    pub can_use_https: bool,
    pub can_use_ssh: bool,
}

/// 将 HTTPS URL 转换为 SSH URL
/// 例如: https://github.com/user/repo.git -> git@github.com:user/repo.git
fn https_to_ssh_url(url: &str) -> Option<String> {
    // 支持的格式:
    // https://github.com/user/repo
    // https://github.com/user/repo.git
    // https://gitlab.com/user/repo
    // https://git.example.com/user/repo

    let url = url.trim().trim_end_matches('/');

    if !url.starts_with("https://") && !url.starts_with("http://") {
        return None;
    }

    // 移除协议前缀
    let without_protocol = url
        .trim_start_matches("https://")
        .trim_start_matches("http://");

    // 分割 host 和 path
    let parts: Vec<&str> = without_protocol.splitn(2, '/').collect();
    if parts.len() != 2 {
        return None;
    }

    let host = parts[0];
    let path = parts[1].trim_end_matches(".git");

    Some(format!("git@{}:{}.git", host, path))
}

/// 创建 askpass 脚本，用于 GIT_ASKPASS 自动应答凭据
/// 使用随机文件名防止路径可预测（TOCTOU 防护），支持 Unix / Windows
fn create_askpass_script() -> Result<PathBuf, String> {
    let random_id: u64 = {
        use std::collections::hash_map::RandomState;
        use std::hash::{BuildHasher, Hasher};
        let s = RandomState::new();
        let mut h = s.build_hasher();
        h.write_u128(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos(),
        );
        h.finish()
    };

    #[cfg(unix)]
    let path = std::env::temp_dir().join(format!("cobalt-askpass-{}.sh", random_id));
    #[cfg(windows)]
    let path = std::env::temp_dir().join(format!("cobalt-askpass-{}.bat", random_id));

    #[cfg(unix)]
    let script = r#"#!/bin/sh
prompt="$1"
case "$prompt" in
  *sername*) echo "$COBALT_GIT_USERNAME" ;;
  *) echo "$COBALT_GIT_SECRET" ;;
esac
"#;
    #[cfg(windows)]
    let script = r#"@echo off
set "prompt=%~1"
echo %prompt% | findstr /i "sername" >nul && (
    echo %COBALT_GIT_USERNAME%
) || (
    echo %COBALT_GIT_SECRET%
)
"#;

    fs::write(&path, script).map_err(|e| format!("创建 askpass 脚本失败: {}", e))?;
    #[cfg(unix)]
    {
        let perms = fs::Permissions::from_mode(0o700);
        fs::set_permissions(&path, perms).map_err(|e| format!("设置 askpass 权限失败: {}", e))?;
    }
    Ok(path)
}

fn is_auth_related_error(stderr: &str) -> bool {
    let s = stderr.to_lowercase();
    s.contains("authentication failed")
        || s.contains("could not read username")
        || s.contains("terminal prompts disabled")
        || s.contains("permission denied (publickey)")
        || s.contains("passphrase")
        || s.contains("permission denied")
}

fn build_auth_required_error(url: &str, stderr: &str) -> String {
    let is_ssh_issue = stderr.to_lowercase().contains("publickey") || stderr.to_lowercase().contains("passphrase");
    let challenge = GitAuthChallenge {
        message: "仓库需要认证，请输入凭据后重试".to_string(),
        suggested_method: if is_ssh_issue { "ssh".to_string() } else { "https".to_string() },
        can_use_https: url.starts_with("http://") || url.starts_with("https://"),
        can_use_ssh: url.starts_with("git@") || https_to_ssh_url(url).is_some(),
    };

    let payload = serde_json::to_string(&challenge).unwrap_or_else(|_| "{\"message\":\"仓库需要认证\"}".to_string());
    format!("{}{}", AUTH_REQUIRED_PREFIX, payload)
}

fn run_git_clone(url: &str, target_dir: &str, shallow: bool, auth: Option<&GitAuthInput>) -> Result<std::process::Output, String> {
    let mut args = vec!["clone"];
    if shallow {
        args.push("--depth");
        args.push("1");
    }
    args.push(url);
    args.push(target_dir);

    let mut cmd = Command::new("git");
    cmd.args(&args);

    let mut askpass_path: Option<PathBuf> = None;
    if let Some(auth_input) = auth {
        let script_path = create_askpass_script()?;
        cmd.env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_ASKPASS", &script_path)
            .env("SSH_ASKPASS", &script_path)
            .env("SSH_ASKPASS_REQUIRE", "force")
            .env("DISPLAY", "cobalt:0")
            .env("COBALT_GIT_USERNAME", auth_input.username.clone().unwrap_or_else(|| "git".to_string()))
            .env("COBALT_GIT_SECRET", &auth_input.secret);

        if auth_input.method == "ssh" {
            cmd.env("GIT_SSH_COMMAND", "ssh -oBatchMode=no");
        }
        askpass_path = Some(script_path);
    } else {
        cmd.env("GIT_TERMINAL_PROMPT", "0");
    }

    let output = cmd.output().map_err(|e| format!("执行 git clone 失败: {}", e));
    if let Some(path) = askpass_path {
        let _ = fs::remove_file(path);
    }
    output
}

pub fn clone_repo(url: &str, target_dir: &str, shallow: bool, auth: Option<&GitAuthInput>) -> Result<(), String> {
    println!("⏳ [Backend] 开始克隆仓库...");

    if let Some(auth_input) = auth {
        let auth_url = if auth_input.method == "ssh" && !url.starts_with("git@") {
            https_to_ssh_url(url).unwrap_or_else(|| url.to_string())
        } else {
            url.to_string()
        };

        let output = run_git_clone(&auth_url, target_dir, shallow, Some(auth_input))?;
        if output.status.success() {
            println!("✅ [Backend] 认证克隆成功");
            return Ok(());
        }

        let stderr = String::from_utf8_lossy(&output.stderr);
        if is_auth_related_error(&stderr) {
            return Err("认证失败，请检查凭据后重试".to_string());
        }
        return Err(parse_git_clone_error(&stderr));
    }

    // 尝试原始 URL 克隆
    let output = run_git_clone(url, target_dir, shallow, None)?;

    if output.status.success() {
        println!("✅ [Backend] 克隆成功");
        return Ok(());
    }

    let https_error = String::from_utf8_lossy(&output.stderr);
    println!("⚠️  [Backend] HTTPS 克隆失败: {}", https_error.trim());

    // 如果 HTTPS 失败，尝试转换为 SSH URL
    if let Some(ssh_url) = https_to_ssh_url(url) {
        println!("🔄 [Backend] 尝试使用 SSH: {}", ssh_url);

        // 清理可能创建的空目录
        let _ = fs::remove_dir_all(target_dir);

        let ssh_output = run_git_clone(&ssh_url, target_dir, shallow, None)?;

        if ssh_output.status.success() {
            println!("✅ [Backend] SSH 克隆成功");
            return Ok(());
        }

        let ssh_error = String::from_utf8_lossy(&ssh_output.stderr);
        println!("❌ [Backend] SSH 克隆也失败: {}", ssh_error.trim());

        if is_auth_related_error(&https_error) || is_auth_related_error(&ssh_error) {
            return Err(build_auth_required_error(url, &format!("{}\n{}", https_error, ssh_error)));
        }

        return Err(format!(
            "克隆失败:\n• HTTPS: {}\n• SSH: {}\n\n请检查仓库地址是否正确，或配置 SSH 密钥",
            https_error.trim(),
            ssh_error.trim()
        ));
    }

    // 无法转换为 SSH URL，返回 HTTPS 错误
    if is_auth_related_error(&https_error) {
        return Err(build_auth_required_error(url, &https_error));
    }
    Err(parse_git_clone_error(&https_error))
}

/// 解析 git clone 错误，返回用户友好的错误信息
fn parse_git_clone_error(stderr: &str) -> String {
    let stderr_lower = stderr.to_lowercase();

    if stderr_lower.contains("authentication failed")
        || stderr_lower.contains("could not read username")
        || stderr_lower.contains("terminal prompts disabled")
    {
        "仓库需要认证。请确保：\n1. 仓库是公开的，或\n2. 已配置 Git 凭据或 SSH 密钥".to_string()
    } else if stderr_lower.contains("repository not found")
        || stderr_lower.contains("not found")
    {
        "仓库不存在或无访问权限".to_string()
    } else if stderr_lower.contains("could not resolve host") {
        "无法连接到 Git 服务器，请检查网络".to_string()
    } else {
        format!("克隆仓库失败: {}", stderr.trim())
    }
}

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

fn get_cobalt_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".cobalt"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

pub fn get_disabled_skills_dir(workspace_path: Option<&str>) -> Result<PathBuf, String> {
    if let Some(ws_path) = workspace_path {
        Ok(PathBuf::from(ws_path).join(".cobalt").join("skills").join("disabled"))
    } else {
        Ok(get_cobalt_dir()?.join("skills").join("disabled"))
    }
}

pub fn get_legacy_disabled_skills_dir(workspace_path: Option<&str>) -> Result<PathBuf, String> {
    if let Some(ws_path) = workspace_path {
        Ok(PathBuf::from(ws_path).join(".claude").join(".disabled_skills"))
    } else {
        Ok(get_claude_dir()?.join(".disabled_skills"))
    }
}

fn get_disabled_skills_dir_candidates(workspace_path: Option<&str>) -> Result<Vec<PathBuf>, String> {
    Ok(vec![
        get_disabled_skills_dir(workspace_path)?,
        get_legacy_disabled_skills_dir(workspace_path)?,
    ])
}

fn find_existing_disabled_skill_dir(
    skill_name: &str,
    workspace_path: Option<&str>,
) -> Result<Option<PathBuf>, String> {
    for dir in get_disabled_skills_dir_candidates(workspace_path)? {
        let candidate = dir.join(skill_name);
        if candidate.exists() {
            return Ok(Some(candidate));
        }
    }
    Ok(None)
}

fn migrate_disabled_skills_dir(source_dir: &PathBuf, target_dir: &PathBuf) -> Result<(), String> {
    if !source_dir.exists() {
        return Ok(());
    }

    fs::create_dir_all(target_dir).map_err(|e| format!("创建禁用 skills 目录失败: {}", e))?;

    let entries = fs::read_dir(source_dir).map_err(|e| format!("读取旧禁用 skills 目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取旧禁用 skills 条目失败: {}", e))?;
        let legacy_path = entry.path();

        if !legacy_path.is_dir() {
            continue;
        }

        let skill_name = entry.file_name();
        let target_path = target_dir.join(&skill_name);

        if target_path.exists() {
            eprintln!("⚠️  [Backend] 跳过迁移已存在的禁用 Skill: {:?}", target_path);
            continue;
        }

        match fs::rename(&legacy_path, &target_path) {
            Ok(_) => {}
            Err(_) => {
                copy_dir_recursive(&legacy_path, &target_path)?;
                fs::remove_dir_all(&legacy_path)
                    .map_err(|e| format!("清理旧禁用 skills 目录失败: {}", e))?;
            }
        }
    }

    let is_empty = fs::read_dir(source_dir)
        .map_err(|e| format!("读取旧禁用 skills 目录失败: {}", e))?
        .next()
        .is_none();

    if is_empty {
        fs::remove_dir(source_dir).map_err(|e| format!("删除旧禁用 skills 目录失败: {}", e))?;
    }

    Ok(())
}

fn migrate_legacy_disabled_skills_dir(workspace_path: Option<&str>) -> Result<(), String> {
    let disabled_dir = get_disabled_skills_dir(workspace_path)?;
    migrate_disabled_skills_dir(&get_legacy_disabled_skills_dir(workspace_path)?, &disabled_dir)?;

    Ok(())
}

fn get_skill_updates_cache_dir() -> Result<PathBuf, String> {
    Ok(get_cobalt_dir()?.join(".cache").join("skill-updates"))
}

fn get_skill_updates_cache_path(workspace_path: Option<&str>) -> Result<PathBuf, String> {
    let cache_dir = get_skill_updates_cache_dir()?;

    let file_name = if let Some(path) = workspace_path {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(path.as_bytes());
        format!("workspace-{:x}.json", hasher.finalize())
    } else {
        "global.json".to_string()
    };

    Ok(cache_dir.join(file_name))
}

/// 获取工具的相对路径配置
/// 返回 Vec<(tool_name, path_segments)>
pub fn get_tool_relative_paths() -> Vec<(&'static str, &'static [&'static str])> {
    vec![
        ("claude-code", &[".claude", "skills"] as &[&str]),
        ("antigravity", &[".gemini", "antigravity", "global_skills"]),
        ("opencode", &[".config", "opencode", "skills"]),
        ("codex", &[".codex", "skills"]),
        ("cursor", &[".cursor", "skills"]),
        ("droid", &[".factory", "skills"]),
    ]
}

/// 获取所有 AI Tools 的全局 skills 目录映射
fn get_all_tool_skills_dirs() -> Vec<(&'static str, PathBuf)> {
    let mut dirs = Vec::new();

    if let Some(home) = dirs::home_dir() {
        for (tool_name, path_parts) in get_tool_relative_paths() {
            let mut full_path = home.clone();
            for part in path_parts {
                full_path = full_path.join(part);
            }
            dirs.push((tool_name, full_path));
        }
    }

    dirs
}

/// 获取所有 AI Tools 的项目级别 skills 目录映射
/// workspace_path: 工作区路径
/// 返回 Vec<(tool_name, directory_path)>
fn get_all_tool_workspace_skills_dirs(workspace_path: &PathBuf) -> Vec<(&'static str, PathBuf)> {
    let mut dirs = Vec::new();

    for (tool_name, path_parts) in get_tool_relative_paths() {
        let mut full_path = workspace_path.clone();
        for part in path_parts {
            full_path = full_path.join(part);
        }
        dirs.push((tool_name, full_path));
    }

    dirs
}

fn get_tool_skill_dir(tool_name: &str, workspace_path: Option<&str>) -> Result<PathBuf, String> {
    let all_tool_dirs = if let Some(ws_path) = workspace_path {
        get_all_tool_workspace_skills_dirs(&PathBuf::from(ws_path))
    } else {
        get_all_tool_skills_dirs()
    };

    all_tool_dirs
        .into_iter()
        .find(|(name, _)| *name == tool_name)
        .map(|(_, dir)| dir)
        .ok_or_else(|| format!("未知的 AI 工具: {}", tool_name))
}

/// 根据工具名称列表获取对应的 skills 目录（全局）
fn get_target_tool_dirs(tool_names: &Vec<String>) -> Result<Vec<(String, PathBuf)>, String> {
    let all_dirs = get_all_tool_skills_dirs();
    let mut target_dirs = Vec::new();

    for tool_name in tool_names {
        if let Some((_, dir)) = all_dirs.iter().find(|(name, _)| *name == tool_name.as_str()) {
            target_dirs.push((tool_name.clone(), dir.clone()));
        } else {
            return Err(format!("未知的 AI 工具: {}", tool_name));
        }
    }

    if target_dirs.is_empty() {
        return Err("未指定有效的目标工具".to_string());
    }

    Ok(target_dirs)
}

/// 根据工具名称列表获取对应的 skills 目录（工作区级别）
fn get_target_tool_workspace_dirs(tool_names: &Vec<String>, workspace_path: &PathBuf) -> Result<Vec<(String, PathBuf)>, String> {
    let all_dirs = get_all_tool_workspace_skills_dirs(workspace_path);
    let mut target_dirs = Vec::new();

    for tool_name in tool_names {
        if let Some((_, dir)) = all_dirs.iter().find(|(name, _)| *name == tool_name.as_str()) {
            target_dirs.push((tool_name.clone(), dir.clone()));
        } else {
            return Err(format!("未知的 AI 工具: {}", tool_name));
        }
    }

    if target_dirs.is_empty() {
        return Err("未指定有效的目标工具".to_string());
    }

    Ok(target_dirs)
}

/// AI 工具信息
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiToolInfo {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub icon: String,
    pub relative_path: String,  // 相对路径，如 ".claude/skills/"
}

/// 获取所有支持的 AI 工具信息
#[tauri::command]
pub fn get_supported_ai_tools() -> Vec<AiToolInfo> {
    vec![
        AiToolInfo {
            id: "claude-code".to_string(),
            name: "claude-code".to_string(),
            display_name: "Claude Code".to_string(),
            icon: "🤖".to_string(),
            relative_path: ".claude/skills/".to_string(),
        },
        AiToolInfo {
            id: "cursor".to_string(),
            name: "cursor".to_string(),
            display_name: "Cursor".to_string(),
            icon: "⚡".to_string(),
            relative_path: ".cursor/skills/".to_string(),
        },
        AiToolInfo {
            id: "codex".to_string(),
            name: "codex".to_string(),
            display_name: "Codex".to_string(),
            icon: "🔮".to_string(),
            relative_path: ".codex/skills/".to_string(),
        },
        AiToolInfo {
            id: "opencode".to_string(),
            name: "opencode".to_string(),
            display_name: "OpenCode".to_string(),
            icon: "🌟".to_string(),
            relative_path: ".config/opencode/skills/".to_string(),
        },
        AiToolInfo {
            id: "antigravity".to_string(),
            name: "antigravity".to_string(),
            display_name: "Antigravity".to_string(),
            icon: "🚀".to_string(),
            relative_path: ".gemini/antigravity/global_skills/".to_string(),
        },
        AiToolInfo {
            id: "droid".to_string(),
            name: "droid".to_string(),
            display_name: "Droid".to_string(),
            icon: "🦾".to_string(),
            relative_path: ".factory/skills/".to_string(),
        },
    ]
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

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct DisabledSkillState {
    #[serde(default)]
    installed_by: Vec<String>,
    #[serde(default)]
    disabled_at: Option<String>,
}

fn get_disabled_skill_state_path(skill_dir: &PathBuf) -> PathBuf {
    skill_dir.join(".cobalt-state.json")
}

fn write_disabled_skill_state(skill_dir: &PathBuf, state: &DisabledSkillState) -> Result<(), String> {
    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("序列化禁用状态失败: {}", e))?;
    fs::write(get_disabled_skill_state_path(skill_dir), content)
        .map_err(|e| format!("写入禁用状态失败: {}", e))
}

fn read_disabled_skill_state(skill_dir: &PathBuf) -> Result<DisabledSkillState, String> {
    let state_path = get_disabled_skill_state_path(skill_dir);
    if !state_path.exists() {
        return Ok(DisabledSkillState::default());
    }

    let content = fs::read_to_string(&state_path)
        .map_err(|e| format!("读取禁用状态失败: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("解析禁用状态失败: {}", e))
}

fn get_installed_tool_skill_paths(
    skill_name: &str,
    workspace_path: Option<&str>,
) -> Vec<(String, PathBuf)> {
    let all_tool_dirs = if let Some(ws_path) = workspace_path {
        get_all_tool_workspace_skills_dirs(&PathBuf::from(ws_path))
    } else {
        get_all_tool_skills_dirs()
    };

    all_tool_dirs
        .into_iter()
        .filter_map(|(tool_name, tool_dir)| {
            let skill_dir = tool_dir.join(skill_name);
            if skill_dir.exists() {
                Some((tool_name.to_string(), skill_dir))
            } else {
                None
            }
        })
        .collect()
}

fn move_or_copy_skill_dir(source_dir: &PathBuf, target_dir: &PathBuf) -> Result<(), String> {
    if let Some(parent) = target_dir.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    match fs::rename(source_dir, target_dir) {
        Ok(_) => Ok(()),
        Err(_) => {
            copy_dir_recursive(source_dir, target_dir)?;
            fs::remove_dir_all(source_dir).map_err(|e| format!("清理源目录失败: {}", e))
        }
    }
}

fn update_registry_installation_state(
    skill_name: &str,
    enabled: bool,
    installed_by: Vec<String>,
) -> Result<(), String> {
    let mut registry = read_skill_registry()?;
    if let Some(entry) = registry.skills.iter_mut().find(|s| s.name == skill_name) {
        entry.enabled = enabled;
        entry.installed_by = installed_by;
        write_skill_registry(registry)?;
    }
    Ok(())
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
pub fn read_skill_md(skill_name: String, workspace_path: Option<String>) -> Result<SkillDetail, String> {
    let (skill_dir, enabled, found_in_tool) = if let Some(ref ws_path) = workspace_path {
        // 工作区模式：在工作区的 .claude/skills 和 .cobalt/skills/disabled 中查找
        let ws_path_buf = PathBuf::from(ws_path);
        let skills_dir = ws_path_buf.join(".claude").join("skills");

        let enabled_path = skills_dir.join(&skill_name);

        if enabled_path.exists() {
            (enabled_path, true, Some("claude-code".to_string()))
        } else if let Some(disabled_path) = find_existing_disabled_skill_dir(&skill_name, Some(ws_path))? {
            (disabled_path, false, Some("claude-code".to_string()))
        } else {
            return Err(format!("Skill '{}' 不存在", skill_name));
        }
    } else {
        // 全局模式：先在 claude 目录查找，再查找其他工具目录
        let skills_dir = get_skills_dir()?;

        let enabled_path = skills_dir.join(&skill_name);

        // 优先从 claude-code 目录查找
        if enabled_path.exists() {
            (enabled_path, true, Some("claude-code".to_string()))
        } else if let Some(disabled_path) = find_existing_disabled_skill_dir(&skill_name, None)? {
            (disabled_path, false, Some("claude-code".to_string()))
        } else {
            // 在其他工具目录中查找
            let tool_dirs = get_all_tool_skills_dirs();
            let mut found_dir = None;
            let mut found_tool = None;

            for (tool_name, tool_dir) in tool_dirs {
                let tool_skill_path = tool_dir.join(&skill_name);
                if tool_skill_path.exists() {
                    found_dir = Some(tool_skill_path);
                    found_tool = Some(tool_name.to_string());
                    break;
                }
            }

            match found_dir {
                Some(dir) => (dir, true, found_tool),
                None => return Err(format!("Skill '{}' 不存在", skill_name)),
            }
        }
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
    let mut metadata: Option<SkillMetadata> = if metadata_path.exists() {
        let meta_content = fs::read_to_string(&metadata_path)
            .map_err(|e| format!("读取 metadata.json 失败: {}", e))?;
        serde_json::from_str(&meta_content).ok()
    } else {
        None
    };

    // 合并注册表中的 metadata，避免详情页与列表页来源信息不一致
    if workspace_path.is_none() {
        if let Ok(registry) = read_skill_registry() {
            if let Some(entry) = registry.skills.iter().find(|s| s.name == skill_name) {
                if let Some(registry_meta) = &entry.metadata {
                    match metadata.as_mut() {
                        Some(meta) => {
                            if meta.version.is_none() {
                                meta.version = registry_meta.version.clone();
                            }
                            if meta.description.is_none() {
                                meta.description = registry_meta.description.clone();
                            }
                            if meta.tags.is_empty() {
                                meta.tags = registry_meta.tags.clone();
                            }
                            if meta.target_tools.is_empty() {
                                meta.target_tools = registry_meta.target_tools.clone();
                            }
                            if meta.repository.is_none() {
                                meta.repository = registry_meta.repository.clone();
                            }
                            if meta.source_id.is_none() {
                                meta.source_id = registry_meta.source_id.clone();
                            }
                        }
                        None => {
                            metadata = Some(registry_meta.clone());
                        }
                    }
                }
            }
        }
    }

    // 列出文件
    let files = list_skill_files_internal(&skill_dir)?;

    // 计算 installed_by
    let (id, installed_by) = if workspace_path.is_none() {
        // 全局模式：优先使用注册表数据，如果 skill 不在注册表中，使用 found_in_tool
        let registry = read_skill_registry()?;
        let entry = registry.skills.iter().find(|s| s.name == skill_name);

        let installed_by_vec = if let Some(entry) = entry {
            entry.installed_by.clone()
        } else if let Some(tool) = found_in_tool {
            vec![tool]
        } else {
            Vec::new()
        };

        (
            entry.map(|e| e.id.clone()).unwrap_or_else(|| skill_name.clone()),
            installed_by_vec
        )
    } else {
        // 工作区模式：根据各工具目录实际存在情况动态计算
        let ws_path_buf = PathBuf::from(workspace_path.as_ref().ok_or_else(|| "工作区路径缺失".to_string())?);
        let mut installed = Vec::new();

        // 如果找到了，添加到列表
        if let Some(ref tool) = found_in_tool {
            installed.push(tool.clone());
        }

        // 检查其他工具目录
        for (tool_name, tool_dir) in get_all_tool_workspace_skills_dirs(&ws_path_buf) {
            if tool_dir.join(&skill_name).exists() {
                if !installed.iter().any(|t| t == tool_name) {
                    installed.push(tool_name.to_string());
                }
            }
        }

        (skill_name.clone(), installed)
    };

    Ok(SkillDetail {
        id,
        name: skill_name,
        description: metadata.as_ref().and_then(|m| m.description.clone()),
        enabled,  // 根据文件位置判断状态
        installed_by,
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
    let enabled_path = skills_dir.join(&skill_name);

    let skill_dir = if enabled_path.exists() {
        enabled_path
    } else if let Some(disabled_path) = find_existing_disabled_skill_dir(&skill_name, None)? {
        disabled_path
    } else {
        return Err(format!("Skill '{}' 不存在", skill_name));
    };

    list_skill_files_internal(&skill_dir)
}

/// 读取 Skill 中的指定文件内容
#[tauri::command]
pub fn read_skill_file(skill_name: String, file_path: String, workspace_path: Option<String>) -> Result<String, String> {
    let skills_dir = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        ws_path_buf.join(".claude").join("skills")
    } else {
        get_skills_dir()?
    };

    // 尝试从两个目录中查找
    let enabled_path = skills_dir.join(&skill_name);

    let skill_dir = if enabled_path.exists() {
        enabled_path
    } else if let Some(disabled_path) = find_existing_disabled_skill_dir(&skill_name, workspace_path.as_deref())? {
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
pub fn toggle_skill(skill_name: String, enabled: bool, workspace_path: Option<String>) -> Result<(), String> {
    let disabled_skills_dir = get_disabled_skills_dir(workspace_path.as_deref())?;

    // 确保禁用目录存在
    fs::create_dir_all(&disabled_skills_dir)
        .map_err(|e| format!("创建禁用 skills 目录失败: {}", e))?;

    let target_dir = disabled_skills_dir.join(&skill_name);

    if enabled {
        let source_dir = find_existing_disabled_skill_dir(&skill_name, workspace_path.as_deref())?
            .ok_or_else(|| format!("Skill '{}' 不存在于禁用 skills 目录", skill_name))?;
        let state = read_disabled_skill_state(&source_dir)?;
        let installed_tools = if state.installed_by.is_empty() {
            vec!["claude-code".to_string()]
        } else {
            state.installed_by
        };

        let target_dirs = if let Some(ref ws_path) = workspace_path {
            get_target_tool_workspace_dirs(&installed_tools, &PathBuf::from(ws_path))?
        } else {
            get_target_tool_dirs(&installed_tools)?
        };

        for (_, tool_dir) in &target_dirs {
            let skill_dir = tool_dir.join(&skill_name);
            if skill_dir.exists() {
                return Err(format!("目标位置已存在 skill '{}'", skill_name));
            }
        }

        for (_, tool_dir) in &target_dirs {
            let skill_dir = tool_dir.join(&skill_name);
            copy_dir_recursive(&source_dir, &skill_dir)?;
        }

        fs::remove_dir_all(&source_dir)
            .map_err(|e| format!("清理禁用目录失败: {}", e))?;

        if workspace_path.is_none() {
            update_registry_installation_state(&skill_name, true, installed_tools)?;
        }
    } else {
        if target_dir.exists() {
            return Err(format!("目标位置已存在 skill '{}'", skill_name));
        }

        let installed_tool_paths = get_installed_tool_skill_paths(&skill_name, workspace_path.as_deref());
        if installed_tool_paths.is_empty() {
            return Err(format!("Skill '{}' 不存在于任何工具目录", skill_name));
        }

        let installed_tools = installed_tool_paths
            .iter()
            .map(|(tool_name, _)| tool_name.clone())
            .collect::<Vec<_>>();

        let source_dir = installed_tool_paths
            .iter()
            .find(|(tool_name, _)| tool_name == "claude-code")
            .map(|(_, path)| path.clone())
            .unwrap_or_else(|| installed_tool_paths[0].1.clone());

        move_or_copy_skill_dir(&source_dir, &target_dir)?;
        write_disabled_skill_state(
            &target_dir,
            &DisabledSkillState {
                installed_by: installed_tools.clone(),
                disabled_at: Some(chrono::Utc::now().to_rfc3339()),
            },
        )?;

        for (_, tool_path) in installed_tool_paths {
            if tool_path == source_dir {
                continue;
            }
            if tool_path.exists() {
                fs::remove_dir_all(&tool_path)
                    .map_err(|e| format!("移除已安装目录失败: {}", e))?;
            }
        }

        if workspace_path.is_none() {
            update_registry_installation_state(&skill_name, false, Vec::new())?;
        }
    }

    Ok(())
}

/// 完全卸载 Skill（从所有 AI 工具中删除）
#[tauri::command]
pub fn uninstall_skill(skill_name: String, workspace_path: Option<String>) -> Result<(), String> {
    println!("🗑️  [Backend] 完全卸载 Skill: {}", skill_name);

    let mut deleted_from_tools = Vec::new();

    // 根据工作区路径决定使用哪些工具目录
    let all_tool_dirs = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        get_all_tool_workspace_skills_dirs(&ws_path_buf)
    } else {
        get_all_tool_skills_dirs()
    };

    // 从所有工具目录中删除
    for (tool_name, tool_dir) in &all_tool_dirs {
        let skill_path = tool_dir.join(&skill_name);
        if skill_path.exists() {
            match fs::remove_dir_all(&skill_path) {
                Ok(_) => {
                    println!("✅ [Backend] 从 {} 中删除成功", tool_name);
                    deleted_from_tools.push(tool_name.to_string());
                }
                Err(e) => {
                    eprintln!("⚠️  [Backend] 从 {} 中删除失败: {}", tool_name, e);
                }
            }
        }
    }

    // 也检查 disabled_skills 目录
    for disabled_dir in get_disabled_skills_dir_candidates(workspace_path.as_deref())? {
        let disabled_path = disabled_dir.join(&skill_name);
        if disabled_path.exists() {
            fs::remove_dir_all(&disabled_path)
                .map_err(|e| format!("删除禁用的 skill 目录失败: {}", e))?;
            deleted_from_tools.push("disabled".to_string());
        }
    }

    if deleted_from_tools.is_empty() {
        return Err(format!("Skill '{}' 不存在于任何工具中", skill_name));
    }

    // 只在全局模式下从注册表中移除
    if workspace_path.is_none() {
        let mut registry = read_skill_registry()?;
        registry.skills.retain(|s| s.name != skill_name);
        write_skill_registry(registry)?;
    }

    println!("🎉 [Backend] Skill '{}' 已从 {} 个位置删除", skill_name, deleted_from_tools.len());
    Ok(())
}

/// 从指定的 AI 工具中移除 Skill
#[tauri::command]
pub fn remove_skill_from_tools(
    skill_name: String,
    tools: Vec<String>,
    workspace_path: Option<String>,
) -> Result<String, String> {
    println!("🗑️  [Backend] 从指定工具中移除 Skill");
    println!("📦 [Backend] Skill: {}", skill_name);
    println!("🎯 [Backend] 目标工具: {:?}", tools);

    let mut removed_tools = Vec::new();
    let mut not_found_tools = Vec::new();

    // 获取所有工具目录
    let all_tool_dirs = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        get_all_tool_workspace_skills_dirs(&ws_path_buf)
    } else {
        get_all_tool_skills_dirs()
    };

    for tool_name in &tools {
        // 找到对应的工具目录
        if let Some((_, tool_dir)) = all_tool_dirs.iter().find(|(name, _)| *name == tool_name.as_str()) {
            let skill_path = tool_dir.join(&skill_name);

            if skill_path.exists() {
                match fs::remove_dir_all(&skill_path) {
                    Ok(_) => {
                        println!("✅ [Backend] 成功从 {} 中移除 {}", tool_name, skill_name);
                        removed_tools.push(tool_name.clone());
                    }
                    Err(e) => {
                        eprintln!("⚠️  [Backend] 从 {} 中移除 {} 失败: {}", tool_name, skill_name, e);
                    }
                }
            } else {
                println!("⚠️  [Backend] Skill '{}' 在 {} 中不存在", skill_name, tool_name);
                not_found_tools.push(tool_name.clone());
            }
        }
    }

    if removed_tools.is_empty() {
        return Err(format!("Skill '{}' 在指定的工具中都不存在", skill_name));
    }

    // 只在全局模式下更新注册表
    if workspace_path.is_none() {
        let mut registry = read_skill_registry()
            .map_err(|e| format!("读取注册表失败: {}", e))?;

        if let Some(entry) = registry.skills.iter_mut().find(|s| s.name == skill_name) {
            // 从 installedBy 中移除这些工具
            entry.installed_by.retain(|tool| !removed_tools.contains(tool));

            // 如果没有工具安装了这个 skill，从注册表中完全移除
            if entry.installed_by.is_empty() {
                registry.skills.retain(|s| s.name != skill_name);
                println!("📝 [Backend] Skill '{}' 已从所有工具中移除，从注册表中删除", skill_name);
            }
        }

        write_skill_registry(registry)
            .map_err(|e| format!("写入注册表失败: {}", e))?;
    }

    let message = if not_found_tools.is_empty() {
        format!("成功从 {} 个工具中移除", removed_tools.len())
    } else {
        format!(
            "成功从 {} 个工具中移除；{} 个工具中未找到该 Skill",
            removed_tools.len(),
            not_found_tools.len()
        )
    };

    println!("🎉 [Backend] {}", message);
    Ok(message)
}

/// 获取所有已安装的 Skills（扫描多个 AI Tools 目录）
/// workspace_path: 可选的工作区路径，如果提供则扫描工作区的各 AI Tool skills 目录
#[tauri::command]
pub fn list_installed_skills(workspace_path: Option<String>) -> Result<Vec<SkillRegistryEntry>, String> {
    migrate_legacy_disabled_skills_dir(workspace_path.as_deref())?;

    // 根据是否提供工作区路径决定扫描目录
    let (skills_dir, disabled_skills_dir, tool_dirs) = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        // 工作区模式下，默认使用 .claude/skills 作为主目录（兼容原有逻辑）
        let ws_skills_dir = ws_path_buf.join(".claude").join("skills");
        let ws_disabled_dir = get_disabled_skills_dir(Some(ws_path))?;
        // 获取所有 AI Tools 的工作区级别目录
        let ws_tool_dirs = get_all_tool_workspace_skills_dirs(&ws_path_buf);
        println!("📁 [Backend] 扫描工作区 skills: {:?}", ws_skills_dir);
        (ws_skills_dir, ws_disabled_dir, ws_tool_dirs)
    } else {
        let global_skills_dir = get_skills_dir()?;
        let global_disabled_dir = get_disabled_skills_dir(None)?;
        let global_tool_dirs = get_all_tool_skills_dirs();
        println!("🌐 [Backend] 扫描全局 skills: {:?}", global_skills_dir);
        (global_skills_dir, global_disabled_dir, global_tool_dirs)
    };

    // 扫描所有 AI Tools 的目录，建立 skill -> tools 映射
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

    // 只有全局模式才读取注册表
    let registry = if workspace_path.is_none() {
        read_skill_registry()?
    } else {
        SkillRegistry::default()
    };

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
            .map_err(|e| format!("读取禁用 skills 目录失败: {}", e))?;

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
                            skill_entry.enabled = false;  // 在禁用 skills 目录 = 禁用
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

    // 补充只安装在其他工具（非 claude-code）中的 skills
    let already_listed: std::collections::HashSet<String> = skills.iter().map(|s| s.name.clone()).collect();
    for (skill_name, tools) in &skill_to_tools {
        // 跳过已经列出的
        if already_listed.contains(skill_name) {
            continue;
        }
        // 跳过只有 claude-code 的（说明目录不存在于 skills_dir，可能是异常状态）
        if tools.iter().all(|t| t == "claude-code") {
            continue;
        }

        // 从其他工具目录读取 metadata
        let mut metadata: Option<SkillMetadata> = None;
        for (tool_name, tool_dir) in &tool_dirs {
            if tools.contains(&tool_name.to_string()) {
                let metadata_path = tool_dir.join(skill_name).join("metadata.json");
                if metadata_path.exists() {
                    metadata = fs::read_to_string(&metadata_path)
                        .ok()
                        .and_then(|c| serde_json::from_str(&c).ok());
                    break;
                }
            }
        }

        skills.push(SkillRegistryEntry {
            id: skill_name.clone(),
            name: skill_name.clone(),
            description: metadata.as_ref().and_then(|m| m.description.clone()),
            enabled: true, // 存在于其他工具目录即视为启用
            installed_by: tools.clone(),
            installed_at: None,
            metadata,
        });
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(skills)
}

#[tauri::command]
pub fn open_skill_folder(
    skill_name: String,
    tool_name: String,
    enabled: bool,
    workspace_path: Option<String>,
) -> Result<(), String> {
    let skill_dir = if tool_name == "claude-code" && !enabled {
        find_existing_disabled_skill_dir(&skill_name, workspace_path.as_deref())?
            .ok_or_else(|| format!("未找到 Skill '{}' 的禁用目录", skill_name))?
    } else {
        get_tool_skill_dir(&tool_name, workspace_path.as_deref())?.join(&skill_name)
    };

    if !skill_dir.exists() {
        return Err(format!("未找到 {} 中的 Skill '{}'", tool_name, skill_name));
    }

    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg(&skill_dir).status();

    #[cfg(target_os = "windows")]
    let status = Command::new("explorer").arg(&skill_dir).status();

    #[cfg(all(unix, not(target_os = "macos")))]
    let status = Command::new("xdg-open").arg(&skill_dir).status();

    status.map_err(|e| format!("打开 Skill 目录失败: {}", e))?;

    Ok(())
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
pub async fn scan_repo_skills(repo_url: String, git_auth: Option<GitAuthInput>) -> Result<Vec<ScannedSkillInfo>, String> {
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

    // 克隆仓库（浅克隆，HTTPS 失败会自动尝试 SSH）
    clone_repo(&repo_url, temp_dir.to_str().unwrap(), true, git_auth.as_ref())?;

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
    let disabled_skills_dir = get_disabled_skills_dir(None)?;

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
            || disabled_skills_dir.join(skill_name).exists()
            || get_legacy_disabled_skills_dir(None)?.join(skill_name).exists();

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
                            || disabled_skills_dir.join(skill_name).exists()
                            || get_legacy_disabled_skills_dir(None)?.join(skill_name).exists();

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
pub async fn install_skill_from_repo(
    repo_url: String,
    skill_names: Option<Vec<String>>,
    target_tools: Option<Vec<String>>,
    workspace_path: Option<String>,
    git_auth: Option<GitAuthInput>,
) -> Result<String, String> {

    println!("🔧 [Backend] 开始安装 Skill");
    println!("📦 [Backend] 仓库 URL: {}", repo_url);
    if let Some(ref names) = skill_names {
        println!("📝 [Backend] 指定安装: {:?}", names);
    }
    if let Some(ref tools) = target_tools {
        println!("🎯 [Backend] 目标工具: {:?}", tools);
    }
    if let Some(ref ws) = workspace_path {
        println!("📁 [Backend] 工作区路径: {:?}", ws);
    }

    // 获取目标工具的目录列表（根据是否提供工作区路径决定）
    let target_dirs = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        if let Some(tools) = target_tools.as_ref() {
            get_target_tool_workspace_dirs(tools, &ws_path_buf)?
        } else {
            // 默认安装到工作区的 claude-code
            vec![("claude-code".to_string(), ws_path_buf.join(".claude").join("skills"))]
        }
    } else {
        if let Some(tools) = target_tools.as_ref() {
            get_target_tool_dirs(tools)?
        } else {
            // 默认只安装到全局 claude-code
            vec![("claude-code".to_string(), get_skills_dir()?)]
        }
    };

    println!("📁 [Backend] 目标目录: {:?}", target_dirs);

    // 确保所有目标目录存在
    for (tool_name, tool_dir) in &target_dirs {
        fs::create_dir_all(tool_dir).map_err(|e| {
            let err = format!("创建 {} skills 目录失败: {}", tool_name, e);
            eprintln!("❌ [Backend] {}", err);
            err
        })?;
    }

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

    // 克隆仓库（完整克隆，HTTPS 失败会自动尝试 SSH）
    clone_repo(&repo_url, temp_dir.to_str().unwrap(), false, git_auth.as_ref())?;

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
    let installed_skills = install_skills_from_dir(&source_dir, &target_dirs, &repo_url, skill_names.as_ref())?;

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

/// 从目录中扫描并安装 skills（支持选择性安装和多目标工具）
fn install_skills_from_dir(
    source_dir: &PathBuf,
    target_dirs: &Vec<(String, PathBuf)>,
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

        install_single_skill(source_dir, target_dirs, skill_name, repo_url)?;
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
                        match install_single_skill(&path, target_dirs, skill_name, repo_url) {
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

/// 安装单个 skill 到多个目标工具
fn install_single_skill(
    source_path: &PathBuf,
    target_dirs: &Vec<(String, PathBuf)>,
    skill_name: &str,
    repo_url: &str,
) -> Result<(), String> {
    let mut installed_tools = Vec::new();

    // 安装到所有目标工具目录
    for (tool_name, tool_skills_dir) in target_dirs {
        let target_dir = tool_skills_dir.join(skill_name);

        // 检查是否已存在
        if target_dir.exists() {
            println!("⚠️  [Backend] Skill '{}' 在 {} 中已存在，跳过", skill_name, tool_name);
            continue;
        }

        // 复制目录
        match copy_dir_recursive(source_path, &target_dir) {
            Ok(_) => {
                println!("✅ [Backend] 成功安装 {} 到 {}", skill_name, tool_name);
                installed_tools.push(tool_name.clone());
            }
            Err(e) => {
                eprintln!("⚠️  [Backend] 安装 {} 到 {} 失败: {}", skill_name, tool_name, e);
            }
        }
    }

    if installed_tools.is_empty() {
        return Err(format!("Skill '{}' 在所有目标工具中都已存在", skill_name));
    }

    // 只在第一个成功安装的目录中读取 metadata
    let first_tool_dir = target_dirs
        .iter()
        .find(|(name, _)| installed_tools.contains(name))
        .map(|(_, dir)| dir.join(skill_name))
        .ok_or_else(|| "无法找到已安装的目录".to_string())?;

    // 解析 SKILL.md 的 frontmatter
    let skill_md_path = first_tool_dir.join("SKILL.md");
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
        let metadata_path = first_tool_dir.join("metadata.json");
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
        for tool_name in &installed_tools {
            if !existing.installed_by.contains(tool_name) {
                existing.installed_by.push(tool_name.clone());
            }
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
            installed_by: installed_tools.clone(),
            installed_at: Some(now),
            metadata,
        });
    }

    write_skill_registry(registry)
        .map_err(|e| format!("写入注册表失败: {}", e))?;

    // 为每个安装的工具生成清单文件
    for (tool_name, tool_skills_dir) in target_dirs {
        if installed_tools.contains(tool_name) {
            let target_dir = tool_skills_dir.join(skill_name);
            let manifest = generate_skill_manifest(&target_dir, Some(repo_url))?;
            write_skill_manifest(&target_dir, &manifest)?;
        }
    }

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

            // 跳过 git 元数据和本地禁用状态文件
            if file_name == ".git" || file_name == ".cobalt-state.json" {
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
    pub outdated_tools: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillUpdateSummary {
    pub skill_name: String,
    pub has_update: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_version: Option<String>,
    pub has_repository: bool,
    pub has_manifest: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changed_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removed_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outdated_tools: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub checked_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkillUpdateCacheFile {
    updated_at: String,
    results: Vec<SkillUpdateSummary>,
}

struct LocalSkillUpdateContext {
    skill_name: String,
    current_version: Option<String>,
    local_tools: Vec<InstalledToolLocalContext>,
    repo_url: Option<String>,
}

struct InstalledToolLocalContext {
    tool_name: String,
    has_manifest: bool,
    local_manifest: Option<SkillManifest>,
}

const SKILL_UPDATE_CACHE_TTL_HOURS: i64 = 6;

fn read_skill_update_cache(workspace_path: Option<&str>) -> Result<Option<SkillUpdateCacheFile>, String> {
    let cache_path = get_skill_updates_cache_path(workspace_path)?;
    if !cache_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&cache_path)
        .map_err(|e| format!("读取 Skill 更新缓存失败: {}", e))?;

    let cache = serde_json::from_str(&content)
        .map_err(|e| format!("解析 Skill 更新缓存失败: {}", e))?;

    Ok(Some(cache))
}

fn write_skill_update_cache(
    workspace_path: Option<&str>,
    results: &[SkillUpdateSummary],
) -> Result<(), String> {
    let cache_dir = get_skill_updates_cache_dir()?;
    fs::create_dir_all(&cache_dir).map_err(|e| format!("创建 Skill 更新缓存目录失败: {}", e))?;

    let cache_path = get_skill_updates_cache_path(workspace_path)?;
    let cache = SkillUpdateCacheFile {
        updated_at: Utc::now().to_rfc3339(),
        results: results.to_vec(),
    };

    let content = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("序列化 Skill 更新缓存失败: {}", e))?;

    fs::write(&cache_path, content).map_err(|e| format!("写入 Skill 更新缓存失败: {}", e))
}

fn is_skill_update_cache_fresh(cache: &SkillUpdateCacheFile) -> bool {
    let Ok(updated_at) = DateTime::parse_from_rfc3339(&cache.updated_at) else {
        return false;
    };

    Utc::now()
        .signed_duration_since(updated_at.with_timezone(&Utc))
        .num_hours()
        < SKILL_UPDATE_CACHE_TTL_HOURS
}

fn resolve_local_skill_tool_dirs(
    skill_name: &str,
    workspace_path: Option<&str>,
) -> Result<Vec<(String, PathBuf)>, String> {
        let (skills_dir, all_tool_dirs) = if let Some(ws_path) = workspace_path {
            let ws_path_buf = PathBuf::from(ws_path);
            (
                ws_path_buf.join(".claude").join("skills"),
                get_all_tool_workspace_skills_dirs(&ws_path_buf),
            )
        } else {
            (
                get_skills_dir()?,
                get_all_tool_skills_dirs(),
            )
        };

    let mut tool_paths = Vec::new();
    for (tool_name, tool_dir) in all_tool_dirs {
        let tool_skill_dir = tool_dir.join(skill_name);
        if tool_skill_dir.exists() {
            tool_paths.push((tool_name.to_string(), tool_skill_dir));
        }
    }

    if !tool_paths.iter().any(|(tool_name, _)| tool_name == "claude-code") {
        if let Some(disabled_skill_dir) = find_existing_disabled_skill_dir(skill_name, workspace_path)? {
            tool_paths.push(("claude-code".to_string(), disabled_skill_dir));
        } else if skills_dir.join(skill_name).exists() {
            tool_paths.push(("claude-code".to_string(), skills_dir.join(skill_name)));
        }
    }

    if tool_paths.is_empty() {
        return Err(format!("Skill '{}' 不存在", skill_name));
    }

    Ok(tool_paths)
}

fn resolve_skill_repository(skill_dir: &PathBuf, skill_name: &str, workspace_path: Option<&str>) -> Option<String> {
    let entry = if workspace_path.is_none() {
        read_skill_registry().ok().and_then(|registry| {
            registry
                .skills
                .iter()
                .find(|s| s.name == skill_name)
                .cloned()
        })
    } else {
        None
    };

    entry
        .as_ref()
        .and_then(|e| e.metadata.as_ref())
        .and_then(|m| m.repository.clone())
        .or_else(|| read_skill_manifest(skill_dir).and_then(|m| m.repository))
        .or_else(|| {
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
}

fn resolve_local_skill_update_context(
    skill_name: &str,
    workspace_path: Option<&str>,
) -> Result<LocalSkillUpdateContext, String> {
    let tool_dirs = resolve_local_skill_tool_dirs(skill_name, workspace_path)?;
    let local_tools: Vec<InstalledToolLocalContext> = tool_dirs
        .iter()
        .map(|(tool_name, skill_dir)| {
            let local_manifest = read_skill_manifest(skill_dir)
                .or_else(|| generate_skill_manifest(skill_dir, None).ok());
            InstalledToolLocalContext {
                tool_name: tool_name.clone(),
                has_manifest: local_manifest.is_some(),
                local_manifest,
            }
        })
        .collect();

    let current_version = if workspace_path.is_none() {
        read_skill_registry()
            .ok()
            .and_then(|registry| {
                registry
                    .skills
                    .iter()
                    .find(|s| s.name == skill_name)
                    .and_then(|entry| entry.metadata.as_ref())
                    .and_then(|metadata| metadata.version.clone())
            })
            .or_else(|| {
                let versions: Vec<String> = local_tools
                    .iter()
                    .filter_map(|tool| tool.local_manifest.as_ref().map(|manifest| manifest.version.clone()))
                    .collect();
                let unique_versions: std::collections::HashSet<String> = versions.iter().cloned().collect();
                if unique_versions.len() == 1 {
                    versions.first().cloned()
                } else {
                    None
                }
            })
    } else {
        let versions: Vec<String> = local_tools
            .iter()
            .filter_map(|tool| tool.local_manifest.as_ref().map(|manifest| manifest.version.clone()))
            .collect();
        let unique_versions: std::collections::HashSet<String> = versions.iter().cloned().collect();
        if unique_versions.len() == 1 {
            versions.first().cloned()
        } else {
            None
        }
    };

    let repo_url = tool_dirs
        .iter()
        .find_map(|(_, skill_dir)| resolve_skill_repository(skill_dir, skill_name, workspace_path));

    Ok(LocalSkillUpdateContext {
        skill_name: skill_name.to_string(),
        current_version,
        local_tools,
        repo_url,
    })
}

fn create_update_result_from_context(
    context: &LocalSkillUpdateContext,
    remote_manifest: Option<&SkillManifest>,
    error: Option<String>,
) -> SkillUpdateCheckResult {
    if let Some(error) = error {
        return SkillUpdateCheckResult {
            has_update: false,
            current_version: context.current_version.clone(),
            latest_version: None,
            has_repository: context.repo_url.is_some(),
            has_manifest: context.local_tools.iter().any(|tool| tool.has_manifest),
            changed_files: None,
            new_files: None,
            removed_files: None,
            outdated_tools: None,
            error: Some(error),
        };
    }
    let mut changed_files = std::collections::HashSet::new();
    let mut new_files = std::collections::HashSet::new();
    let mut removed_files = std::collections::HashSet::new();
    let mut outdated_tools = Vec::new();

    for tool in &context.local_tools {
        let comparison_result = compare_manifests(tool.local_manifest.as_ref(), remote_manifest);
        if comparison_result.has_changes {
            outdated_tools.push(tool.tool_name.clone());
            changed_files.extend(comparison_result.changed);
            new_files.extend(comparison_result.new);
            removed_files.extend(comparison_result.removed);
        }
    }

    let mut changed_files: Vec<String> = changed_files.into_iter().collect();
    let mut new_files: Vec<String> = new_files.into_iter().collect();
    let mut removed_files: Vec<String> = removed_files.into_iter().collect();
    changed_files.sort();
    new_files.sort();
    removed_files.sort();
    outdated_tools.sort();

    SkillUpdateCheckResult {
        has_update: !outdated_tools.is_empty(),
        current_version: context.current_version.clone(),
        latest_version: remote_manifest.map(|manifest| manifest.version.clone()),
        has_repository: true,
        has_manifest: context.local_tools.iter().any(|tool| tool.has_manifest),
        changed_files: Some(changed_files),
        new_files: Some(new_files),
        removed_files: Some(removed_files),
        outdated_tools: Some(outdated_tools),
        error: None,
    }
}

fn find_remote_skill_dir(repo_dir: &PathBuf, skill_name: &str) -> Result<PathBuf, String> {
    if repo_dir.join("skills").exists() {
        let skills_subdir = repo_dir.join("skills");
        let target = skills_subdir.join(skill_name);
        if target.exists() {
            return Ok(target);
        }

        let entries = fs::read_dir(&skills_subdir)
            .map_err(|e| format!("读取 skills 子目录失败: {}", e))?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("SKILL.md").exists() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if name.replace("-", "_") == skill_name.replace("-", "_") {
                    return Ok(path);
                }
            }
        }

        Err(format!("在仓库的 skills/ 目录中找不到 skill '{}'", skill_name))
    } else if repo_dir.join("SKILL.md").exists() {
        Ok(repo_dir.clone())
    } else {
        Err(format!("仓库中找不到 skill '{}'", skill_name))
    }
}

fn repo_temp_dir(prefix: &str, key: &str) -> PathBuf {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    std::env::temp_dir().join(format!("{}-{:x}", prefix, hasher.finalize()))
}

/// 检查 Skill 是否有更新（基于文件 hash 对比）
#[tauri::command]
pub async fn check_skill_update(skill_name: String, workspace_path: Option<String>) -> Result<SkillUpdateCheckResult, String> {
    println!("🔍 [Backend] 检查 Skill '{}' 的更新", skill_name);

    let context = resolve_local_skill_update_context(&skill_name, workspace_path.as_deref())?;
    let repo_url = match context.repo_url.clone() {
        Some(url) => url,
        None => {
            return Ok(create_update_result_from_context(
                &context,
                None,
                Some("该 Skill 没有配置仓库信息。请创建 .manifest.json 文件并添加 repository 字段。".to_string()),
            ));
        }
    };

    let temp_dir = repo_temp_dir("cobalt-skill-check", &format!("{}:{}", repo_url, skill_name));
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 克隆仓库（浅克隆，HTTPS 失败会自动尝试 SSH）
    println!("📡 [Backend] 克隆远程仓库: {}", repo_url);
    if let Err(e) = clone_repo(&repo_url, temp_dir.to_str().unwrap(), true, None) {
        return Ok(create_update_result_from_context(&context, None, Some(e)));
    }

    let remote_skill_dir = match find_remote_skill_dir(&temp_dir, &skill_name) {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Ok(create_update_result_from_context(&context, None, Some(error)));
        }
    };

    // 生成远程清单
    println!("📋 [Backend] 生成远程清单，目录: {:?}", remote_skill_dir);
    let remote_manifest = generate_skill_manifest(&remote_skill_dir, Some(&repo_url)).ok();

    // 清理临时目录
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    Ok(create_update_result_from_context(&context, remote_manifest.as_ref(), None))
}

#[tauri::command]
pub async fn check_all_skill_updates(
    workspace_path: Option<String>,
    force: Option<bool>,
) -> Result<Vec<SkillUpdateSummary>, String> {
    let skills = list_installed_skills(workspace_path.clone())?;
    let skill_names: Vec<String> = skills.iter().map(|skill| skill.name.clone()).collect();
    let mut sorted_skill_names = skill_names.clone();
    sorted_skill_names.sort();

    let force = force.unwrap_or(false);
    if !force {
        if let Some(cache) = read_skill_update_cache(workspace_path.as_deref())? {
            let mut cached_skill_names: Vec<String> = cache
                .results
                .iter()
                .map(|result| result.skill_name.clone())
                .collect();
            cached_skill_names.sort();

            if is_skill_update_cache_fresh(&cache) && cached_skill_names == sorted_skill_names {
                return Ok(cache.results);
            }
        }
    }

    let mut results = Vec::with_capacity(skills.len());
    let mut repo_groups: HashMap<String, Vec<LocalSkillUpdateContext>> = HashMap::new();

    for skill in skills {
        let context = resolve_local_skill_update_context(&skill.name, workspace_path.as_deref())?;
        if let Some(repo_url) = context.repo_url.clone() {
            repo_groups.entry(repo_url).or_default().push(context);
        } else {
            let result = create_update_result_from_context(
                &context,
                None,
                Some("该 Skill 没有配置仓库信息。请创建 .manifest.json 文件并添加 repository 字段。".to_string()),
            );
            results.push(SkillUpdateSummary {
                skill_name: context.skill_name,
                has_update: result.has_update,
                current_version: result.current_version,
                latest_version: result.latest_version,
                has_repository: result.has_repository,
                has_manifest: result.has_manifest,
                changed_files: result.changed_files,
                new_files: result.new_files,
                removed_files: result.removed_files,
                outdated_tools: result.outdated_tools,
                error: result.error,
                checked_at: chrono::Utc::now().to_rfc3339(),
            });
        }
    }

    for (repo_url, contexts) in repo_groups {
        let temp_dir = repo_temp_dir("cobalt-skill-batch-check", &repo_url);
        if temp_dir.exists() {
            let _ = fs::remove_dir_all(&temp_dir);
        }

        let clone_result = clone_repo(&repo_url, temp_dir.to_str().unwrap(), true, None);

        for context in contexts {
            let result = if let Err(error) = &clone_result {
                create_update_result_from_context(&context, None, Some(error.clone()))
            } else {
                match find_remote_skill_dir(&temp_dir, &context.skill_name) {
                    Ok(remote_skill_dir) => {
                        let remote_manifest = generate_skill_manifest(&remote_skill_dir, Some(&repo_url)).ok();
                        create_update_result_from_context(&context, remote_manifest.as_ref(), None)
                    }
                    Err(error) => create_update_result_from_context(&context, None, Some(error)),
                }
            };

            results.push(SkillUpdateSummary {
                skill_name: context.skill_name,
                has_update: result.has_update,
                current_version: result.current_version,
                latest_version: result.latest_version,
                has_repository: result.has_repository,
                has_manifest: result.has_manifest,
                changed_files: result.changed_files,
                new_files: result.new_files,
                removed_files: result.removed_files,
                outdated_tools: result.outdated_tools,
                error: result.error,
                checked_at: chrono::Utc::now().to_rfc3339(),
            });
        }

        if temp_dir.exists() {
            let _ = fs::remove_dir_all(&temp_dir);
        }
    }

    results.sort_by(|a, b| a.skill_name.cmp(&b.skill_name));

    write_skill_update_cache(workspace_path.as_deref(), &results)?;

    Ok(results)
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
pub async fn update_skill(skill_name: String, workspace_path: Option<String>) -> Result<String, String> {
    println!("🔄 [Backend] 开始更新 Skill '{}'", skill_name);

    let skills_dir = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        ws_path_buf.join(".claude").join("skills")
    } else {
        get_skills_dir()?
    };

    // 确定 skill 当前位置
    let is_enabled = skills_dir.join(&skill_name).exists();
    let skill_dir = if is_enabled {
        skills_dir.join(&skill_name)
    } else {
        find_existing_disabled_skill_dir(&skill_name, workspace_path.as_deref())?
            .ok_or_else(|| format!("Skill '{}' 目录不存在", skill_name))?
    };

    if !skill_dir.exists() {
        return Err(format!("Skill '{}' 目录不存在", skill_name));
    }

    let disabled_state = if is_enabled {
        None
    } else {
        Some(read_disabled_skill_state(&skill_dir)?)
    };

    let installed_tools = list_installed_skills(workspace_path.clone())?
        .into_iter()
        .find(|skill| skill.name == skill_name)
        .map(|skill| skill.installed_by)
        .or_else(|| {
            disabled_state
                .as_ref()
                .map(|state| state.installed_by.clone())
                .filter(|tools| !tools.is_empty())
        })
        .unwrap_or_else(|| vec!["claude-code".to_string()]);

    // 只在全局模式下读取注册表
    let (_entry, repo_url_from_registry) = if workspace_path.is_none() {
        let registry = read_skill_registry()?;
        let entry = registry
            .skills
            .iter()
            .find(|s| s.name == skill_name)
            .cloned();
        let repo_from_registry = entry
            .as_ref()
            .and_then(|e| e.metadata.as_ref())
            .and_then(|m| m.repository.clone());
        (entry, repo_from_registry)
    } else {
        (None, None)
    };

    // 获取 repository URL - 优先从注册表，然后从 .manifest.json，最后从 SKILL.md
    let repo_url = repo_url_from_registry
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

    // 克隆仓库（完整克隆，HTTPS 失败会自动尝试 SSH）
    if let Err(e) = clone_repo(&repo_url, temp_dir.to_str().unwrap(), false, None) {
        let _ = fs::remove_dir_all(&backup_dir);
        return Err(e);
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

    if let Some(ref state) = disabled_state {
        write_disabled_skill_state(&skill_dir, state)?;
    }

    // 生成新的清单文件
    let new_manifest = generate_skill_manifest(&skill_dir, Some(&repo_url))?;
    write_skill_manifest(&skill_dir, &new_manifest)?;

    let all_tool_dirs = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        get_all_tool_workspace_skills_dirs(&ws_path_buf)
    } else {
        get_all_tool_skills_dirs()
    };

    let mut synced_tools = Vec::new();
    let mut failed_tools = Vec::new();

    for tool_name in installed_tools {
        if !is_enabled {
            break;
        }
        if tool_name == "claude-code" {
            continue;
        }

        let Some((_, tool_skills_dir)) = all_tool_dirs.iter().find(|(name, _)| *name == tool_name.as_str()) else {
            failed_tools.push(format!("{}（未知工具目录）", tool_name));
            continue;
        };

        if let Err(e) = fs::create_dir_all(tool_skills_dir) {
            failed_tools.push(format!("{}（创建目录失败: {}）", tool_name, e));
            continue;
        }

        let target_dir = tool_skills_dir.join(&skill_name);
        if target_dir.exists() {
            if let Err(e) = fs::remove_dir_all(&target_dir) {
                failed_tools.push(format!("{}（清理旧版本失败: {}）", tool_name, e));
                continue;
            }
        }

        match copy_dir_recursive(&skill_dir, &target_dir) {
            Ok(_) => synced_tools.push(tool_name),
            Err(e) => failed_tools.push(format!("{}（同步失败: {}）", tool_name, e)),
        }
    }

    // 只在全局模式下更新注册表
    if workspace_path.is_none() {
        let mut registry = read_skill_registry()?;
        if let Some(entry) = registry.skills.iter_mut().find(|s| s.name == skill_name) {
            // 更新已有条目
            entry.enabled = is_enabled;
            if !is_enabled {
                entry.installed_by = Vec::new();
            }
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
                installed_by: if is_enabled { vec!["claude-code".to_string()] } else { Vec::new() },
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
    }

    // 清理临时文件
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }
    if backup_dir.exists() {
        let _ = fs::remove_dir_all(&backup_dir);
    }

    println!("✅ [Backend] Skill '{}' 更新成功", skill_name);
    let mut message = "成功更新到最新版本".to_string();
    if !synced_tools.is_empty() {
        message.push_str(&format!("；已同步到 {} 个工具: {}", synced_tools.len(), synced_tools.join(", ")));
    }
    if !failed_tools.is_empty() {
        message.push_str(&format!("；{} 个工具同步失败: {}", failed_tools.len(), failed_tools.join(", ")));
    }
    Ok(message)
}

/// 设置 Skill 的仓库地址
#[tauri::command]
pub fn set_skill_repository(skill_name: String, repository: String, workspace_path: Option<String>) -> Result<(), String> {
    println!("📝 [Backend] 设置 Skill '{}' 的仓库地址: {}", skill_name, repository);

    let skills_dir = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        ws_path_buf.join(".claude").join("skills")
    } else {
        get_skills_dir()?
    };

    // 确定 skill 目录
    let skill_dir = if skills_dir.join(&skill_name).exists() {
        skills_dir.join(&skill_name)
    } else if let Some(disabled_dir) = find_existing_disabled_skill_dir(&skill_name, workspace_path.as_deref())? {
        disabled_dir
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

    // 只在全局模式下更新注册表
    if workspace_path.is_none() {
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
    }

    println!("✅ [Backend] 仓库地址设置成功");
    Ok(())
}

/// 将已安装的 Skill 应用到其他 AI 工具
#[tauri::command]
pub fn apply_skill_to_tools(
    skill_name: String,
    target_tools: Vec<String>,
    workspace_path: Option<String>,
) -> Result<String, String> {
    println!("🔧 [Backend] 开始应用 Skill 到其他工具");
    println!("📦 [Backend] Skill: {}", skill_name);
    println!("🎯 [Backend] 目标工具: {:?}", target_tools);

    // 获取源 Skill 目录（从 claude-code 或禁用 skills 目录）
    let skills_dir = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        ws_path_buf.join(".claude").join("skills")
    } else {
        get_skills_dir()?
    };

    let source_dir = if skills_dir.join(&skill_name).exists() {
        skills_dir.join(&skill_name)
    } else if let Some(disabled_dir) = find_existing_disabled_skill_dir(&skill_name, workspace_path.as_deref())? {
        disabled_dir
    } else {
        return Err(format!("Skill '{}' 不存在", skill_name));
    };

    // 获取目标工具的目录列表
    let target_dirs = if let Some(ref ws_path) = workspace_path {
        let ws_path_buf = PathBuf::from(ws_path);
        get_target_tool_workspace_dirs(&target_tools, &ws_path_buf)?
    } else {
        get_target_tool_dirs(&target_tools)?
    };

    let mut installed_tools = Vec::new();
    let mut skipped_tools = Vec::new();

    // 复制到所有目标工具目录
    for (tool_name, tool_skills_dir) in &target_dirs {
        let target_dir = tool_skills_dir.join(&skill_name);

        // 确保目标工具的 skills 目录存在
        fs::create_dir_all(tool_skills_dir).map_err(|e| {
            format!("创建 {} skills 目录失败: {}", tool_name, e)
        })?;

        // 检查是否已存在
        if target_dir.exists() {
            println!("⚠️  [Backend] Skill '{}' 在 {} 中已存在，跳过", skill_name, tool_name);
            skipped_tools.push(tool_name.clone());
            continue;
        }

        // 复制目录
        match copy_dir_recursive(&source_dir, &target_dir) {
            Ok(_) => {
                println!("✅ [Backend] 成功应用 {} 到 {}", skill_name, tool_name);
                installed_tools.push(tool_name.clone());
            }
            Err(e) => {
                eprintln!("⚠️  [Backend] 应用 {} 到 {} 失败: {}", skill_name, tool_name, e);
            }
        }
    }

    if installed_tools.is_empty() {
        if skipped_tools.is_empty() {
            return Err("应用失败".to_string());
        } else {
            return Err(format!("Skill '{}' 在所有目标工具中都已存在", skill_name));
        }
    }

    // 只在全局模式下更新注册表
    if workspace_path.is_none() {
        let mut registry = read_skill_registry()
            .map_err(|e| format!("读取注册表失败: {}", e))?;

        if let Some(entry) = registry.skills.iter_mut().find(|s| s.name == skill_name) {
            // 更新安装工具列表
            for tool_name in &installed_tools {
                if !entry.installed_by.contains(tool_name) {
                    entry.installed_by.push(tool_name.clone());
                }
            }
        }

        write_skill_registry(registry)
            .map_err(|e| format!("写入注册表失败: {}", e))?;
    }

    let message = if skipped_tools.is_empty() {
        format!("成功应用到 {} 个工具: {}", installed_tools.len(), installed_tools.join(", "))
    } else {
        format!(
            "成功应用到 {} 个工具: {}；已跳过 {} 个工具: {}",
            installed_tools.len(),
            installed_tools.join(", "),
            skipped_tools.len(),
            skipped_tools.join(", ")
        )
    };

    println!("🎉 [Backend] {}", message);
    Ok(message)
}
