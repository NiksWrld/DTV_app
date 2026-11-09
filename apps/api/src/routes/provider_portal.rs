use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

type ApiError = (StatusCode, Json<serde_json::Value>);

fn fail(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(json!({ "error": message.into() })))
}

#[derive(Debug, FromRow, Serialize)]
pub struct OwnedListing {
    pub id: Uuid,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub verification_status: String,
    pub claim_status: String,
    pub image_url: Option<String>,
    pub photo_urls: serde_json::Value,
    pub listing_type: String,
    pub dtv_certified: bool,
}

#[derive(Debug, FromRow, Serialize)]
pub struct ProviderPackage {
    pub id: Uuid,
    pub provider_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub price_amount: Option<f64>,
    pub currency: String,
    pub duration_days: Option<i32>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct ClaimableProvider {
    pub id: Uuid,
    pub name: String,
    pub category: String,
    pub location: Option<String>,
    pub claim_status: String,
}

#[derive(Debug, Deserialize)]
pub struct ListingBody {
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PackageBody {
    pub name: String,
    pub description: Option<String>,
    pub price_amount: Option<f64>,
    pub currency: Option<String>,
    pub duration_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ClaimBody {
    pub provider_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
}

async fn ensure_provider(state: &AppState, user_id: Uuid) -> Result<(), ApiError> {
    let role: String = sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "User not found"))?;
    if role != "provider" && role != "admin" {
        return Err(fail(StatusCode::FORBIDDEN, "Provider account required"));
    }
    Ok(())
}

const LISTING_COLS: &str = r#"
    id, name, category, description, location, contact_email, contact_phone,
    verification_status, claim_status, image_url, photo_urls, listing_type, dtv_certified
"#;

pub async fn get_mine(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    ensure_provider(&state, user_id).await?;
    let listing = sqlx::query_as::<_, OwnedListing>(&format!(
        "SELECT {LISTING_COLS} FROM providers WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1"
    ))
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let packages = if let Some(ref listing) = listing {
        sqlx::query_as::<_, ProviderPackage>(
            "SELECT id, provider_id, name, description, price_amount, currency, duration_days
             FROM provider_packages WHERE provider_id = $1 ORDER BY created_at",
        )
        .bind(listing.id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        Vec::new()
    };

    Ok(Json(json!({ "listing": listing, "packages": packages })))
}

pub async fn create_listing(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(body): Json<ListingBody>,
) -> Result<Json<OwnedListing>, ApiError> {
    ensure_provider(&state, user_id).await?;
    if body.name.trim().is_empty() {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Name is required"));
    }
    let existing: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers WHERE owner_user_id = $1")
        .bind(user_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if existing > 0 {
        return Err(fail(StatusCode::CONFLICT, "You already have a listing"));
    }

    let listing = sqlx::query_as::<_, OwnedListing>(&format!(
        r#"INSERT INTO providers
           (name, category, description, location, contact_email, contact_phone,
            owner_user_id, claim_status, verification_status, listing_type, supports_dtv)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'unreviewed', 'dtv_program', true)
           RETURNING {LISTING_COLS}"#
    ))
    .bind(body.name.trim())
    .bind(body.category.unwrap_or_else(|| "muay_thai_gym".to_string()))
    .bind(&body.description)
    .bind(&body.location)
    .bind(&body.contact_email)
    .bind(&body.contact_phone)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(listing))
}

pub async fn update_listing(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(body): Json<ListingBody>,
) -> Result<Json<OwnedListing>, ApiError> {
    ensure_provider(&state, user_id).await?;
    let listing = sqlx::query_as::<_, OwnedListing>(&format!(
        r#"UPDATE providers SET
             name = $1,
             category = COALESCE($2, category),
             description = $3,
             location = $4,
             contact_email = $5,
             contact_phone = $6
           WHERE owner_user_id = $7
           RETURNING {LISTING_COLS}"#
    ))
    .bind(body.name.trim())
    .bind(&body.category)
    .bind(&body.description)
    .bind(&body.location)
    .bind(&body.contact_email)
    .bind(&body.contact_phone)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| fail(StatusCode::NOT_FOUND, "No listing to update"))?;
    Ok(Json(listing))
}

pub async fn search_claimable(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<Vec<ClaimableProvider>>, ApiError> {
    ensure_provider(&state, user_id).await?;
    let q = query.q.unwrap_or_default();
    let rows = sqlx::query_as::<_, ClaimableProvider>(
        r#"SELECT id, name, category, location, claim_status
           FROM providers
           WHERE owner_user_id IS NULL
             AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR COALESCE(location, '') ILIKE '%' || $1 || '%')
           ORDER BY name
           LIMIT 25"#,
    )
    .bind(q.trim())
    .fetch_all(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}

pub async fn claim_listing(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(body): Json<ClaimBody>,
) -> Result<Json<OwnedListing>, ApiError> {
    ensure_provider(&state, user_id).await?;
    let owned: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers WHERE owner_user_id = $1")
        .bind(user_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if owned > 0 {
        return Err(fail(StatusCode::CONFLICT, "Release your current listing before claiming another"));
    }
    let listing = sqlx::query_as::<_, OwnedListing>(&format!(
        r#"UPDATE providers
           SET owner_user_id = $1, claim_status = 'pending'
           WHERE id = $2 AND owner_user_id IS NULL
           RETURNING {LISTING_COLS}"#
    ))
    .bind(user_id)
    .bind(body.provider_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| fail(StatusCode::CONFLICT, "That listing is already claimed"))?;
    Ok(Json(listing))
}

pub async fn add_package(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(body): Json<PackageBody>,
) -> Result<Json<ProviderPackage>, ApiError> {
    ensure_provider(&state, user_id).await?;
    if body.name.trim().is_empty() {
        return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Package name is required"));
    }
    let provider_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM providers WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Create a listing first"))?;

    let package = sqlx::query_as::<_, ProviderPackage>(
        r#"INSERT INTO provider_packages (provider_id, name, description, price_amount, currency, duration_days)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, provider_id, name, description, price_amount, currency, duration_days"#,
    )
    .bind(provider_id)
    .bind(body.name.trim())
    .bind(&body.description)
    .bind(body.price_amount)
    .bind(body.currency.unwrap_or_else(|| "THB".to_string()))
    .bind(body.duration_days)
    .fetch_one(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(package))
}

pub async fn delete_package(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(package_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    ensure_provider(&state, user_id).await?;
    let deleted = sqlx::query(
        r#"DELETE FROM provider_packages
           WHERE id = $1
             AND provider_id IN (SELECT id FROM providers WHERE owner_user_id = $2)"#,
    )
    .bind(package_id)
    .bind(user_id)
    .execute(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if deleted.rows_affected() == 0 {
        return Err(fail(StatusCode::NOT_FOUND, "Package not found"));
    }
    Ok(Json(json!({ "status": "deleted" })))
}

pub async fn list_packages(
    State(state): State<Arc<AppState>>,
    Path(provider_id): Path<Uuid>,
) -> Result<Json<Vec<ProviderPackage>>, ApiError> {
    let packages = sqlx::query_as::<_, ProviderPackage>(
        "SELECT id, provider_id, name, description, price_amount, currency, duration_days
         FROM provider_packages WHERE provider_id = $1 ORDER BY created_at",
    )
    .bind(provider_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(packages))
}

pub async fn upload_photo(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<OwnedListing>, ApiError> {
    ensure_provider(&state, user_id).await?;
    let mut bytes: Option<Vec<u8>> = None;
    let mut content_type = String::from("image/jpeg");
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| fail(StatusCode::BAD_REQUEST, e.to_string()))?
    {
        if field.name() == Some("photo") {
            if let Some(ct) = field.content_type() {
                content_type = ct.to_string();
            }
            let data = field
                .bytes()
                .await
                .map_err(|e| fail(StatusCode::BAD_REQUEST, e.to_string()))?;
            if data.len() > 8 * 1024 * 1024 {
                return Err(fail(StatusCode::PAYLOAD_TOO_LARGE, "Photo must be under 8 MB"));
            }
            bytes = Some(data.to_vec());
        }
    }
    let data = bytes.ok_or_else(|| fail(StatusCode::BAD_REQUEST, "No photo provided"))?;
    let canonical = crate::routes::documents::canonical_content_type(&content_type, "photo.jpg")
        .filter(|ct| ct.starts_with("image/"))
        .ok_or_else(|| fail(StatusCode::UNPROCESSABLE_ENTITY, "Only JPG and PNG photos are allowed"))?;
    let ext = if canonical == "image/png" { "png" } else { "jpg" };
    let key = format!("providers/{}/{}.{}", user_id, Uuid::new_v4(), ext);
    state
        .storage
        .upload(&key, data, canonical)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let url = state
        .storage
        .presigned_url(&key, 60 * 60 * 24 * 7)
        .await
        .unwrap_or(key);

    let listing = sqlx::query_as::<_, OwnedListing>(&format!(
        r#"UPDATE providers SET
             photo_urls = COALESCE(photo_urls, '[]'::jsonb) || jsonb_build_array($1::text),
             image_url = COALESCE(image_url, $1)
           WHERE owner_user_id = $2
           RETURNING {LISTING_COLS}"#
    ))
    .bind(&url)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| fail(StatusCode::NOT_FOUND, "Create a listing before adding photos"))?;
    Ok(Json(listing))
}

#[derive(Debug, FromRow, Serialize)]
pub struct PendingClaim {
    pub id: Uuid,
    pub name: String,
    pub category: String,
    pub location: Option<String>,
    pub claim_status: String,
    pub owner_email: Option<String>,
}

pub async fn list_pending_claims(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<PendingClaim>>, ApiError> {
    let rows = sqlx::query_as::<_, PendingClaim>(
        r#"SELECT p.id, p.name, p.category, p.location, p.claim_status, u.email AS owner_email
           FROM providers p
           LEFT JOIN users u ON u.id = p.owner_user_id
           WHERE p.claim_status = 'pending'
           ORDER BY p.name"#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}

pub async fn review_claim(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let action = body["action"].as_str().unwrap_or("");
    let updated = match action {
        "approve" => sqlx::query(
            "UPDATE providers SET claim_status = 'approved', verification_status = 'verified_docs_seen' WHERE id = $1",
        )
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        "reject" => sqlx::query(
            "UPDATE providers SET claim_status = 'rejected', owner_user_id = NULL, verification_status = CASE WHEN verification_status = 'unreviewed' THEN 'unreviewed' ELSE verification_status END WHERE id = $1",
        )
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| fail(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        _ => return Err(fail(StatusCode::UNPROCESSABLE_ENTITY, "Action must be approve or reject")),
    };
    if updated.rows_affected() == 0 {
        return Err(fail(StatusCode::NOT_FOUND, "Listing not found"));
    }
    Ok(Json(json!({ "status": action })))
}
