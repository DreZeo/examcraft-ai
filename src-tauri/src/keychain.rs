use crate::error::{AppError, AppResult};
use keyring::Entry;

/// Service name under which all API keys are stored in the OS keychain.
const SERVICE: &str = "com.examgen.app";

fn entry(account: &str) -> AppResult<Entry> {
    Entry::new(SERVICE, account).map_err(AppError::from)
}

/// Store an API key in the OS keychain, keyed by the model-config id.
#[tauri::command]
pub fn store_api_key(account: String, secret: String) -> AppResult<()> {
    entry(&account)?.set_password(&secret).map_err(AppError::from)
}

/// Retrieve an API key. Returns None if no entry exists.
#[tauri::command]
pub fn get_api_key(account: String) -> AppResult<Option<String>> {
    match entry(&account)?.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::from(e)),
    }
}

/// Delete an API key. No-op if the entry does not exist.
#[tauri::command]
pub fn delete_api_key(account: String) -> AppResult<()> {
    match entry(&account)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::from(e)),
    }
}

/// Whether an API key exists for the given account.
#[tauri::command]
pub fn has_api_key(account: String) -> AppResult<bool> {
    Ok(get_api_key(account)?.is_some())
}
