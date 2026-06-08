use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

/// Bootstrap pointer stored in the Tauri app-data dir. Its only job is to record
/// where the user chose to keep their data. Everything else lives in that dir.
const BOOTSTRAP_FILE: &str = "bootstrap.json";
const CONFIG_FILE: &str = "config.json";
const WORKING_PAPER_FILE: &str = "working-paper.json";
const PAPERS_DIR: &str = "papers";
const CHATS_DIR: &str = "chats";
const INDEX_FILE: &str = "index.json";

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

fn write_bootstrap(app: &AppHandle, data_dir: String) -> AppResult<()> {
    let boot = Bootstrap {
        data_dir: data_dir.clone(),
    };
    let raw = serde_json::to_string_pretty(&boot)?;
    fs::write(bootstrap_path(app)?, raw)?;
    Ok(())
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
    write_bootstrap(&app, data_dir)?;
    Ok(())
}

/// Move the data directory pointer after copying current data into the target.
#[tauri::command]
pub fn relocate_data_dir(app: AppHandle, target_dir: String) -> AppResult<()> {
    let current = get_data_dir(app.clone())?;
    relocate_data_dir_inner(current.as_deref(), Path::new(&target_dir))?;
    write_bootstrap(&app, target_dir)?;
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

/// Open the configured data directory in the platform file manager.
#[tauri::command]
pub fn open_data_dir(data_dir: String) -> AppResult<()> {
    let path = Path::new(&data_dir);
    fs::create_dir_all(path)?;

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("explorer");
        command.arg(path);
        command
    };

    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(path);
        command
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(path);
        command
    };

    command.spawn()?;
    Ok(())
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

fn relocate_data_dir_inner(current_dir: Option<&str>, target_dir: &Path) -> AppResult<()> {
    fs::create_dir_all(target_dir)?;
    let Some(current_dir) = current_dir else {
        return Ok(());
    };

    let source = Path::new(current_dir);
    if !source.exists() {
        return Ok(());
    }

    let source = source.canonicalize()?;
    let target = target_dir.canonicalize()?;
    if source == target {
        return Ok(());
    }

    if target.starts_with(&source) {
        return Err(crate::error::AppError::Io(
            "target data directory cannot be inside the current data directory".into(),
        ));
    }

    copy_dir_contents(&source, &target)
}

fn copy_dir_contents(source: &Path, target: &Path) -> AppResult<()> {
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        let file_type = entry.file_type()?;

        if file_type.is_dir() {
            if target_path.exists() && !target_path.is_dir() {
                fs::remove_file(&target_path)?;
            }
            copy_dir_contents(&source_path, &target_path)?;
        } else if file_type.is_file() {
            if target_path.exists() && target_path.is_dir() {
                fs::remove_dir_all(&target_path)?;
            }
            fs::copy(&source_path, &target_path)?;
        }
    }
    Ok(())
}

fn safe_json_name(id: &str) -> String {
    id.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
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

// ---- Paper library ----

#[tauri::command]
pub fn load_paper_index(data_dir: String) -> AppResult<Option<String>> {
    read_json_file(&Path::new(&data_dir).join(PAPERS_DIR), INDEX_FILE)
}

#[tauri::command]
pub fn save_paper_index(data_dir: String, contents: String) -> AppResult<()> {
    write_json_file(
        &Path::new(&data_dir).join(PAPERS_DIR),
        INDEX_FILE,
        &contents,
    )
}

#[tauri::command]
pub fn load_paper(data_dir: String, paper_id: String) -> AppResult<Option<String>> {
    let file = format!("{}.json", safe_json_name(&paper_id));
    read_json_file(&Path::new(&data_dir).join(PAPERS_DIR), &file)
}

#[tauri::command]
pub fn save_paper(data_dir: String, paper_id: String, contents: String) -> AppResult<()> {
    let file = format!("{}.json", safe_json_name(&paper_id));
    write_json_file(&Path::new(&data_dir).join(PAPERS_DIR), &file, &contents)?;
    write_json_file(Path::new(&data_dir), WORKING_PAPER_FILE, &contents)
}

#[tauri::command]
pub fn delete_paper(data_dir: String, paper_id: String) -> AppResult<()> {
    let file = format!("{}.json", safe_json_name(&paper_id));
    let path = Path::new(&data_dir).join(PAPERS_DIR).join(file);
    if path.exists() {
        fs::remove_file(path)?;
    }
    let chat_dir = Path::new(&data_dir)
        .join(CHATS_DIR)
        .join(safe_json_name(&paper_id));
    if chat_dir.exists() {
        fs::remove_dir_all(chat_dir)?;
    }
    Ok(())
}

// ---- Paper-scoped chat history ----

#[tauri::command]
pub fn load_chat_index(data_dir: String, paper_id: String) -> AppResult<Option<String>> {
    read_json_file(
        &Path::new(&data_dir)
            .join(CHATS_DIR)
            .join(safe_json_name(&paper_id)),
        INDEX_FILE,
    )
}

#[tauri::command]
pub fn save_chat_index(data_dir: String, paper_id: String, contents: String) -> AppResult<()> {
    write_json_file(
        &Path::new(&data_dir)
            .join(CHATS_DIR)
            .join(safe_json_name(&paper_id)),
        INDEX_FILE,
        &contents,
    )
}

#[tauri::command]
pub fn load_chat_session(
    data_dir: String,
    paper_id: String,
    session_id: String,
) -> AppResult<Option<String>> {
    let file = format!("{}.json", safe_json_name(&session_id));
    read_json_file(
        &Path::new(&data_dir)
            .join(CHATS_DIR)
            .join(safe_json_name(&paper_id)),
        &file,
    )
}

#[tauri::command]
pub fn save_chat_session(
    data_dir: String,
    paper_id: String,
    session_id: String,
    contents: String,
) -> AppResult<()> {
    let file = format!("{}.json", safe_json_name(&session_id));
    write_json_file(
        &Path::new(&data_dir)
            .join(CHATS_DIR)
            .join(safe_json_name(&paper_id)),
        &file,
        &contents,
    )
}

#[tauri::command]
pub fn delete_chat_session(
    data_dir: String,
    paper_id: String,
    session_id: String,
) -> AppResult<()> {
    let file = format!("{}.json", safe_json_name(&session_id));
    let path = Path::new(&data_dir)
        .join(CHATS_DIR)
        .join(safe_json_name(&paper_id))
        .join(file);
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_path(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("examgen-{name}-{nanos}"))
    }

    fn write(path: &Path, contents: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, contents).unwrap();
    }

    #[test]
    fn relocation_copies_all_data_dir_contents() {
        let source = temp_path("source");
        let target = temp_path("target");
        write(&source.join(CONFIG_FILE), r#"{"version":1}"#);
        write(&source.join(WORKING_PAPER_FILE), r#"{"title":"current"}"#);
        write(
            &source.join(PAPERS_DIR).join(INDEX_FILE),
            r#"{"papers":[]}"#,
        );
        write(
            &source.join(PAPERS_DIR).join("paper-1.json"),
            r#"{"title":"A"}"#,
        );
        write(
            &source
                .join(CHATS_DIR)
                .join("paper-1")
                .join("session-1.json"),
            r#"{"messages":[]}"#,
        );

        relocate_data_dir_inner(Some(source.to_str().unwrap()), &target).unwrap();

        assert_eq!(
            fs::read_to_string(target.join(CONFIG_FILE)).unwrap(),
            r#"{"version":1}"#
        );
        assert_eq!(
            fs::read_to_string(target.join(WORKING_PAPER_FILE)).unwrap(),
            r#"{"title":"current"}"#
        );
        assert_eq!(
            fs::read_to_string(target.join(PAPERS_DIR).join(INDEX_FILE)).unwrap(),
            r#"{"papers":[]}"#
        );
        assert_eq!(
            fs::read_to_string(
                target
                    .join(CHATS_DIR)
                    .join("paper-1")
                    .join("session-1.json")
            )
            .unwrap(),
            r#"{"messages":[]}"#
        );

        let _ = fs::remove_dir_all(source);
        let _ = fs::remove_dir_all(target);
    }

    #[test]
    fn relocation_overwrites_existing_target_files() {
        let source = temp_path("source-overwrite");
        let target = temp_path("target-overwrite");
        write(&source.join(CONFIG_FILE), "new config");
        write(&target.join(CONFIG_FILE), "old config");

        relocate_data_dir_inner(Some(source.to_str().unwrap()), &target).unwrap();

        assert_eq!(
            fs::read_to_string(target.join(CONFIG_FILE)).unwrap(),
            "new config"
        );

        let _ = fs::remove_dir_all(source);
        let _ = fs::remove_dir_all(target);
    }

    #[test]
    fn relocation_without_existing_source_behaves_like_first_launch() {
        let missing_source = temp_path("missing-source");
        let target = temp_path("first-launch-target");

        relocate_data_dir_inner(Some(missing_source.to_str().unwrap()), &target).unwrap();

        assert!(target.exists());
        assert!(fs::read_dir(&target).unwrap().next().is_none());

        let _ = fs::remove_dir_all(target);
    }

    #[test]
    fn relocation_to_same_directory_is_noop() {
        let source = temp_path("same-dir");
        write(&source.join(CONFIG_FILE), "config");

        relocate_data_dir_inner(Some(source.to_str().unwrap()), &source).unwrap();

        assert_eq!(
            fs::read_to_string(source.join(CONFIG_FILE)).unwrap(),
            "config"
        );

        let _ = fs::remove_dir_all(source);
    }

    #[test]
    fn relocation_rejects_target_inside_source() {
        let source = temp_path("nested-source");
        write(&source.join(CONFIG_FILE), "config");
        let target = source.join("nested-target");

        let result = relocate_data_dir_inner(Some(source.to_str().unwrap()), &target);

        assert!(result.is_err());
        let _ = fs::remove_dir_all(source);
    }
}
