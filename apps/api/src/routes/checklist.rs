use axum::{extract::{Path, State}, http::StatusCode, Extension, Json};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::checklist::{ChecklistItemResponse, ChecklistResponse, StatusUpdateRequest, UserChecklistItem},
    services::rules_engine,
    AppState,
};

pub async fn get_checklist(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<ChecklistResponse>, (StatusCode, Json<serde_json::Value>)> {
    let items = sqlx::query_as::<_, UserChecklistItem>(
        "SELECT * FROM user_checklist_items WHERE user_id = $1 ORDER BY display_order",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    let response = ChecklistResponse {
        items: items
            .into_iter()
            .map(|i| ChecklistItemResponse {
                id: i.id,
                template_id: i.template_id,
                title: i.title,
                description: i.description,
                required: i.required,
                status: i.status,
                display_order: i.display_order,
                accepted_document_types: None,
                evidence_examples: None,
                freshness_window_days: None,
                min_balance_amount: None,
                min_validity_days: None,
            })
            .collect(),
    };

    Ok(Json(response))
}

pub async fn generate(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<ChecklistResponse>, (StatusCode, Json<serde_json::Value>)> {
    let items = rules_engine::generate_checklist(&state.db, user_id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to generate checklist: {}", e)})),
            )
        })?;

    Ok(Json(ChecklistResponse { items }))
}

pub async fn update_status(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(item_id): Path<Uuid>,
    Json(req): Json<StatusUpdateRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let Some(next) = domain::checklist::normalize_checklist_status(&req.status) else {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(serde_json::json!({"error": "Unknown checklist status"})),
        ));
    };

    let current = sqlx::query_as::<_, UserChecklistItem>(
        "SELECT * FROM user_checklist_items WHERE id = $1 AND user_id = $2",
    )
    .bind(item_id)
    .bind(user_id)
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
            Json(serde_json::json!({"error": "Checklist item not found"})),
        )
    })?;

    if !domain::checklist::allows_checklist_transition(&current.status, next) {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "error": format!("Cannot change status from {} to {}", current.status, next)
            })),
        ));
    }

    if next == "missing" {
        crate::routes::documents::remove_documents_for_item(&state, user_id, item_id)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("Failed to clear documents: {e}")})),
                )
            })?;
    }

    let updated = sqlx::query(
        "UPDATE user_checklist_items SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
    )
    .bind(next)
    .bind(item_id)
    .bind(user_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    if updated.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Checklist item not found"})),
        ));
    }

    Ok(Json(serde_json::json!({"status": next})))
}
