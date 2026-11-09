use axum::{extract::{Path, Query, State}, http::StatusCode, Extension, Json};
use sqlx::QueryBuilder;
use sqlx::Postgres;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::provider::{AddPlanItemRequest, PlanItem, Provider, UpdatePlanItemRequest},
    AppState,
};

const PROVIDER_COLS: &str = r#"
    id, name, category, cities_served, dtv_path_relevance, description,
    documents_they_issue, supports_dtv, verification_status, affiliate_type,
    lead_capture_settings, external_url, admin_evidence_attachments,
    pricing, image_url, location, listing_type, dtv_certified, created_at,
    (claim_status = 'approved' AND verification_status IN ('verified_docs_seen', 'featured')) AS is_partner,
    (SELECT AVG(r.rating)::float8 FROM provider_reviews r WHERE r.provider_id = providers.id AND NOT r.hidden) AS rating_avg,
    (SELECT COUNT(*) FROM provider_reviews r WHERE r.provider_id = providers.id AND NOT r.hidden) AS rating_count,
    (sat_status = 'approved' AND (sat_valid_until IS NULL OR sat_valid_until >= CURRENT_DATE)) AS sat_certified,
    CASE WHEN sat_status = 'approved' AND (sat_valid_until IS NULL OR sat_valid_until >= CURRENT_DATE) THEN sat_certificate_number END AS sat_certificate_number,
    CASE WHEN sat_status = 'approved' THEN sat_valid_until END AS sat_valid_until
"#;

#[derive(serde::Deserialize)]
pub struct ProviderQuery {
    category: Option<String>,
    city: Option<String>,
    path: Option<String>,
    /// "1" / "true": only providers with valid SAT recognition.
    sat: Option<String>,
}

pub async fn list_providers(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Query(query): Query<ProviderQuery>,
) -> Result<Json<Vec<Provider>>, (StatusCode, Json<serde_json::Value>)> {
    let base = format!(
        "SELECT {} FROM providers WHERE verification_status != 'unreviewed'",
        PROVIDER_COLS
    );
    let mut qb: QueryBuilder<Postgres> = QueryBuilder::new(base);

    if let Some(ref category) = query.category {
        qb.push(" AND category = ");
        qb.push_bind(category.clone());
    }
    if let Some(ref city) = query.city {
        qb.push(" AND ");
        qb.push_bind(city.clone());
        qb.push(" = ANY(cities_served)");
    }
    if let Some(ref path) = query.path {
        qb.push(" AND ");
        qb.push_bind(path.clone());
        qb.push(" = ANY(dtv_path_relevance)");
    }
    if matches!(query.sat.as_deref(), Some("1") | Some("true")) {
        qb.push(" AND ");
        qb.push(crate::routes::sat::SAT_CERTIFIED_SQL);
    }
    qb.push(" ORDER BY name");

    let mut providers = qb
        .build_query_as::<Provider>()
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;
    let hide = crate::routes::settings::hide_unclaimed_for(&state, user_id).await;
    for provider in &mut providers {
        if hide && !provider.is_partner {
            provider.strip_to_basics();
        }
        sign_provider_image(&state, provider).await;
    }

    Ok(Json(providers))
}

pub async fn get_provider(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<Provider>, (StatusCode, Json<serde_json::Value>)> {
    let sql = format!("SELECT {} FROM providers WHERE id = $1", PROVIDER_COLS);
    let mut provider = sqlx::query_as::<_, Provider>(&sql)
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Provider not found"})),
            )
        })?;
    if !provider.is_partner && crate::routes::settings::hide_unclaimed_for(&state, user_id).await {
        provider.strip_to_basics();
        provider.alternatives = Some(partner_alternatives(&state, &provider).await);
    }
    sign_provider_image(&state, &mut provider).await;
    crate::routes::provider_stats::record_view(&state, id, &format!("u:{user_id}"), Some(user_id)).await;

    Ok(Json(provider))
}

/// The provider's city: its first served city, else the last part of its location.
fn city_of(provider: &Provider) -> Option<String> {
    provider
        .cities_served
        .as_ref()
        .and_then(|c| c.first().cloned())
        .or_else(|| {
            provider
                .location
                .as_deref()
                .and_then(|l| l.rsplit(',').next())
                .map(|s| s.trim().to_string())
        })
        .filter(|s| !s.is_empty())
}

/// Up to 3 verified partners of the same type, same city first.
async fn partner_alternatives(state: &AppState, provider: &Provider) -> Vec<Provider> {
    let city = city_of(provider);
    let sql = format!(
        r#"SELECT {cols} FROM providers
           WHERE id <> $1 AND category = $2
             AND claim_status = 'approved' AND verification_status IN ('verified_docs_seen', 'featured')
           ORDER BY (
               $3::text IS NOT NULL AND (
                   $3 = ANY(COALESCE(cities_served, ARRAY[]::text[]))
                   OR COALESCE(location, '') ILIKE '%' || $3 || '%'
               )
           ) DESC, name
           LIMIT 3"#,
        cols = PROVIDER_COLS
    );
    let mut rows = sqlx::query_as::<_, Provider>(&sql)
        .bind(provider.id)
        .bind(&provider.category)
        .bind(city)
        .fetch_all(&state.db)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Could not load partner alternatives: {}", e);
            Vec::new()
        });
    for row in &mut rows {
        sign_provider_image(state, row).await;
    }
    rows
}

pub async fn list_categories(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<String>>, (StatusCode, Json<serde_json::Value>)> {
    let categories = sqlx::query_scalar::<_, String>(
        "SELECT DISTINCT category FROM providers ORDER BY category",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    Ok(Json(categories))
}

// ── Plan endpoints ────────────────────────────────────────────────────────────

const PLAN_JOIN: &str = r#"
    SELECT
      p.id, p.user_id, p.provider_id,
      pr.name  AS provider_name,
      pr.category AS provider_category,
      pr.location AS provider_location,
      pr.image_url AS provider_image_url,
      pr.pricing AS provider_pricing,
      (pr.claim_status = 'approved' AND pr.verification_status IN ('verified_docs_seen', 'featured')) AS provider_is_partner,
      (pr.sat_status = 'approved' AND (pr.sat_valid_until IS NULL OR pr.sat_valid_until >= CURRENT_DATE)) AS provider_sat_certified,
      CASE WHEN pr.sat_status = 'approved' THEN pr.sat_valid_until END AS provider_sat_valid_until,
      p.start_month, p.duration_months, p.notes
    FROM user_plan_items p
    JOIN providers pr ON pr.id = p.provider_id
"#;

pub async fn list_plan(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<PlanItem>>, (StatusCode, Json<serde_json::Value>)> {
    let sql = format!("{} WHERE p.user_id = $1 ORDER BY p.start_month", PLAN_JOIN);
    let mut items = sqlx::query_as::<_, PlanItem>(&sql)
        .bind(user_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;
    let hide = crate::routes::settings::hide_unclaimed_for(&state, user_id).await;
    for item in &mut items {
        if hide && !item.provider_is_partner {
            item.provider_pricing = None;
        }
        sign_plan_image(&state, item).await;
    }

    Ok(Json(items))
}

pub async fn add_plan_item(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<AddPlanItemRequest>,
) -> Result<Json<PlanItem>, (StatusCode, Json<serde_json::Value>)> {
    if req.start_month < 1 || req.start_month > 12 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "start_month must be 1–12"})),
        ));
    }
    if req.duration_months < 1 || req.duration_months > 12 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "duration_months must be 1–12"})),
        ));
    }

    let item_id = sqlx::query_scalar::<_, Uuid>(
        r#"INSERT INTO user_plan_items (user_id, provider_id, start_month, duration_months, notes)
           VALUES ($1, $2, $3, $4, $5) RETURNING id"#,
    )
    .bind(user_id)
    .bind(req.provider_id)
    .bind(req.start_month)
    .bind(req.duration_months)
    .bind(&req.notes)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    let sql = format!("{} WHERE p.id = $1", PLAN_JOIN);
    let mut item = sqlx::query_as::<_, PlanItem>(&sql)
        .bind(item_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;

    if !item.provider_is_partner && crate::routes::settings::hide_unclaimed_for(&state, user_id).await {
        item.provider_pricing = None;
    }
    sign_plan_image(&state, &mut item).await;
    Ok(Json(item))
}

pub async fn update_plan_item(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(item_id): Path<Uuid>,
    Json(req): Json<UpdatePlanItemRequest>,
) -> Result<Json<PlanItem>, (StatusCode, Json<serde_json::Value>)> {
    sqlx::query(
        r#"UPDATE user_plan_items
           SET start_month     = COALESCE($1, start_month),
               duration_months = COALESCE($2, duration_months),
               notes           = COALESCE($3, notes),
               updated_at      = NOW()
           WHERE id = $4 AND user_id = $5"#,
    )
    .bind(req.start_month)
    .bind(req.duration_months)
    .bind(&req.notes)
    .bind(item_id)
    .bind(user_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    let sql = format!("{} WHERE p.id = $1 AND p.user_id = $2", PLAN_JOIN);
    let mut item = sqlx::query_as::<_, PlanItem>(&sql)
        .bind(item_id)
        .bind(user_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;

    if !item.provider_is_partner && crate::routes::settings::hide_unclaimed_for(&state, user_id).await {
        item.provider_pricing = None;
    }
    sign_plan_image(&state, &mut item).await;
    Ok(Json(item))
}

pub async fn delete_plan_item(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(item_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM user_plan_items WHERE id = $1 AND user_id = $2")
        .bind(item_id)
        .bind(user_id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;

    Ok(Json(serde_json::json!({"status": "deleted"})))
}

pub(crate) async fn sign_provider_image(state: &AppState, provider: &mut Provider) {
    provider.image_url = state.storage.present_opt(provider.image_url.take()).await;
}

async fn sign_plan_image(state: &AppState, item: &mut PlanItem) {
    item.provider_image_url = state.storage.present_opt(item.provider_image_url.take()).await;
}
