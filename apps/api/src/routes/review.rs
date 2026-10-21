use axum::{extract::State, http::StatusCode, Extension, Json};
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

#[derive(serde::Serialize)]
pub struct ReviewResponse {
    pub overall_status: String,
    pub missing_items_count: i64,
    pub risky_items_count: i64,
    pub completed_items_count: i64,
    pub total_items_count: i64,
}

pub async fn get_review(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<ReviewResponse>, (StatusCode, Json<serde_json::Value>)> {
    let counts = sqlx::query_as::<_, (i64, i64, i64, i64)>(
        r#"SELECT
           COUNT(*) FILTER (WHERE status = 'missing') as missing,
           COUNT(*) FILTER (WHERE status = 'risky') as risky,
           COUNT(*) FILTER (WHERE status IN ('accepted', 'uploaded')) as completed,
           COUNT(*) as total
           FROM user_checklist_items WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    let (missing, risky, completed, total) = counts;
    let status = if missing == 0 && risky == 0 {
        "ready"
    } else if missing == total {
        "incomplete"
    } else {
        "needs_review"
    };

    Ok(Json(ReviewResponse {
        overall_status: status.to_string(),
        missing_items_count: missing,
        risky_items_count: risky,
        completed_items_count: completed,
        total_items_count: total,
    }))
}

pub async fn generate(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<ReviewResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Same logic as get_review for now — generates fresh counts
    get_review(State(state), Extension(user_id)).await
}
