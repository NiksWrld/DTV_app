use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub user_id: Uuid,
    pub checklist_item_id: Option<Uuid>,
    pub filename: String,
    pub file_type: String,
    pub file_size: Option<i32>,
    pub storage_key: String,
    pub document_status: String,
    pub user_notes: Option<String>,
    pub admin_notes: Option<String>,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct DocumentResponse {
    pub id: Uuid,
    pub checklist_item_id: Option<Uuid>,
    pub filename: String,
    pub file_type: String,
    pub file_size: Option<i32>,
    pub document_status: String,
    pub user_notes: Option<String>,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub version: i32,
    pub created_at: DateTime<Utc>,
}
