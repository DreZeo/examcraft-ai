use serde::Serialize;

/// Application-level error returned to the frontend as a string-coded payload.
///
/// Each command returns `Result<T, AppError>`; Tauri serializes the error so the
/// React layer can map the `code` to a user-friendly, localized message.
#[derive(Debug, Clone, thiserror::Error, Serialize)]
#[serde(tag = "code", content = "detail", rename_all = "camelCase")]
pub enum AppError {
    #[error("keychain error: {0}")]
    Keychain(String),

    #[error("io error: {0}")]
    Io(String),

    #[error("serialization error: {0}")]
    Serde(String),

    #[error("http error: {0}")]
    Http(String),

    #[error("authentication failed")]
    Auth,

    #[error("quota exceeded or rate limited")]
    Quota,

    #[error("request timed out")]
    Timeout,

    #[error("network error: {0}")]
    Network(String),
}

impl From<keyring::Error> for AppError {
    fn from(e: keyring::Error) -> Self {
        AppError::Keychain(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Serde(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        if e.is_timeout() {
            AppError::Timeout
        } else if e.is_connect() {
            AppError::Network(e.to_string())
        } else {
            AppError::Http(e.to_string())
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    /// The serialized `code` is the load-bearing contract with the frontend
    /// (`errorMessages.ts` maps these exact lowercase strings to i18n keys).
    #[test]
    fn error_codes_serialize_camel_case() {
        assert_eq!(
            serde_json::to_string(&AppError::Auth).unwrap(),
            r#"{"code":"auth"}"#
        );
        assert_eq!(
            serde_json::to_string(&AppError::Quota).unwrap(),
            r#"{"code":"quota"}"#
        );
        assert_eq!(
            serde_json::to_string(&AppError::Timeout).unwrap(),
            r#"{"code":"timeout"}"#
        );
        assert_eq!(
            serde_json::to_string(&AppError::Network("x".into())).unwrap(),
            r#"{"code":"network","detail":"x"}"#
        );
    }
}
