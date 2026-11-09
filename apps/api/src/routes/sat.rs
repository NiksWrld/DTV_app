//! Sports Authority of Thailand (SAT) recognition: provider evidence upload,
//! admin review, and per-embassy "requires SAT for Muay Thai" rules.

use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Extension, Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::{models::profile::Embassy, AppState};

type ApiError = (StatusCode, Json<serde_json::Value>);

fn fail(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(json!({ "error": message.into() })))
}

fn db(e: impl std::fmt::Display) -> ApiError {
    fail(StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {e}"))
}

/// SQL expression: approved by an admin and not expired.
pub const SAT_CERTIFIED_SQL: &str =
    "(sat_status = 'approved' AND (sat_valid_until IS NULL OR sat_valid_until >= CURRENT_DATE))";

const MAX_EVIDENCE: usize = 10 * 1024 * 1024;

#[derive(Debug, FromRow, Serialize)]
pub struct SatInfo {
    pub provider_id: Uuid,
    pub provider_name: String,
    pub category: String,
    pub location: Option<String>,
    pub owner_email: Option<String>,
    pub sat_status: String,
    pub sat_certified: bool,
    pub sat_certificate_number: Option<String>,
    pub sat_valid_until: Option<NaiveDate>,
    pub sat_evidence_filename: Option<String>,
    pub has_evidence: bool,
    pub sat_submitted_at: Option<DateTime<Utc>>,
    pub sat_reviewed_at: Option<DateTime<Utc>>,
    pub sat_review_note: Option<String>,
}

fn sat_select() -> String {
    format!(
        r#"SELECT p.id AS provider_id, p.name AS provider_name, p.category, p.location,
                  u.email AS owner_email, p.sat_status,
                  {cert} AS sat_certified,
                  p.sat_certificate_number, p.sat_valid_until, p.sat_evidence_filename,
                  (p.sat_evidence_key IS NOT NULL) AS has_evidence,
                  p.sat_submitted_at, p.sat_reviewed_at, p.sat_review_note
           FROM providers p
           LEFT JOIN users u ON u.id = p.owner_user_id"#,
        cert = SAT_CERTIFIED_SQL.replace("sat_", "p.sat_")
    )
}

async fn fetch_info(state: &AppState, provider_id: Uuid) -> Result<SatInfo, ApiError> {
    sqlx::query_as::<_, SatInfo>(&format!("{} WHERE p.id = $1", sat_select()))
        .bind(provider_id)
        .fetch_optional(&state.db)
        .await
        .map_err(db)?
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Provider not found"))
}

async fn owned_provider(state: &AppState, user_id: Uuid) -> Result<Uuid, ApiError> {
    let role: String = sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(db)?
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "User not found"))?;
    if role != "provider" && role != "admin" {
        return Err(fail(StatusCode::FORBIDDEN, "Provider account required"));
    }
    sqlx::query_scalar("SELECT id FROM providers WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(db)?
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Create or claim a listing first"))
}

// ── Provider ────────────────────────────────────────────────────────────────

pub async fn my_sat(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<SatInfo>, ApiError> {
    let id = owned_provider(&state, user_id).await?;
    Ok(Json(fetch_info(&state, id).await?))
}

/// Multipart: `file` (PDF/JPG/PNG), `certificate_number`, `valid_until` (YYYY-MM-DD).
/// Puts the provider into `pending` until an admin reviews it.
pub async fn submit_sat(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<SatInfo>, ApiError> {
    let provider_id = owned_provider(&state, user_id).await?;
    let mut data: Option<Vec<u8>> = None;
    let mut filename = String::from("sat-certificate");
    let mut content_type = String::new();
    let mut number: Option<String> = None;
    let mut valid_until: Option<NaiveDate> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| fail(StatusCode::BAD_REQUEST, e.to_string()))?
    {
        match field.name().unwrap_or("") {
            "file" => {
                if let Some(name) = field.file_name() {
                    filename = name.to_string();
                }
                if let Some(ct) = field.content_type() {
                    content_type = ct.to_string();
                }
                let bytes = field.bytes().await.map_err(|e| fail(StatusCode::BAD_REQUEST, e.to_string()))?;
                if bytes.len() > MAX_EVIDENCE {
                    return Err(fail(StatusCode::PAYLOAD_TOO_LARGE, "File must be under 10 MB"));
                }
                data = Some(bytes.to_vec());
            }
            "certificate_number" => {
                number = field.text().await.ok().map(|t| t.trim().to_string()).filter(|t| !t.is_empty());
            }
            "valid_until" => {
                valid_until = field
                    .text()
                    .await
                    .ok()
                    .and_then(|t| NaiveDate::parse_from_str(t.trim(), "%Y-%m-%d").ok());
            }
            _ => {}
        }
    }

    let data = data.ok_or_else(|| fail(StatusCode::BAD_REQUEST, "Attach the SAT certificate (PDF, JPG or PNG)"))?;
    let canonical = crate::routes::documents::canonical_content_type(&content_type, &filename)
        .ok_or_else(|| fail(StatusCode::UNPROCESSABLE_ENTITY, "Only PDF, JPG and PNG files are allowed"))?;
    if valid_until.is_some_and(|d| d < Utc::now().date_naive()) {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "This certificate has already expired"));
    }
    let ext = match canonical {
        "application/pdf" => "pdf",
        "image/png" => "png",
        _ => "jpg",
    };
    let key = format!("providers/{}/sat/{}.{}", provider_id, Uuid::new_v4(), ext);
    state
        .storage
        .upload(&key, data, canonical)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let old_key: Option<String> = sqlx::query_scalar(
        r#"WITH old AS (SELECT sat_evidence_key FROM providers WHERE id = $1)
           UPDATE providers SET
             sat_status = 'pending', sat_evidence_key = $2, sat_evidence_filename = $3,
             sat_certificate_number = COALESCE($4, sat_certificate_number),
             sat_valid_until = COALESCE($5, sat_valid_until),
             sat_submitted_at = now(), sat_review_note = NULL
           WHERE id = $1
           RETURNING (SELECT sat_evidence_key FROM old)"#,
    )
    .bind(provider_id)
    .bind(&key)
    .bind(&filename)
    .bind(number)
    .bind(valid_until)
    .fetch_one(&state.db)
    .await
    .map_err(db)?;
    if let Some(old) = old_key.filter(|old| old != &key) {
        if let Err(e) = state.storage.delete(&old).await {
            tracing::warn!("Could not delete old SAT evidence {}: {}", old, e);
        }
    }
    Ok(Json(fetch_info(&state, provider_id).await?))
}

async fn evidence_url(state: &AppState, provider_id: Uuid) -> Result<Json<serde_json::Value>, ApiError> {
    let row: Option<(Option<String>, Option<String>)> =
        sqlx::query_as("SELECT sat_evidence_key, sat_evidence_filename FROM providers WHERE id = $1")
            .bind(provider_id)
            .fetch_optional(&state.db)
            .await
            .map_err(db)?;
    let (key, filename) = row.ok_or_else(|| fail(StatusCode::NOT_FOUND, "Provider not found"))?;
    let key = key.ok_or_else(|| fail(StatusCode::NOT_FOUND, "No SAT certificate uploaded"))?;
    let url = state
        .storage
        .presigned_url(&key, 3600)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(json!({ "url": url, "filename": filename })))
}

pub async fn my_sat_evidence(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let id = owned_provider(&state, user_id).await?;
    evidence_url(&state, id).await
}

// ── Admin ───────────────────────────────────────────────────────────────────

/// Pending reviews first, then every provider that ever had SAT data.
pub async fn admin_list(State(state): State<Arc<AppState>>) -> Result<Json<Vec<SatInfo>>, ApiError> {
    let rows = sqlx::query_as::<_, SatInfo>(&format!(
        "{} WHERE p.sat_status <> 'none' ORDER BY (p.sat_status = 'pending') DESC, p.sat_submitted_at DESC NULLS LAST, p.name",
        sat_select()
    ))
    .fetch_all(&state.db)
    .await
    .map_err(db)?;
    Ok(Json(rows))
}

pub async fn admin_evidence(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    evidence_url(&state, id).await
}

#[derive(Debug, Deserialize)]
pub struct ReviewBody {
    /// approve | reject | revoke
    pub action: String,
    pub certificate_number: Option<String>,
    pub valid_until: Option<NaiveDate>,
    pub note: Option<String>,
}

pub async fn admin_review(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<ReviewBody>,
) -> Result<Json<SatInfo>, ApiError> {
    let note = body.note.as_deref().map(str::trim).filter(|n| !n.is_empty());
    let number = body.certificate_number.as_deref().map(str::trim).filter(|n| !n.is_empty());
    let status = match body.action.as_str() {
        "approve" => {
            if body.valid_until.is_some_and(|d| d < Utc::now().date_naive()) {
                return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "The expiry date is in the past"));
            }
            "approved"
        }
        "reject" => "rejected",
        // Revoked certificates stay on the review list, marked rejected with the note.
        "revoke" => "rejected",
        _ => return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Action must be approve, reject or revoke")),
    };
    let updated = sqlx::query(
        r#"UPDATE providers SET
             sat_status = $2,
             sat_certificate_number = COALESCE($3, sat_certificate_number),
             sat_valid_until = CASE WHEN $2 = 'approved' THEN COALESCE($4, sat_valid_until) ELSE sat_valid_until END,
             sat_review_note = $5,
             sat_reviewed_at = now()
           WHERE id = $1"#,
    )
    .bind(id)
    .bind(status)
    .bind(number)
    .bind(body.valid_until)
    .bind(note)
    .execute(&state.db)
    .await
    .map_err(db)?;
    if updated.rows_affected() == 0 {
        return Err(fail(StatusCode::NOT_FOUND, "Provider not found"));
    }
    Ok(Json(fetch_info(&state, id).await?))
}

#[derive(Debug, Deserialize)]
pub struct EmbassyRuleBody {
    pub requires_sat_for_muay_thai: bool,
    pub sat_note: Option<String>,
}

pub async fn admin_update_embassy_rule(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<EmbassyRuleBody>,
) -> Result<Json<Embassy>, ApiError> {
    sqlx::query_as::<_, Embassy>(
        r#"UPDATE embassies SET requires_sat_for_muay_thai = $2,
             sat_note = CASE WHEN $3::text IS NULL THEN sat_note ELSE NULLIF(TRIM($3::text), '') END
           WHERE id = $1 RETURNING *"#,
    )
    .bind(id)
    .bind(body.requires_sat_for_muay_thai)
    .bind(body.sat_note)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?
    .map(Json)
    .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Embassy not found"))
}
