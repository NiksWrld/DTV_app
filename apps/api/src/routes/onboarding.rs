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
    let profile = sqlx::query_as::<_, ApplicantProfile>(
        r#"INSERT INTO applicant_profiles
           (user_id, nationality, current_country, current_city, intended_path, has_dependents,
            preferred_embassy_id, intended_stay_duration, soft_power_interest, employment_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
             updated_at = NOW()
           RETURNING *"#,
    )
    .bind(user_id)
    .bind(&req.nationality)
    .bind(&req.current_country)
    .bind(&req.current_city)
    .bind(&req.intended_path)
    .bind(req.has_dependents)
    .bind(req.preferred_embassy_id)
    .bind(&req.intended_stay_duration)
    .bind(&req.soft_power_interest)
    .bind(&req.employment_type)
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
    let _existing = sqlx::query_as::<_, ApplicantProfile>(
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

    let profile = sqlx::query_as::<_, ApplicantProfile>(
        r#"UPDATE applicant_profiles SET
           nationality = COALESCE($1, nationality),
           current_country = COALESCE($2, current_country),
           current_city = COALESCE($3, current_city),
           intended_path = COALESCE($4, intended_path),
           has_dependents = COALESCE($5, has_dependents),
           preferred_embassy_id = COALESCE($6, preferred_embassy_id),
           intended_stay_duration = COALESCE($7, intended_stay_duration),
           soft_power_interest = COALESCE($8, soft_power_interest),
           employment_type = COALESCE($9, employment_type),
           updated_at = NOW()
           WHERE user_id = $10
           RETURNING *"#,
    )
    .bind(&req.nationality)
    .bind(&req.current_country)
    .bind(&req.current_city)
    .bind(&req.intended_path)
    .bind(req.has_dependents)
    .bind(req.preferred_embassy_id)
    .bind(&req.intended_stay_duration)
    .bind(&req.soft_power_interest)
    .bind(&req.employment_type)
    .bind(user_id)
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
