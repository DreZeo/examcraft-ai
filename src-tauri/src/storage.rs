use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Bootstrap pointer stored in the Tauri app-data dir. Its only job is to record
/// where the user chose to keep their data. Everything else lives in that dir.
const BOOTSTRAP_FILE: &str = "bootstrap.json";
const CONFIG_FILE: &str = "config.json";
const WORKING_PAPER_FILE: &str = "working-paper.json";

#[derive(Debug, Serialize, Deserialize)]
pub struct Bootstrap {
    /// Absolute path to the user-chosen data directory.
    pub data_dir: String,
}

fn app_data_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AppError::Io(e.to_string()))?;
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn bootstrap_path(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(app_data_dir(app)?.join(BOOTSTRAP_FILE))
}

/// Read the data directory the user previously chose, if any.
#[tauri::command]
pub fn get_data_dir(app: AppHandle) -> AppResult<Option<String>> {
    let path = bootstrap_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path)?;
    let boot: Bootstrap = serde_json::from_str(&raw)?;
    Ok(Some(boot.data_dir))
}

/// Persist the chosen data directory and create it if needed.
#[tauri::command]
pub fn set_data_dir(app: AppHandle, data_dir: String) -> AppResult<()> {
    fs::create_dir_all(&data_dir)?;
    let boot = Bootstrap {
        data_dir: data_dir.clone(),
    };
    let raw = serde_json::to_string_pretty(&boot)?;
    fs::write(bootstrap_path(&app)?, raw)?;
    Ok(())
}

/// A recommended default data directory (Documents/AI试卷), for first launch.
#[tauri::command]
pub fn default_data_dir(app: AppHandle) -> AppResult<String> {
    let base = app
        .path()
        .document_dir()
        .or_else(|_| app.path().home_dir())
        .map_err(|e| crate::error::AppError::Io(e.to_string()))?;
    Ok(base.join("AI试卷").to_string_lossy().to_string())
}

fn read_json_file(dir: &Path, file: &str) -> AppResult<Option<String>> {
    let path = dir.join(file);
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(fs::read_to_string(&path)?))
}

fn write_json_file(dir: &Path, file: &str, contents: &str) -> AppResult<()> {
    fs::create_dir_all(dir)?;
    fs::write(dir.join(file), contents)?;
    Ok(())
}

/// Load config.json from the data dir as a raw JSON string (validated frontend-side).
#[tauri::command]
pub fn load_config(data_dir: String) -> AppResult<Option<String>> {
    read_json_file(Path::new(&data_dir), CONFIG_FILE)
}

/// Save config.json (already-serialized JSON string from the frontend).
#[tauri::command]
pub fn save_config(data_dir: String, contents: String) -> AppResult<()> {
    write_json_file(Path::new(&data_dir), CONFIG_FILE, &contents)
}

/// Load the auto-saved working paper as a raw JSON string.
#[tauri::command]
pub fn load_working_paper(data_dir: String) -> AppResult<Option<String>> {
    read_json_file(Path::new(&data_dir), WORKING_PAPER_FILE)
}

/// Save the working paper (already-serialized JSON string from the frontend).
#[tauri::command]
pub fn save_working_paper(data_dir: String, contents: String) -> AppResult<()> {
    write_json_file(Path::new(&data_dir), WORKING_PAPER_FILE, &contents)
}
