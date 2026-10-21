use axum::{extract::{Path, State}, http::StatusCode, Extension, Json};
use chrono::NaiveDate;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::compliance::{
        ComplianceOverview, ComplianceTask, CompleteTaskRequest, CreateTaskRequest,
        SetEntryRequest, UpdateTaskRequest, VisaEntry,
    },
    AppState,
};

fn db_err(e: impl std::fmt::Display) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::INTERNAL_SERVER_ERROR,
     Json(serde_json::json!({"error": format!("Database error: {}", e)})))
}

pub async fn get_overview(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<ComplianceOverview>, (StatusCode, Json<serde_json::Value>)> {
    let entry = sqlx::query_as::<_, VisaEntry>(
        "SELECT * FROM visa_entries WHERE user_id = $1 AND is_current = true ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db_err)?;

    let tasks = sqlx::query_as::<_, ComplianceTask>(
        r#"SELECT id, user_id, "type", title, due_date, completed_at, document_id, notes, created_at, updated_at
           FROM compliance_tasks
           WHERE user_id = $1
           ORDER BY completed_at ASC NULLS FIRST, due_date ASC"#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(ComplianceOverview { entry, tasks }))
}

pub async fn set_entry(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<SetEntryRequest>,
) -> Result<Json<VisaEntry>, (StatusCode, Json<serde_json::Value>)> {
    // Mark all previous entries not current
    sqlx::query("UPDATE visa_entries SET is_current = false WHERE user_id = $1")
        .bind(user_id)
        .execute(&state.db)
        .await
        .map_err(db_err)?;

    let stamp_expires: NaiveDate = req.entry_date + chrono::Duration::days(180);

    let entry = sqlx::query_as::<_, VisaEntry>(
        r#"INSERT INTO visa_entries (user_id, entry_date, stamp_expires, port_of_entry, notes, is_current)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING *"#,
    )
    .bind(user_id)
    .bind(req.entry_date)
    .bind(stamp_expires)
    .bind(req.port_of_entry)
    .bind(req.notes)
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(entry))
}

pub async fn create_task(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<CreateTaskRequest>,
) -> Result<Json<ComplianceTask>, (StatusCode, Json<serde_json::Value>)> {
    let task = sqlx::query_as::<_, ComplianceTask>(
        r#"INSERT INTO compliance_tasks (user_id, "type", title, due_date, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, user_id, "type", title, due_date, completed_at, document_id, notes, created_at, updated_at"#,
    )
    .bind(user_id)
    .bind(&req.task_type)
    .bind(&req.title)
    .bind(req.due_date)
    .bind(req.notes)
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(task))
}

pub async fn complete_task(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(task_id): Path<Uuid>,
    Json(req): Json<CompleteTaskRequest>,
) -> Result<Json<ComplianceOverview>, (StatusCode, Json<serde_json::Value>)> {
    let task = sqlx::query_as::<_, ComplianceTask>(
        r#"UPDATE compliance_tasks
           SET completed_at = NOW(),
               document_id  = COALESCE($1, document_id),
               notes        = COALESCE($2, notes),
               updated_at   = NOW()
           WHERE id = $3 AND user_id = $4
           RETURNING id, user_id, "type", title, due_date, completed_at, document_id, notes, created_at, updated_at"#,
    )
    .bind(req.document_id)
    .bind(req.notes)
    .bind(task_id)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    // Auto-schedule next 90-day notice
    if task.task_type == "90_day_notice" {
        if let Some(completed) = task.completed_at {
            let next_due: NaiveDate = completed.date_naive() + chrono::Duration::days(90);
            sqlx::query(
                r#"INSERT INTO compliance_tasks (user_id, "type", title, due_date)
                   VALUES ($1, '90_day_notice', '90-Day Report', $2)"#,
            )
            .bind(user_id)
            .bind(next_due)
            .execute(&state.db)
            .await
            .map_err(db_err)?;
        }
    }

    // Return updated overview
    get_overview(
        State(state),
        Extension(user_id),
    )
    .await
}

pub async fn update_task(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(task_id): Path<Uuid>,
    Json(req): Json<UpdateTaskRequest>,
) -> Result<Json<ComplianceTask>, (StatusCode, Json<serde_json::Value>)> {
    let task = sqlx::query_as::<_, ComplianceTask>(
        r#"UPDATE compliance_tasks
           SET title      = COALESCE($1, title),
               due_date   = COALESCE($2, due_date),
               notes      = COALESCE($3, notes),
               updated_at = NOW()
           WHERE id = $4 AND user_id = $5
           RETURNING id, user_id, "type", title, due_date, completed_at, document_id, notes, created_at, updated_at"#,
    )
    .bind(req.title)
    .bind(req.due_date)
    .bind(req.notes)
    .bind(task_id)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(task))
}

pub async fn delete_task(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(task_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM compliance_tasks WHERE id = $1 AND user_id = $2")
        .bind(task_id)
        .bind(user_id)
        .execute(&state.db)
        .await
        .map_err(db_err)?;

    Ok(Json(serde_json::json!({"status": "deleted"})))
}
