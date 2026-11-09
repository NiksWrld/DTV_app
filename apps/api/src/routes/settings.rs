//! Global app settings (admin-editable), stored in `app_settings`.

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

type ApiError = (StatusCode, Json<serde_json::Value>);

pub const HIDE_UNCLAIMED_CONTACTS: &str = "hide_unclaimed_contacts";

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub hide_unclaimed_contacts: bool,
}

async fn flag(state: &AppState, key: &str) -> bool {
    sqlx::query_scalar::<_, serde_json::Value>("SELECT value FROM app_settings WHERE key = $1")
        .bind(key)
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

/// True when unclaimed/unverified providers should be shown without contact
/// details for this viewer. Admins always see everything.
pub async fn hide_unclaimed_for(state: &AppState, viewer: Uuid) -> bool {
    if !flag(state, HIDE_UNCLAIMED_CONTACTS).await {
        return false;
    }
    let role: Option<String> = sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(viewer)
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten();
    role.as_deref() != Some("admin")
}

pub async fn get_settings(State(state): State<Arc<AppState>>) -> Result<Json<AppSettings>, ApiError> {
    Ok(Json(AppSettings {
        hide_unclaimed_contacts: flag(&state, HIDE_UNCLAIMED_CONTACTS).await,
    }))
}

pub async fn update_settings(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AppSettings>,
) -> Result<Json<AppSettings>, ApiError> {
    sqlx::query(
        r#"INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()"#,
    )
    .bind(HIDE_UNCLAIMED_CONTACTS)
    .bind(json!(body.hide_unclaimed_contacts))
    .execute(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Database error: {}", e)})),
        )
    })?;
    get_settings(State(state)).await
}
