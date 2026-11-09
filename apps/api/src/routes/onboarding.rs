use axum::{extract::State, http::StatusCode, Extension, Json};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::profile::{ApplicantProfile, CreateProfileRequest, Embassy, UpdateProfileRequest},
    AppState,
};

pub async fn get_profile(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<ApplicantProfile>, (StatusCode, Json<serde_json::Value>)> {
    let profile = sqlx::query_as::<_, ApplicantProfile>(
        "SELECT * FROM applicant_profiles WHERE user_id = $1",
    )
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
            Json(serde_json::json!({"error": "Profile not found"})),
        )
    })?;

    Ok(Json(profile))
}

pub async fn create_profile(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<CreateProfileRequest>,
) -> Result<Json<ApplicantProfile>, (StatusCode, Json<serde_json::Value>)> {
    let (embassy_id, overridden) = choose_embassy(
        &state,
        &req.current_country,
        req.current_city.as_deref(),
        req.embassy_overridden.unwrap_or(false),
        req.preferred_embassy_id,
    )
    .await?;
    let profile = sqlx::query_as::<_, ApplicantProfile>(
        r#"INSERT INTO applicant_profiles
           (user_id, nationality, current_country, current_city, intended_path, has_dependents,
            preferred_embassy_id, intended_stay_duration, soft_power_interest, employment_type,
            passport_expiry, embassy_overridden, passport_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULLIF(TRIM($13::text), ''))
           ON CONFLICT (user_id) DO UPDATE SET
             nationality = EXCLUDED.nationality,
             current_country = EXCLUDED.current_country,
             current_city = EXCLUDED.current_city,
             intended_path = EXCLUDED.intended_path,
             has_dependents = EXCLUDED.has_dependents,
             preferred_embassy_id = EXCLUDED.preferred_embassy_id,
             intended_stay_duration = EXCLUDED.intended_stay_duration,
             soft_power_interest = EXCLUDED.soft_power_interest,
             employment_type = EXCLUDED.employment_type,
             passport_expiry = EXCLUDED.passport_expiry,
             embassy_overridden = EXCLUDED.embassy_overridden,
             passport_number = COALESCE(EXCLUDED.passport_number, applicant_profiles.passport_number),
             updated_at = NOW()
           RETURNING *"#,
    )
    .bind(user_id)
    .bind(&req.nationality)
    .bind(&req.current_country)
    .bind(&req.current_city)
    .bind(&req.intended_path)
    .bind(req.has_dependents)
    .bind(embassy_id)
    .bind(&req.intended_stay_duration)
    .bind(&req.soft_power_interest)
    .bind(&req.employment_type)
    .bind(req.passport_expiry)
    .bind(overridden)
    .bind(&req.passport_number)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to save profile: {}", e)})),
        )
    })?;

    Ok(Json(profile))
}

pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<UpdateProfileRequest>,
) -> Result<Json<ApplicantProfile>, (StatusCode, Json<serde_json::Value>)> {
    let existing = sqlx::query_as::<_, ApplicantProfile>(
        "SELECT * FROM applicant_profiles WHERE user_id = $1",
    )
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
            Json(serde_json::json!({"error": "Profile not found"})),
        )
    })?;

    let country = req.current_country.clone().unwrap_or(existing.current_country.clone());
    let city = req.current_city.clone().or(existing.current_city.clone());
    let (embassy_id, overridden) = choose_embassy(
        &state,
        &country,
        city.as_deref(),
        req.embassy_overridden.unwrap_or(existing.embassy_overridden),
        req.preferred_embassy_id.or(existing.preferred_embassy_id),
    )
    .await?;
    let profile = sqlx::query_as::<_, ApplicantProfile>(
        r#"UPDATE applicant_profiles SET
           nationality = COALESCE($1, nationality),
           current_country = COALESCE($2, current_country),
           current_city = COALESCE($3, current_city),
           intended_path = COALESCE($4, intended_path),
           has_dependents = COALESCE($5, has_dependents),
           preferred_embassy_id = $6,
           intended_stay_duration = COALESCE($7, intended_stay_duration),
           soft_power_interest = COALESCE($8, soft_power_interest),
           employment_type = COALESCE($9, employment_type),
           passport_expiry = COALESCE($10, passport_expiry),
           embassy_overridden = $12,
           passport_number = CASE WHEN $13::text IS NULL THEN passport_number ELSE NULLIF(TRIM($13::text), '') END,
           updated_at = NOW()
           WHERE user_id = $11
           RETURNING *"#,
    )
    .bind(&req.nationality)
    .bind(&req.current_country)
    .bind(&req.current_city)
    .bind(&req.intended_path)
    .bind(req.has_dependents)
    .bind(embassy_id)
    .bind(&req.intended_stay_duration)
    .bind(&req.soft_power_interest)
    .bind(&req.employment_type)
    .bind(req.passport_expiry)
    .bind(user_id)
    .bind(overridden)
    .bind(&req.passport_number)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update profile: {}", e)})),
        )
    })?;

    Ok(Json(profile))
}

pub async fn list_embassies(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Embassy>>, (StatusCode, Json<serde_json::Value>)> {
    let embassies = sqlx::query_as::<_, Embassy>("SELECT * FROM embassies ORDER BY country, city")
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;

    Ok(Json(embassies))
}

#[derive(serde::Deserialize)]
pub struct EmbassyMatchRequest {
    pub country: String,
    pub city: Option<String>,
}

pub async fn match_embassy(
    State(state): State<Arc<AppState>>,
    Json(req): Json<EmbassyMatchRequest>,
) -> Result<Json<Option<Embassy>>, (StatusCode, Json<serde_json::Value>)> {
    let (id, _) = choose_embassy(&state, &req.country, req.city.as_deref(), false, None).await?;
    if let Some(id) = id {
        let embassy = sqlx::query_as::<_, Embassy>("SELECT * FROM embassies WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("Database error: {}", e)})),
                )
            })?;
        return Ok(Json(embassy));
    }
    Ok(Json(None))
}

async fn choose_embassy(
    state: &AppState,
    country: &str,
    city: Option<&str>,
    overridden: bool,
    explicit: Option<Uuid>,
) -> Result<(Option<Uuid>, bool), (StatusCode, Json<serde_json::Value>)> {
    if overridden {
        return Ok((explicit, true));
    }
    let posts = sqlx::query_as::<_, Embassy>("SELECT * FROM embassies")
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;
    let candidates: Vec<domain::embassy::EmbassyPost> = posts
        .iter()
        .map(|post| domain::embassy::EmbassyPost {
            country: post.country.clone(),
            city: post.city.clone(),
            name: post.name.clone(),
        })
        .collect();
    let matched = domain::embassy::match_embassy(country, city, &candidates);
    let id = matched.and_then(|post| {
        posts.iter().find(|row| row.name == post.name && row.city == post.city).map(|row| row.id)
    });
    Ok((id, false))
}
