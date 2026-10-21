use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Guide {
    pub id: Uuid,
    pub content_type: String,
    pub title: String,
    pub slug: String,
    pub body: String,
    pub tags: Option<Vec<String>>,
    pub related_paths: Option<Vec<String>>,
    pub published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
