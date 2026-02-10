// 缓存管理命令
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

/// 单项缓存信息
#[derive(Serialize)]
pub struct CacheItem {
    pub size_bytes: u64,
    pub file_count: u64,
    pub path: String,
}

/// 全部缓存信息
#[derive(Serialize)]
pub struct CacheInfo {
    pub conversations: CacheItem,
    pub backups: CacheItem,
    pub marketplace: CacheItem,
}

/// 清理结果
#[derive(Serialize)]
pub struct ClearCacheResult {
    pub cleared_bytes: u64,
    pub cleared_files: u64,
}

/// 递归计算目录大小和文件数
fn calc_dir_size(path: &PathBuf) -> (u64, u64) {
    let mut total_size: u64 = 0;
    let mut file_count: u64 = 0;

    if !path.exists() || !path.is_dir() {
        return (0, 0);
    }

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                let (size, count) = calc_dir_size(&entry_path);
                total_size += size;
                file_count += count;
            } else if let Ok(metadata) = entry_path.metadata() {
                total_size += metadata.len();
                file_count += 1;
            }
        }
    }

    (total_size, file_count)
}

/// 获取 Claude 配置目录
fn get_claude_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".claude"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 获取 Cobalt 数据目录
fn get_cobalt_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".cobalt"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 获取各类缓存信息
#[tauri::command]
pub fn get_cache_info() -> Result<CacheInfo, String> {
    let claude_dir = get_claude_dir()?;
    let cobalt_dir = get_cobalt_dir()?;

    let conversations_path = claude_dir.join("projects");
    let backups_path = claude_dir.join("backups");
    let marketplace_path = cobalt_dir.join(".cache").join("marketplace");

    let (conv_size, conv_count) = calc_dir_size(&conversations_path);
    let (backup_size, backup_count) = calc_dir_size(&backups_path);
    let (market_size, market_count) = calc_dir_size(&marketplace_path);

    Ok(CacheInfo {
        conversations: CacheItem {
            size_bytes: conv_size,
            file_count: conv_count,
            path: conversations_path.to_string_lossy().to_string(),
        },
        backups: CacheItem {
            size_bytes: backup_size,
            file_count: backup_count,
            path: backups_path.to_string_lossy().to_string(),
        },
        marketplace: CacheItem {
            size_bytes: market_size,
            file_count: market_count,
            path: marketplace_path.to_string_lossy().to_string(),
        },
    })
}

/// 递归删除目录内容（保留目录本身）
fn clear_dir_contents(path: &PathBuf) -> Result<(u64, u64), String> {
    let mut cleared_bytes: u64 = 0;
    let mut cleared_files: u64 = 0;

    if !path.exists() || !path.is_dir() {
        return Ok((0, 0));
    }

    let entries = fs::read_dir(path)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry_path.is_dir() {
            let (size, count) = calc_dir_size(&entry_path);
            cleared_bytes += size;
            cleared_files += count;
            fs::remove_dir_all(&entry_path)
                .map_err(|e| format!("删除目录失败 {}: {}", entry_path.display(), e))?;
        } else {
            if let Ok(metadata) = entry_path.metadata() {
                cleared_bytes += metadata.len();
            }
            cleared_files += 1;
            fs::remove_file(&entry_path)
                .map_err(|e| format!("删除文件失败 {}: {}", entry_path.display(), e))?;
        }
    }

    Ok((cleared_bytes, cleared_files))
}

/// 按类型清理缓存
#[tauri::command]
pub fn clear_cache(cache_type: String) -> Result<ClearCacheResult, String> {
    let claude_dir = get_claude_dir()?;
    let cobalt_dir = get_cobalt_dir()?;

    let mut total_bytes: u64 = 0;
    let mut total_files: u64 = 0;

    let types: Vec<&str> = if cache_type == "all" {
        vec!["conversations", "backups", "marketplace"]
    } else {
        vec![cache_type.as_str()]
    };

    for t in types {
        let path = match t {
            "conversations" => claude_dir.join("projects"),
            "backups" => claude_dir.join("backups"),
            "marketplace" => cobalt_dir.join(".cache").join("marketplace"),
            _ => return Err(format!("未知的缓存类型: {}", t)),
        };

        let (bytes, files) = clear_dir_contents(&path)?;
        total_bytes += bytes;
        total_files += files;
    }

    Ok(ClearCacheResult {
        cleared_bytes: total_bytes,
        cleared_files: total_files,
    })
}
