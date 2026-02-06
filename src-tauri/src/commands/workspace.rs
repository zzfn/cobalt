// 工作区管理命令
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

/// 工作区配置文件路径
fn get_workspace_config_path() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".cobalt").join("workspaces.json"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 工作区数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub last_opened: String,
    pub created_at: String,
    pub skill_count: usize,
    pub has_claude_config: bool,
}

/// 工作区配置
#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceConfig {
    pub current_workspace: Option<String>,
    pub recent_limit: usize,
    pub workspaces: Vec<Workspace>,
}

/// 读取工作区配置
fn read_workspace_config() -> Result<WorkspaceConfig, String> {
    let config_path = get_workspace_config_path()?;

    if !config_path.exists() {
        return Ok(WorkspaceConfig {
            current_workspace: None,
            recent_limit: 10,
            workspaces: Vec::new(),
        });
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("读取工作区配置失败: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("解析工作区配置失败: {}", e))
}

/// 写入工作区配置
fn write_workspace_config(config: &WorkspaceConfig) -> Result<(), String> {
    let config_path = get_workspace_config_path()?;

    // 确保目录存在
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化工作区配置失败: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("写入工作区配置失败: {}", e))
}

/// 统计工作区中的 skill 数量
fn count_workspace_skills(workspace_path: &str) -> usize {
    let skills_dir = PathBuf::from(workspace_path).join(".claude").join("skills");

    if !skills_dir.exists() {
        return 0;
    }

    fs::read_dir(&skills_dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .filter(|e| e.path().join("SKILL.md").exists())
                .count()
        })
        .unwrap_or(0)
}

/// 检查工作区是否有 .claude 配置
fn has_claude_config(workspace_path: &str) -> bool {
    PathBuf::from(workspace_path).join(".claude").exists()
}

/// 获取工作区列表
#[tauri::command]
pub fn list_workspaces() -> Result<Vec<Workspace>, String> {
    let config = read_workspace_config()?;
    Ok(config.workspaces)
}

/// 添加工作区
#[tauri::command]
pub fn add_workspace(path: String) -> Result<Workspace, String> {
    println!("📁 [Backend] 添加工作区: {}", path);

    let path_buf = PathBuf::from(&path);

    // 验证路径存在
    if !path_buf.exists() {
        return Err(format!("路径不存在: {}", path));
    }

    // 验证是目录
    if !path_buf.is_dir() {
        return Err("路径不是目录".to_string());
    }

    let mut config = read_workspace_config()?;

    // 检查是否已添加
    if config.workspaces.iter().any(|w| w.path == path) {
        return Err("工作区已存在".to_string());
    }

    // 获取目录名作为工作区名称
    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("未命名工作区")
        .to_string();

    let now = chrono::Utc::now().to_rfc3339();

    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name,
        path: path.clone(),
        icon: None,
        color: None,
        last_opened: now.clone(),
        created_at: now,
        skill_count: count_workspace_skills(&path),
        has_claude_config: has_claude_config(&path),
    };

    config.workspaces.push(workspace.clone());
    write_workspace_config(&config)?;

    println!("✅ [Backend] 工作区添加成功: {}", workspace.name);
    Ok(workspace)
}

/// 移除工作区
#[tauri::command]
pub fn remove_workspace(workspace_id: String) -> Result<(), String> {
    println!("🗑️  [Backend] 移除工作区: {}", workspace_id);

    let mut config = read_workspace_config()?;

    let original_len = config.workspaces.len();
    config.workspaces.retain(|w| w.id != workspace_id);

    if config.workspaces.len() == original_len {
        return Err("工作区不存在".to_string());
    }

    // 如果移除的是当前工作区，清除当前工作区
    if config.current_workspace.as_ref() == Some(&workspace_id) {
        config.current_workspace = None;
    }

    write_workspace_config(&config)?;

    println!("✅ [Backend] 工作区移除成功");
    Ok(())
}

/// 切换工作区
#[tauri::command]
pub fn switch_workspace(workspace_id: Option<String>) -> Result<Option<Workspace>, String> {
    println!("🔄 [Backend] 切换工作区: {:?}", workspace_id);

    let mut config = read_workspace_config()?;

    // 如果切换到全局（workspace_id 为 None）
    if workspace_id.is_none() {
        config.current_workspace = None;
        write_workspace_config(&config)?;
        println!("✅ [Backend] 已切换到全局工作区");
        return Ok(None);
    }

    let workspace_id = workspace_id.unwrap();

    // 查找工作区
    let workspace = config
        .workspaces
        .iter_mut()
        .find(|w| w.id == workspace_id);

    match workspace {
        Some(ws) => {
            // 更新最后打开时间
            ws.last_opened = chrono::Utc::now().to_rfc3339();
            // 更新 skill 数量
            ws.skill_count = count_workspace_skills(&ws.path);
            ws.has_claude_config = has_claude_config(&ws.path);

            let result = ws.clone();
            config.current_workspace = Some(workspace_id);
            write_workspace_config(&config)?;

            println!("✅ [Backend] 已切换到工作区: {}", result.name);
            Ok(Some(result))
        }
        None => Err("工作区不存在".to_string()),
    }
}

/// 获取当前工作区
#[tauri::command]
pub fn get_current_workspace() -> Result<Option<Workspace>, String> {
    let config = read_workspace_config()?;

    if let Some(current_id) = config.current_workspace {
        let workspace = config
            .workspaces
            .into_iter()
            .find(|w| w.id == current_id);
        Ok(workspace)
    } else {
        Ok(None)
    }
}

/// 更新工作区信息
#[tauri::command]
pub fn update_workspace(
    workspace_id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
) -> Result<Workspace, String> {
    println!("📝 [Backend] 更新工作区: {}", workspace_id);

    let mut config = read_workspace_config()?;

    let workspace = config
        .workspaces
        .iter_mut()
        .find(|w| w.id == workspace_id)
        .ok_or_else(|| "工作区不存在".to_string())?;

    if let Some(n) = name {
        workspace.name = n;
    }
    if let Some(c) = color {
        workspace.color = Some(c);
    }
    if let Some(i) = icon {
        workspace.icon = Some(i);
    }

    let result = workspace.clone();
    write_workspace_config(&config)?;

    println!("✅ [Backend] 工作区更新成功");
    Ok(result)
}

/// 刷新工作区信息（重新统计 skill 数量等）
#[tauri::command]
pub fn refresh_workspace(workspace_id: String) -> Result<Workspace, String> {
    println!("🔄 [Backend] 刷新工作区: {}", workspace_id);

    let mut config = read_workspace_config()?;

    let workspace = config
        .workspaces
        .iter_mut()
        .find(|w| w.id == workspace_id)
        .ok_or_else(|| "工作区不存在".to_string())?;

    // 更新统计信息
    workspace.skill_count = count_workspace_skills(&workspace.path);
    workspace.has_claude_config = has_claude_config(&workspace.path);

    let result = workspace.clone();
    write_workspace_config(&config)?;

    println!("✅ [Backend] 工作区刷新成功");
    Ok(result)
}

/// 初始化工作区的 .claude/skills 目录
#[tauri::command]
pub fn init_workspace_skills_dir(workspace_id: String) -> Result<String, String> {
    println!("📁 [Backend] 初始化工作区 skills 目录: {}", workspace_id);

    let config = read_workspace_config()?;

    let workspace = config
        .workspaces
        .iter()
        .find(|w| w.id == workspace_id)
        .ok_or_else(|| "工作区不存在".to_string())?;

    let skills_dir = PathBuf::from(&workspace.path)
        .join(".claude")
        .join("skills");

    fs::create_dir_all(&skills_dir)
        .map_err(|e| format!("创建 skills 目录失败: {}", e))?;

    println!("✅ [Backend] skills 目录创建成功: {:?}", skills_dir);
    Ok(skills_dir.to_string_lossy().to_string())
}
