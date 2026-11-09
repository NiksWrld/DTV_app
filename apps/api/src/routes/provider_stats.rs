use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

type ApiError = (StatusCode, Json<serde_json::Value>);

#[derive(Debug, Default, Clone, Copy, FromRow, Serialize)]
pub struct ViewStats {
    pub views_30d: i64,
    pub views_total: i64,
}

#[derive(Debug, FromRow, Serialize)]
pub struct ProviderViewRow {
    pub provider_id: Uuid,
    pub claim_status: String,
    pub owner_email: Option<String>,
    pub views_30d: i64,
    pub views_total: i64,
}

/// Count one view per viewer, provider, and day. The provider's own account and
/// admins are left out so the numbers reflect real applicants.
pub async fn record_view(state: &AppState, provider_id: Uuid, viewer_key: &str, user_id: Option<Uuid>) {
    let result = sqlx::query(
        r#"INSERT INTO provider_views (provider_id, viewer_key, view_date)
           SELECT $1, $2, CURRENT_DATE
           WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = $3 AND role = 'admin')
             AND NOT EXISTS (SELECT 1 FROM providers WHERE id = $1 AND owner_user_id = $3)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(provider_id)
    .bind(viewer_key)
    .bind(user_id)
    .execute(&state.db)
    .await;
    if let Err(e) = result {
        tracing::warn!("Could not record provider view: {}", e);
    }
}

pub async fn stats_for(state: &AppState, provider_id: Uuid) -> ViewStats {
    sqlx::query_as::<_, ViewStats>(
        r#"SELECT
             COUNT(*) FILTER (WHERE view_date > CURRENT_DATE - 30) AS views_30d,
             COUNT(*) AS views_total
           FROM provider_views WHERE provider_id = $1"#,
    )
    .bind(provider_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or_default()
}

/// Views for every provider, for the admin list and claim outreach.
pub async fn list_view_stats(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ProviderViewRow>>, ApiError> {
    let rows = sqlx::query_as::<_, ProviderViewRow>(
        r#"SELECT p.id AS provider_id, p.claim_status, u.email AS owner_email,
                  COUNT(v.viewer_key) FILTER (WHERE v.view_date > CURRENT_DATE - 30) AS views_30d,
                  COUNT(v.viewer_key) AS views_total
           FROM providers p
           LEFT JOIN provider_views v ON v.provider_id = p.id
           LEFT JOIN users u ON u.id = p.owner_user_id
           GROUP BY p.id, p.claim_status, u.email"#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;
    Ok(Json(rows))
}
