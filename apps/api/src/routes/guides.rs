use axum::{extract::{Path, State}, http::StatusCode, Json};
use std::sync::Arc;

use crate::{models::guide::Guide, AppState};

pub async fn list_guides(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Guide>>, (StatusCode, Json<serde_json::Value>)> {
    let guides = sqlx::query_as::<_, Guide>(
        "SELECT * FROM guides WHERE published = true AND content_type != 'faq' ORDER BY created_at DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    Ok(Json(guides))
}

pub async fn get_guide(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<Json<Guide>, (StatusCode, Json<serde_json::Value>)> {
    let guide = sqlx::query_as::<_, Guide>("SELECT * FROM guides WHERE slug = $1 AND published = true")
        .bind(&slug)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Guide not found"})),
            )
        })?;

    Ok(Json(guide))
}

pub async fn list_faq(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Guide>>, (StatusCode, Json<serde_json::Value>)> {
    let faqs = sqlx::query_as::<_, Guide>(
        "SELECT * FROM guides WHERE published = true AND content_type = 'faq' ORDER BY title",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    Ok(Json(faqs))
}
