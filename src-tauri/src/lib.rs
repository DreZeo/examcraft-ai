mod error;
mod keychain;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            keychain::store_api_key,
            keychain::get_api_key,
            keychain::delete_api_key,
            keychain::has_api_key,
            storage::get_data_dir,
            storage::set_data_dir,
            storage::default_data_dir,
            storage::load_config,
            storage::save_config,
            storage::load_working_paper,
            storage::save_working_paper,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
