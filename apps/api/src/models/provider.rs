use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Provider {
    pub id: Uuid,
    pub name: String,
    pub category: String,
    pub cities_served: Option<Vec<String>>,
    pub dtv_path_relevance: Option<Vec<String>>,
    pub description: Option<String>,
    pub documents_they_issue: Option<Vec<String>>,
    pub supports_dtv: bool,
    pub verification_status: String,
    pub affiliate_type: Option<String>,
    pub lead_capture_settings: Option<serde_json::Value>,
    pub external_url: Option<String>,
    pub admin_evidence_attachments: Option<serde_json::Value>,
    pub pricing: Option<serde_json::Value>,
    pub image_url: Option<String>,
    pub location: Option<String>,
    pub listing_type: String,
    pub dtv_certified: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct PlanItem {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider_id: Uuid,
    pub provider_name: String,
    pub provider_category: String,
    pub provider_location: Option<String>,
    pub provider_image_url: Option<String>,
    pub provider_pricing: Option<serde_json::Value>,
    pub start_month: i32,
    pub duration_months: i32,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddPlanItemRequest {
    pub provider_id: Uuid,
    pub start_month: i32,
    pub duration_months: i32,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePlanItemRequest {
    pub start_month: Option<i32>,
    pub duration_months: Option<i32>,
    pub notes: Option<String>,
}
