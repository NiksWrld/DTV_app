//! Enrollment / DTV letter requests between applicants and partner providers.
//!
//! Status flow: requested -> confirmed (letter issued) -> completed,
//! or requested -> declined, or cancelled by the applicant.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::{services::letter_pdf, AppState};

type ApiError = (StatusCode, Json<serde_json::Value>);

fn fail(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(json!({ "error": message.into() })))
}

fn db(e: impl std::fmt::Display) -> ApiError {
    fail(StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {e}"))
}

/// A provider counts as a DTV partner once an admin approved its claim and it is verified.
pub const PARTNER_SQL: &str =
    "(claim_status = 'approved' AND verification_status IN ('verified_docs_seen', 'featured'))";

#[derive(Debug, FromRow, Serialize)]
pub struct Booking {
    pub id: Uuid,
    pub provider_id: Uuid,
    pub provider_name: String,
    pub user_id: Uuid,
    pub student_name: Option<String>,
    pub student_email: String,
    pub nationality: Option<String>,
    pub has_passport_number: bool,
    pub package_id: Option<Uuid>,
    pub package_name: Option<String>,
    pub status: String,
    pub message: Option<String>,
    pub preferred_start: Option<NaiveDate>,
    pub course_name: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub hours_per_week: Option<f64>,
    pub fees_paid: Option<f64>,
    pub currency: String,
    pub reference_code: Option<String>,
    pub letter_document_id: Option<Uuid>,
    pub has_letter: bool,
    pub decline_reason: Option<String>,
    pub issued_at: Option<DateTime<Utc>>,
    pub has_review: bool,
    pub created_at: DateTime<Utc>,
}

const BOOKING_SELECT: &str = r#"
    SELECT b.id, b.provider_id, p.name AS provider_name, b.user_id,
           u.display_name AS student_name, u.email AS student_email,
           ap.nationality,
           (COALESCE(TRIM(ap.passport_number), '') <> '') AS has_passport_number,
           b.package_id, pk.name AS package_name, b.status, b.message, b.preferred_start,
           b.course_name, b.start_date, b.end_date, b.hours_per_week, b.fees_paid, b.currency,
           b.reference_code, b.letter_document_id,
           (b.letter_storage_key IS NOT NULL) AS has_letter,
           b.decline_reason, b.issued_at,
           false AS has_review,
           b.created_at
    FROM provider_bookings b
    JOIN providers p ON p.id = b.provider_id
    JOIN users u ON u.id = b.user_id
    LEFT JOIN applicant_profiles ap ON ap.user_id = b.user_id
    LEFT JOIN provider_packages pk ON pk.id = b.package_id
"#;

async fn fetch_booking(state: &AppState, id: Uuid) -> Result<Booking, ApiError> {
    sqlx::query_as::<_, Booking>(&format!("{BOOKING_SELECT} WHERE b.id = $1"))
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(db)?
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Request not found"))
}

// ── Applicant side ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateRequestBody {
    pub message: Option<String>,
    pub package_id: Option<Uuid>,
    pub preferred_start: Option<NaiveDate>,
}

pub async fn create_request(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(provider_id): Path<Uuid>,
    Json(body): Json<CreateRequestBody>,
) -> Result<Json<Booking>, ApiError> {
    let partner: Option<bool> = sqlx::query_scalar(&format!(
        "SELECT {PARTNER_SQL} AND owner_user_id IS NOT NULL FROM providers WHERE id = $1"
    ))
    .bind(provider_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?;
    match partner {
        None => return Err(fail(StatusCode::NOT_FOUND, "Provider not found")),
        Some(false) => {
            return Err(fail(
                StatusCode::UNPROCESSABLE_ENTITY,
                "This provider is not a DTV partner yet, so it cannot issue letters through the app",
            ))
        }
        Some(true) => {}
    }

    let open: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM provider_bookings WHERE user_id = $1 AND provider_id = $2 AND status = 'requested')",
    )
    .bind(user_id)
    .bind(provider_id)
    .fetch_one(&state.db)
    .await
    .map_err(db)?;
    if open {
        return Err(fail(StatusCode::CONFLICT, "You already have an open request with this provider"));
    }

    if let Some(package_id) = body.package_id {
        let ok: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM provider_packages WHERE id = $1 AND provider_id = $2)",
        )
        .bind(package_id)
        .bind(provider_id)
        .fetch_one(&state.db)
        .await
        .map_err(db)?;
        if !ok {
            return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Unknown package"));
        }
    }

    let id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO provider_bookings (provider_id, user_id, package_id, message, preferred_start)
           VALUES ($1, $2, $3, $4, $5) RETURNING id"#,
    )
    .bind(provider_id)
    .bind(user_id)
    .bind(body.package_id)
    .bind(body.message.as_deref().map(str::trim).filter(|m| !m.is_empty()))
    .bind(body.preferred_start)
    .fetch_one(&state.db)
    .await
    .map_err(db)?;

    Ok(Json(fetch_booking(&state, id).await?))
}

pub async fn list_my_bookings(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<Booking>>, ApiError> {
    let rows = sqlx::query_as::<_, Booking>(&format!(
        "{BOOKING_SELECT} WHERE b.user_id = $1 ORDER BY b.created_at DESC"
    ))
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(db)?;
    Ok(Json(rows))
}

pub async fn cancel_my_request(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<Booking>, ApiError> {
    let updated = sqlx::query(
        "UPDATE provider_bookings SET status = 'cancelled', updated_at = now() \
         WHERE id = $1 AND user_id = $2 AND status = 'requested'",
    )
    .bind(id)
    .bind(user_id)
    .execute(&state.db)
    .await
    .map_err(db)?;
    if updated.rows_affected() == 0 {
        return Err(fail(StatusCode::CONFLICT, "Only open requests can be cancelled"));
    }
    Ok(Json(fetch_booking(&state, id).await?))
}

pub async fn my_letter_url(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let row: Option<(Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT letter_storage_key, reference_code FROM provider_bookings WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?;
    letter_url(&state, row).await
}

async fn letter_url(
    state: &AppState,
    row: Option<(Option<String>, Option<String>)>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (key, reference) = row.ok_or_else(|| fail(StatusCode::NOT_FOUND, "Request not found"))?;
    let key = key.ok_or_else(|| fail(StatusCode::NOT_FOUND, "No letter issued yet"))?;
    let url = state
        .storage
        .presigned_url(&key, 3600)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let filename = format!("{}.pdf", reference.unwrap_or_else(|| "dtv-letter".into()));
    Ok(Json(json!({ "url": url, "filename": filename })))
}

// ── Provider side ────────────────────────────────────────────────────────────

/// The provider listing owned by this account, with its partner flag.
async fn owned_provider(state: &AppState, user_id: Uuid) -> Result<(Uuid, bool), ApiError> {
    let role: String = sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(db)?
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "User not found"))?;
    if role != "provider" && role != "admin" {
        return Err(fail(StatusCode::FORBIDDEN, "Provider account required"));
    }
    let row: Option<(Uuid, bool)> = sqlx::query_as(&format!(
        "SELECT id, {PARTNER_SQL} FROM providers WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1"
    ))
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?;
    row.ok_or_else(|| fail(StatusCode::NOT_FOUND, "Create or claim a listing first"))
}

pub async fn list_provider_requests(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<Booking>>, ApiError> {
    let (provider_id, _) = owned_provider(&state, user_id).await?;
    let rows = sqlx::query_as::<_, Booking>(&format!(
        "{BOOKING_SELECT} WHERE b.provider_id = $1 AND b.status <> 'cancelled' \
         ORDER BY (b.status = 'requested') DESC, b.created_at DESC"
    ))
    .bind(provider_id)
    .fetch_all(&state.db)
    .await
    .map_err(db)?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize)]
pub struct ApproveBody {
    pub course_name: String,
    pub package_id: Option<Uuid>,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub hours_per_week: f64,
    pub fees_paid: Option<f64>,
    pub currency: Option<String>,
}

#[derive(FromRow)]
struct LetterContext {
    provider_name: String,
    provider_category: String,
    location: Option<String>,
    contact_email: Option<String>,
    contact_phone: Option<String>,
    user_id: Uuid,
    display_name: Option<String>,
    email: String,
    nationality: Option<String>,
    passport_number: Option<String>,
    reference_code: Option<String>,
    status: String,
    letter_document_id: Option<Uuid>,
}

/// Approve a request: save the course details, generate the PDF letter, store it,
/// and attach it to the applicant's enrollment checklist item.
pub async fn approve_request(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
    Json(body): Json<ApproveBody>,
) -> Result<Json<Booking>, ApiError> {
    let (provider_id, partner) = owned_provider(&state, user_id).await?;
    if !partner {
        return Err(fail(
            StatusCode::FORBIDDEN,
            "Only verified DTV partners can issue letters. Wait for an admin to verify your listing.",
        ));
    }
    let course_name = body.course_name.trim();
    if course_name.is_empty() {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Course name is required"));
    }
    if body.end_date <= body.start_date {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "End date must be after the start date"));
    }
    if !(body.hours_per_week > 0.0 && body.hours_per_week <= 80.0) {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Hours per week must be between 1 and 80"));
    }
    if body.fees_paid.is_some_and(|f| f < 0.0) {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Fees cannot be negative"));
    }

    let ctx = sqlx::query_as::<_, LetterContext>(
        r#"SELECT p.name AS provider_name, p.category AS provider_category, p.location,
                  p.contact_email, p.contact_phone,
                  b.user_id, u.display_name, u.email, ap.nationality, ap.passport_number,
                  b.reference_code, b.status, b.letter_document_id
           FROM provider_bookings b
           JOIN providers p ON p.id = b.provider_id
           JOIN users u ON u.id = b.user_id
           LEFT JOIN applicant_profiles ap ON ap.user_id = b.user_id
           WHERE b.id = $1 AND b.provider_id = $2"#,
    )
    .bind(id)
    .bind(provider_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?
    .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Request not found"))?;

    if !matches!(ctx.status.as_str(), "requested" | "confirmed") {
        return Err(fail(StatusCode::CONFLICT, format!("This request is {}", ctx.status)));
    }

    let today = Utc::now().date_naive();
    let reference = ctx.reference_code.clone().unwrap_or_else(|| {
        let short: String = id.simple().to_string().chars().take(8).collect();
        format!("DTV-{}-{}", today.format("%y%m%d"), short.to_uppercase())
    });
    let currency = body
        .currency
        .as_deref()
        .map(str::trim)
        .filter(|c| !c.is_empty())
        .unwrap_or("THB")
        .to_uppercase();

    let pdf = letter_pdf::render(&letter_pdf::LetterData {
        reference: reference.clone(),
        letter_date: today,
        provider_name: ctx.provider_name.clone(),
        provider_address: ctx.location.clone(),
        provider_email: ctx.contact_email.clone().filter(|s| !s.trim().is_empty()),
        provider_phone: ctx.contact_phone.clone().filter(|s| !s.trim().is_empty()),
        student_name: ctx
            .display_name
            .clone()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| ctx.email.clone()),
        nationality: ctx.nationality.clone(),
        passport_number: ctx.passport_number.clone(),
        course_name: course_name.to_string(),
        start_date: body.start_date,
        end_date: body.end_date,
        hours_per_week: body.hours_per_week,
        fees_paid: body.fees_paid,
        currency: currency.clone(),
    });

    // Provider's copy, kept with the request.
    let letter_key = format!("letters/{}/{}.pdf", id, reference);
    state
        .storage
        .upload(&letter_key, pdf.clone(), "application/pdf")
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, format!("Storage error: {e}")))?;

    // Applicant's copy, attached to the matching checklist item.
    let item_id = enrollment_item_for(&state, ctx.user_id, &ctx.provider_category).await?;
    if item_id.is_none() {
        if let Some(old_doc) = ctx.letter_document_id {
            remove_document(&state, ctx.user_id, old_doc).await;
        }
    }
    let filename = format!("DTV letter - {} - {}.pdf", ctx.provider_name, reference);
    let note = format!("Issued by {} through the app (ref. {})", ctx.provider_name, reference);
    let doc = crate::routes::documents::attach_generated_document(
        &state,
        ctx.user_id,
        item_id,
        &filename,
        pdf,
        "application/pdf",
        Some(&note),
    )
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    sqlx::query(
        r#"UPDATE provider_bookings SET
             status = 'confirmed',
             package_id = COALESCE($2, package_id),
             course_name = $3, start_date = $4, end_date = $5,
             hours_per_week = $6, fees_paid = $7, currency = $8,
             reference_code = $9, letter_storage_key = $10, letter_document_id = $11,
             issued_at = now(), decline_reason = NULL, updated_at = now()
           WHERE id = $1"#,
    )
    .bind(id)
    .bind(body.package_id)
    .bind(course_name)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(body.hours_per_week)
    .bind(body.fees_paid)
    .bind(&currency)
    .bind(&reference)
    .bind(&letter_key)
    .bind(doc.id)
    .execute(&state.db)
    .await
    .map_err(db)?;

    Ok(Json(fetch_booking(&state, id).await?))
}

#[derive(Debug, Deserialize)]
pub struct DeclineBody {
    pub reason: Option<String>,
}

pub async fn decline_request(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
    Json(body): Json<DeclineBody>,
) -> Result<Json<Booking>, ApiError> {
    let (provider_id, _) = owned_provider(&state, user_id).await?;
    let updated = sqlx::query(
        "UPDATE provider_bookings SET status = 'declined', decline_reason = $3, updated_at = now() \
         WHERE id = $1 AND provider_id = $2 AND status = 'requested'",
    )
    .bind(id)
    .bind(provider_id)
    .bind(body.reason.as_deref().map(str::trim).filter(|r| !r.is_empty()))
    .execute(&state.db)
    .await
    .map_err(db)?;
    if updated.rows_affected() == 0 {
        return Err(fail(StatusCode::CONFLICT, "Only open requests can be declined"));
    }
    Ok(Json(fetch_booking(&state, id).await?))
}

pub async fn complete_request(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<Booking>, ApiError> {
    let (provider_id, _) = owned_provider(&state, user_id).await?;
    let updated = sqlx::query(
        "UPDATE provider_bookings SET status = 'completed', updated_at = now() \
         WHERE id = $1 AND provider_id = $2 AND status = 'confirmed'",
    )
    .bind(id)
    .bind(provider_id)
    .execute(&state.db)
    .await
    .map_err(db)?;
    if updated.rows_affected() == 0 {
        return Err(fail(StatusCode::CONFLICT, "Only confirmed bookings can be marked completed"));
    }
    Ok(Json(fetch_booking(&state, id).await?))
}

pub async fn provider_letter_url(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (provider_id, _) = owned_provider(&state, user_id).await?;
    let row: Option<(Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT letter_storage_key, reference_code FROM provider_bookings WHERE id = $1 AND provider_id = $2",
    )
    .bind(id)
    .bind(provider_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?;
    letter_url(&state, row).await
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn subcategory_for(category: &str) -> Option<&'static str> {
    match category {
        "muay_thai_gym" => Some("muay_thai"),
        "cooking_school" => Some("cooking"),
        "medical" => Some("medical"),
        _ => None,
    }
}

/// The applicant's Soft Power enrollment / confirmation checklist item, if their
/// checklist has one. Prefers the item for the provider's category
/// (e.g. "Muay Thai gym confirmation"), then the generic enrollment letter.
async fn enrollment_item_for(state: &AppState, user_id: Uuid, category: &str) -> Result<Option<Uuid>, ApiError> {
    sqlx::query_scalar(
        r#"SELECT uci.id
           FROM user_checklist_items uci
           LEFT JOIN checklist_templates t ON t.id = uci.template_id
           WHERE uci.user_id = $1
             AND COALESCE(t.visa_path, 'soft_power') = 'soft_power'
             AND (uci.title ILIKE '%enrol%' OR uci.title ILIKE '%confirmation%')
             AND uci.title NOT ILIKE '%flight%'
           ORDER BY CASE
                      WHEN t.subcategory IS NOT NULL AND t.subcategory = $2 THEN 0
                      WHEN uci.title ILIKE '%enrol%letter%' THEN 1
                      WHEN uci.title ILIKE '%enrol%' THEN 2
                      ELSE 3
                    END,
                    uci.display_order
           LIMIT 1"#,
    )
    .bind(user_id)
    .bind(subcategory_for(category))
    .fetch_optional(&state.db)
    .await
    .map_err(db)
}

async fn remove_document(state: &AppState, user_id: Uuid, doc_id: Uuid) {
    let key: Option<String> =
        sqlx::query_scalar("DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING storage_key")
            .bind(doc_id)
            .bind(user_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);
    if let Some(key) = key {
        if let Err(e) = state.storage.delete(&key).await {
            tracing::warn!("S3 delete failed for {}: {}", key, e);
        }
    }
}
