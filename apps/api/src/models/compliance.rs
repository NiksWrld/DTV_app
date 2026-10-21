use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct VisaEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub entry_date: NaiveDate,
    pub stamp_expires: NaiveDate,
    pub port_of_entry: Option<String>,
    pub notes: Option<String>,
    pub is_current: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct ComplianceTask {
    pub id: Uuid,
    pub user_id: Uuid,
    #[sqlx(rename = "type")]
    pub task_type: String,
    pub title: String,
    pub due_date: NaiveDate,
    pub completed_at: Option<DateTime<Utc>>,
    pub document_id: Option<Uuid>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ComplianceOverview {
    pub entry: Option<VisaEntry>,
    pub tasks: Vec<ComplianceTask>,
}

#[derive(Debug, Deserialize)]
pub struct SetEntryRequest {
    pub entry_date: NaiveDate,
    pub port_of_entry: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    #[serde(rename = "type")]
    pub task_type: String,
    pub title: String,
    pub due_date: NaiveDate,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CompleteTaskRequest {
    pub document_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub notes: Option<String>,
}
