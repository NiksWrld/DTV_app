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
    /// Claimed and verified: can issue DTV letters through the app.
    #[sqlx(default)]
    pub is_partner: bool,
    /// Average of visible reviews (verified bookings only).
    #[sqlx(default)]
    pub rating_avg: Option<f64>,
    #[sqlx(default)]
    pub rating_count: i64,
    /// Set when contact details were withheld (admin setting, non-partner).
    #[sqlx(default)]
    pub limited: bool,
    /// Admin-approved SAT recognition that has not expired.
    #[sqlx(default)]
    pub sat_certified: bool,
    #[sqlx(default)]
    pub sat_certificate_number: Option<String>,
    #[sqlx(default)]
    pub sat_valid_until: Option<chrono::NaiveDate>,
    /// Up to 3 verified partners nearby, only on a limited detail view.
    #[sqlx(skip)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alternatives: Option<Vec<Provider>>,
}

impl Provider {
    /// Keep only name, city, and type. Used when the admin setting hides
    /// unclaimed providers' contact details.
    pub fn strip_to_basics(&mut self) {
        self.description = None;
        self.documents_they_issue = None;
        self.affiliate_type = None;
        self.lead_capture_settings = None;
        self.external_url = None;
        self.admin_evidence_attachments = None;
        self.pricing = None;
        self.image_url = None;
        self.limited = true;
    }
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
    #[serde(skip)]
    #[sqlx(default)]
    pub provider_is_partner: bool,
    #[sqlx(default)]
    pub provider_sat_certified: bool,
    #[sqlx(default)]
    pub provider_sat_valid_until: Option<chrono::NaiveDate>,
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
