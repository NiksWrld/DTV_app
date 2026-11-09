//! Reviews from applicants with a confirmed or completed booking.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

type ApiError = (StatusCode, Json<serde_json::Value>);

fn fail(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(json!({ "error": message.into() })))
}

fn db(e: impl std::fmt::Display) -> ApiError {
    fail(StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {e}"))
}

#[derive(Debug, FromRow, Serialize)]
pub struct Review {
    pub id: Uuid,
    pub booking_id: Uuid,
    pub provider_id: Uuid,
    pub provider_name: String,
    pub rating: i16,
    pub body: Option<String>,
    pub reviewer_name: String,
    pub course_name: Option<String>,
    pub provider_reply: Option<String>,
    pub replied_at: Option<DateTime<Utc>>,
    pub hidden: bool,
    pub verified_booking: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct AdminReview {
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub review: Review,
    pub reviewer_email: String,
}

/// Public reviewer label: first word of the display name, never the email.
const REVIEW_SELECT: &str = r#"
    SELECT r.id, r.booking_id, r.provider_id, p.name AS provider_name, r.rating, r.body,
           COALESCE(NULLIF(split_part(TRIM(COALESCE(u.display_name, '')), ' ', 1), ''), 'DTV applicant') AS reviewer_name,
           b.course_name, r.provider_reply, r.replied_at, r.hidden,
           true AS verified_booking, r.created_at, u.email AS reviewer_email
    FROM provider_reviews r
    JOIN providers p ON p.id = r.provider_id
    JOIN users u ON u.id = r.user_id
    JOIN provider_bookings b ON b.id = r.booking_id
"#;

#[derive(Debug, Deserialize)]
pub struct ReviewBody {
    pub rating: i16,
    pub body: Option<String>,
}

pub async fn create_review(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(booking_id): Path<Uuid>,
    Json(body): Json<ReviewBody>,
) -> Result<Json<Review>, ApiError> {
    if !(1..=5).contains(&body.rating) {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Rating must be 1 to 5 stars"));
    }
    let text = body.body.as_deref().map(str::trim).filter(|t| !t.is_empty());
    if text.is_some_and(|t| t.chars().count() > 2000) {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Please keep reviews under 2000 characters"));
    }

    let booking: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT provider_id, status FROM provider_bookings WHERE id = $1 AND user_id = $2",
    )
    .bind(booking_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?;
    let (provider_id, status) = booking.ok_or_else(|| fail(StatusCode::NOT_FOUND, "Booking not found"))?;
    if !matches!(status.as_str(), "confirmed" | "completed") {
        return Err(fail(
            StatusCode::FORBIDDEN,
            "You can review a provider once your booking is confirmed",
        ));
    }

    let id: Option<Uuid> = sqlx::query_scalar(
        r#"INSERT INTO provider_reviews (booking_id, provider_id, user_id, rating, body)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (booking_id) DO NOTHING
           RETURNING id"#,
    )
    .bind(booking_id)
    .bind(provider_id)
    .bind(user_id)
    .bind(body.rating)
    .bind(text)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?;
    let id = id.ok_or_else(|| fail(StatusCode::CONFLICT, "You already reviewed this booking"))?;
    Ok(Json(fetch(&state, id).await?.review))
}

async fn fetch(state: &AppState, id: Uuid) -> Result<AdminReview, ApiError> {
    sqlx::query_as::<_, AdminReview>(&format!("{REVIEW_SELECT} WHERE r.id = $1"))
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(db)?
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Review not found"))
}

pub async fn list_provider_reviews(
    State(state): State<Arc<AppState>>,
    Path(provider_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let rows = sqlx::query_as::<_, AdminReview>(&format!(
        "{REVIEW_SELECT} WHERE r.provider_id = $1 AND NOT r.hidden ORDER BY r.created_at DESC"
    ))
    .bind(provider_id)
    .fetch_all(&state.db)
    .await
    .map_err(db)?;
    let reviews: Vec<Review> = rows.into_iter().map(|r| r.review).collect();
    let count = reviews.len();
    let average = if count > 0 {
        Some(reviews.iter().map(|r| r.rating as f64).sum::<f64>() / count as f64)
    } else {
        None
    };
    Ok(Json(json!({ "average": average, "count": count, "reviews": reviews })))
}

async fn owned_provider_id(state: &AppState, user_id: Uuid) -> Result<Uuid, ApiError> {
    sqlx::query_scalar(
        "SELECT id FROM providers WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(db)?
    .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Create or claim a listing first"))
}

/// The provider's own reviews, including hidden ones (flagged).
pub async fn list_my_reviews(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<Review>>, ApiError> {
    let provider_id = owned_provider_id(&state, user_id).await?;
    let rows = sqlx::query_as::<_, AdminReview>(&format!(
        "{REVIEW_SELECT} WHERE r.provider_id = $1 ORDER BY r.created_at DESC"
    ))
    .bind(provider_id)
    .fetch_all(&state.db)
    .await
    .map_err(db)?;
    Ok(Json(rows.into_iter().map(|r| r.review).collect()))
}

#[derive(Debug, Deserialize)]
pub struct ReplyBody {
    pub reply: String,
}

pub async fn reply_to_review(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
    Json(body): Json<ReplyBody>,
) -> Result<Json<Review>, ApiError> {
    let provider_id = owned_provider_id(&state, user_id).await?;
    let reply = body.reply.trim();
    if reply.is_empty() {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Reply cannot be empty"));
    }
    if reply.chars().count() > 2000 {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Please keep replies under 2000 characters"));
    }
    let updated = sqlx::query(
        "UPDATE provider_reviews SET provider_reply = $3, replied_at = now(), updated_at = now() \
         WHERE id = $1 AND provider_id = $2 AND provider_reply IS NULL",
    )
    .bind(id)
    .bind(provider_id)
    .bind(reply)
    .execute(&state.db)
    .await
    .map_err(db)?;
    if updated.rows_affected() == 0 {
        return Err(fail(StatusCode::CONFLICT, "You can reply to each review once"));
    }
    Ok(Json(fetch(&state, id).await?.review))
}

pub async fn admin_list_reviews(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<AdminReview>>, ApiError> {
    let rows = sqlx::query_as::<_, AdminReview>(&format!("{REVIEW_SELECT} ORDER BY r.created_at DESC"))
        .fetch_all(&state.db)
        .await
        .map_err(db)?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize)]
pub struct HideBody {
    pub hidden: bool,
}

pub async fn admin_set_hidden(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<HideBody>,
) -> Result<Json<AdminReview>, ApiError> {
    let updated = sqlx::query("UPDATE provider_reviews SET hidden = $2, updated_at = now() WHERE id = $1")
        .bind(id)
        .bind(body.hidden)
        .execute(&state.db)
        .await
        .map_err(db)?;
    if updated.rows_affected() == 0 {
        return Err(fail(StatusCode::NOT_FOUND, "Review not found"));
    }
    Ok(Json(fetch(&state, id).await?))
}
