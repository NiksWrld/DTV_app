use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistItem {
    pub id: Uuid,
    pub template_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub required: bool,
    pub status: ChecklistStatus,
    pub display_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ChecklistStatus {
    Missing,
    Uploaded,
    UnderReview,
    Accepted,
    Risky,
}

impl ChecklistStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ChecklistStatus::Missing => "missing",
            ChecklistStatus::Uploaded => "uploaded",
            ChecklistStatus::UnderReview => "under_review",
            ChecklistStatus::Accepted => "accepted",
            ChecklistStatus::Risky => "risky",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "missing" => Some(ChecklistStatus::Missing),
            "uploaded" => Some(ChecklistStatus::Uploaded),
            "under_review" => Some(ChecklistStatus::UnderReview),
            "accepted" => Some(ChecklistStatus::Accepted),
            "risky" => Some(ChecklistStatus::Risky),
            _ => None,
        }
    }
}
