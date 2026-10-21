use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Embassy {
    pub id: Uuid,
    pub country: String,
    pub city: String,
    pub name: String,
    pub website_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbassyOverride {
    pub embassy_id: Uuid,
    pub checklist_template_id: Uuid,
    pub override_type: OverrideType,
    pub modified_title: Option<String>,
    pub modified_description: Option<String>,
    pub modified_required: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OverrideType {
    Add,
    Modify,
    Remove,
}
