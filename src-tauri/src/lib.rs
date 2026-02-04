// Cobalt - Claude 配置管理工具
mod commands;

use commands::{
    // 配置命令
    backup_config, clear_api_config, get_claude_config_dir, read_api_profiles, read_claude_md,
    read_conversation_history, read_settings, switch_api_profile, update_env_vars,
    write_api_profiles, write_claude_md, write_settings,
    // Skills 命令
    list_installed_skills, list_skill_files, read_skill_md, read_skill_registry, toggle_skill,
    uninstall_skill, write_skill_registry,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // 配置命令
            get_claude_config_dir,
            read_settings,
            write_settings,
            read_claude_md,
            write_claude_md,
            backup_config,
            read_api_profiles,
            write_api_profiles,
            switch_api_profile,
            update_env_vars,
            clear_api_config,
            read_conversation_history,
            // Skills 命令
            read_skill_registry,
            write_skill_registry,
            read_skill_md,
            list_skill_files,
            toggle_skill,
            uninstall_skill,
            list_installed_skills,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
