// Token 用量统计命令
use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// Claude 配置目录路径
fn get_claude_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".claude"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 读取 stats-cache.json
#[tauri::command]
pub fn read_stats_cache() -> Result<serde_json::Value, String> {
    let stats_path = get_claude_dir()?.join("stats-cache.json");

    if !stats_path.exists() {
        return Err("stats-cache.json 不存在".to_string());
    }

    let content = fs::read_to_string(&stats_path)
        .map_err(|e| format!("读取 stats-cache.json 失败: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("解析 stats-cache.json 失败: {}", e))
}

/// 获取用户默认 shell
fn get_user_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
}

/// 获取 Claude Code 版本号
/// 通过 login shell 执行，确保加载用户完整的 PATH 配置
#[tauri::command]
pub fn get_claude_code_version() -> Result<String, String> {
    let shell = get_user_shell();
    let output = Command::new(&shell)
        .args(["-l", "-c", "claude --version"])
        .output()
        .map_err(|e| format!("执行 claude --version 失败: {}", e))?;

    if !output.status.success() {
        return Err("claude --version 返回非零状态码".to_string());
    }

    let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(version_str)
}
