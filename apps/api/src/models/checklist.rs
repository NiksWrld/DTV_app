use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct ChecklistTemplate {
    pub id: Uuid,
    pub visa_path: String,
    pub subcategory: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub required: bool,
    pub recommendation_level: String,
    pub accepted_document_types: Option<serde_json::Value>,
    pub freshness_window_days: Option<i32>,
    pub min_balance_amount: Option<String>,
    pub min_validity_days: Option<i32>,
    pub evidence_examples: Option<serde_json::Value>,
    pub source_url: Option<String>,
    pub admin_notes: Option<String>,
    pub display_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct UserChecklistItem {
    pub id: Uuid,
    pub user_id: Uuid,
    pub template_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub required: bool,
    pub status: String,
    pub embassy_override_applied: bool,
    pub display_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct StatusUpdateRequest {
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct ChecklistResponse {
    pub items: Vec<ChecklistItemResponse>,
}

#[derive(Debug, Serialize)]
pub struct ChecklistItemResponse {
    pub id: Uuid,
    pub template_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub required: bool,
    pub status: String,
    pub display_order: i32,
    pub accepted_document_types: Option<serde_json::Value>,
    pub evidence_examples: Option<serde_json::Value>,
    pub freshness_window_days: Option<i32>,
    pub min_balance_amount: Option<String>,
    pub min_validity_days: Option<i32>,
}
