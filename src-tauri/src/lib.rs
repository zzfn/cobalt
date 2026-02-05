// Cobalt - Claude 配置管理工具
#![allow(unexpected_cfgs)]

mod commands;

use commands::{
    // 配置命令
    backup_config, clear_api_config, get_claude_config_dir, read_api_profiles, read_claude_md,
    read_conversation_history, read_settings, switch_api_profile, update_env_vars,
    write_api_profiles, write_claude_md, write_settings,
    // Skills 命令
    create_skill, install_skill_from_repo, list_installed_skills, list_skill_files,
    read_skill_md, read_skill_registry, toggle_skill, uninstall_skill, write_skill_registry,
};

#[cfg(target_os = "macos")]
#[tauri::command]
fn set_window_theme(window: tauri::Window, theme: String) {
    use cocoa::appkit::{NSColor, NSWindow};
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSString;
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        let ns_window = window.ns_window().unwrap() as id;

        // 根据主题设置窗口背景色
        let color = if theme == "dark" {
            // 深色主题：hsl(222.2 84% 4.9%) = rgb(2, 6, 23)
            NSColor::colorWithSRGBRed_green_blue_alpha_(
                nil,
                2.0 / 255.0,
                6.0 / 255.0,
                23.0 / 255.0,
                1.0,
            )
        } else {
            // 浅色主题：白色
            NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 1.0, 1.0, 1.0, 1.0)
        };

        ns_window.setBackgroundColor_(color);

        // 设置窗口外观以改变标题栏文字颜色
        // 使用正确的 NSAppearance 常量名称
        let appearance_name = if theme == "dark" {
            NSString::alloc(nil).init_str("NSAppearanceNameDarkAqua")
        } else {
            NSString::alloc(nil).init_str("NSAppearanceNameAqua")
        };

        let appearance_class = class!(NSAppearance);
        let appearance: id = msg_send![appearance_class, appearanceNamed: appearance_name];

        if appearance != nil {
            let _: () = msg_send![ns_window, setAppearance: appearance];
        }
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn set_window_theme(_window: tauri::Window, _theme: String) {
    // 非 macOS 平台不需要处理
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            install_skill_from_repo,
            create_skill,
            // 窗口主题
            set_window_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
