//! Web search provider proxy layer.
//!
//! Provider-specific API shapes are normalized here so the frontend can inject
//! one stable search result contract into assistant turns.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::time::Duration;

const SHORT_TIMEOUT: Duration = Duration::from_secs(30);
const TAVILY_BASE_URL: &str = "https://api.tavily.com";
const EXA_BASE_URL: &str = "https://api.exa.ai";
const MAX_BODY_CHARS: usize = 500;
const MAX_DEEP_CONTENT_CHARS: usize = 3000;

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum WebSearchProvider {
    Tavily,
    Exa,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum WebSearchContentMode {
    Summary,
    Deep,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebSearchResult {
    title: String,
    url: String,
    snippet: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    published_at: Option<String>,
    provider: WebSearchProvider,
}

fn client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .timeout(SHORT_TIMEOUT)
        .build()
        .map_err(AppError::from)
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        s.chars().take(max).collect::<String>() + "…"
    }
}

async fn status_error(resp: reqwest::Response) -> AppError {
    let status = resp.status();
    match status.as_u16() {
        401 | 403 => AppError::Auth,
        429 => AppError::Quota,
        code => {
            let body = resp.text().await.unwrap_or_default();
            AppError::Http(format!(
                "HTTP {}: {}",
                code,
                truncate(&body, MAX_BODY_CHARS)
            ))
        }
    }
}

fn clamp_result_count(count: u8) -> u8 {
    count.clamp(3, 10)
}

#[tauri::command]
pub async fn web_search(
    provider: WebSearchProvider,
    api_key: String,
    query: String,
    result_count: u8,
    content_mode: WebSearchContentMode,
) -> AppResult<Vec<WebSearchResult>> {
    match provider {
        WebSearchProvider::Tavily => {
            tavily_search(api_key, query, clamp_result_count(result_count), content_mode).await
        }
        WebSearchProvider::Exa => {
            exa_search(api_key, query, clamp_result_count(result_count), content_mode).await
        }
    }
}

#[tauri::command]
pub async fn test_web_search(
    provider: WebSearchProvider,
    api_key: String,
    content_mode: WebSearchContentMode,
) -> AppResult<()> {
    web_search(
        provider,
        api_key,
        "test connection".to_string(),
        3,
        content_mode,
    )
    .await
    .map(|_| ())
}

// --- Tavily ------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct TavilySearchResponse {
    #[serde(default)]
    results: Vec<TavilyResult>,
}

#[derive(Debug, Deserialize)]
struct TavilyResult {
    #[serde(default)]
    title: String,
    #[serde(default)]
    url: String,
    #[serde(default)]
    content: String,
    #[serde(default)]
    raw_content: Option<String>,
    #[serde(default)]
    published_date: Option<String>,
}

async fn tavily_search(
    api_key: String,
    query: String,
    result_count: u8,
    content_mode: WebSearchContentMode,
) -> AppResult<Vec<WebSearchResult>> {
    let include_raw_content = matches!(content_mode, WebSearchContentMode::Deep);
    let body = serde_json::json!({
        "query": query,
        "max_results": result_count,
        "search_depth": "basic",
        "include_answer": false,
        "include_raw_content": include_raw_content,
    });

    let resp = client()?
        .post(format!("{}/search", TAVILY_BASE_URL))
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(status_error(resp).await);
    }

    let parsed: TavilySearchResponse = resp.json().await?;
    Ok(parsed
        .results
        .into_iter()
        .filter(|result| !result.url.is_empty())
        .map(|result| {
            let content = result
                .raw_content
                .filter(|value| !value.trim().is_empty())
                .map(|value| truncate(&value, MAX_DEEP_CONTENT_CHARS));
            WebSearchResult {
                title: result.title,
                url: result.url,
                snippet: result.content,
                content,
                published_at: result.published_date,
                provider: WebSearchProvider::Tavily,
            }
        })
        .collect())
}

// --- Exa ---------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct ExaSearchResponse {
    #[serde(default)]
    results: Vec<ExaResult>,
}

#[derive(Debug, Deserialize)]
struct ExaResult {
    #[serde(default)]
    title: String,
    #[serde(default)]
    url: String,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    highlights: Vec<String>,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    published_date: Option<String>,
}

async fn exa_search(
    api_key: String,
    query: String,
    result_count: u8,
    content_mode: WebSearchContentMode,
) -> AppResult<Vec<WebSearchResult>> {
    let contents = match content_mode {
        WebSearchContentMode::Summary => serde_json::json!({
            "highlights": {
                "query": query,
                "maxCharacters": 700
            }
        }),
        WebSearchContentMode::Deep => serde_json::json!({
            "text": {
                "maxCharacters": MAX_DEEP_CONTENT_CHARS
            }
        }),
    };
    let body = serde_json::json!({
        "query": query,
        "numResults": result_count,
        "contents": contents,
    });

    let resp = client()?
        .post(format!("{}/search", EXA_BASE_URL))
        .header("x-api-key", api_key)
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(status_error(resp).await);
    }

    let parsed: ExaSearchResponse = resp.json().await?;
    Ok(parsed
        .results
        .into_iter()
        .filter(|result| !result.url.is_empty())
        .map(|result| {
            let snippet = if !result.highlights.is_empty() {
                result.highlights.join("\n")
            } else {
                result.summary.clone().unwrap_or_default()
            };
            let content = result
                .text
                .filter(|value| !value.trim().is_empty())
                .map(|value| truncate(&value, MAX_DEEP_CONTENT_CHARS));
            WebSearchResult {
                title: result.title,
                url: result.url,
                snippet,
                content,
                published_at: result.published_date,
                provider: WebSearchProvider::Exa,
            }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn result_count_is_bounded() {
        assert_eq!(clamp_result_count(1), 3);
        assert_eq!(clamp_result_count(5), 5);
        assert_eq!(clamp_result_count(99), 10);
    }

    #[test]
    fn truncate_respects_char_boundaries() {
        assert_eq!(truncate("hello", 10), "hello");
        assert_eq!(truncate("hello", 3), "hel…");
    }
}
