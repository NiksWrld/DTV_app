use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct ApplicantProfile {
    pub id: Uuid,
    pub user_id: Uuid,
    pub nationality: String,
    pub current_country: String,
    pub current_city: Option<String>,
    pub intended_path: String,
    pub has_dependents: bool,
    pub preferred_embassy_id: Option<Uuid>,
    pub intended_stay_duration: Option<String>,
    pub soft_power_interest: Option<String>,
    pub employment_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProfileRequest {
    pub nationality: String,
    pub current_country: String,
    pub current_city: Option<String>,
    pub intended_path: String,
    pub has_dependents: bool,
    pub preferred_embassy_id: Option<Uuid>,
    pub intended_stay_duration: Option<String>,
    pub soft_power_interest: Option<String>,
    pub employment_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub nationality: Option<String>,
    pub current_country: Option<String>,
    pub current_city: Option<String>,
    pub intended_path: Option<String>,
    pub has_dependents: Option<bool>,
    pub preferred_embassy_id: Option<Uuid>,
    pub intended_stay_duration: Option<String>,
    pub soft_power_interest: Option<String>,
    pub employment_type: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct Embassy {
    pub id: Uuid,
    pub country: String,
    pub city: String,
    pub name: String,
    pub website_url: Option<String>,
    pub notes: Option<String>,
}
