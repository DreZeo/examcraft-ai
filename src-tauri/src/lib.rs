mod error;
mod keychain;
mod openai;
mod storage;
mod web_search;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let (Some(window), Some(icon)) = (
                app.get_webview_window("main"),
                app.default_window_icon().cloned(),
            ) {
                window.set_icon(icon)?;
            }
            Ok(())
        })
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
            storage::relocate_data_dir,
            storage::default_data_dir,
            storage::open_data_dir,
            storage::load_config,
            storage::save_config,
            storage::load_working_paper,
            storage::save_working_paper,
            storage::load_paper_index,
            storage::save_paper_index,
            storage::load_paper,
            storage::save_paper,
            storage::delete_paper,
            storage::load_chat_index,
            storage::save_chat_index,
            storage::load_chat_session,
            storage::save_chat_session,
            storage::delete_chat_session,
            openai::stream_chat,
            openai::abort_chat,
            openai::list_models,
            openai::test_connection,
            web_search::web_search,
            web_search::test_web_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
