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
    pricing, image_url, location, listing_type, dtv_certified, created_at
"#;

#[derive(serde::Deserialize)]
pub struct ProviderQuery {
    category: Option<String>,
    city: Option<String>,
    path: Option<String>,
}

pub async fn list_providers(
    State(state): State<Arc<AppState>>,
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
    qb.push(" ORDER BY name");

    let providers = qb
        .build_query_as::<Provider>()
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;

    Ok(Json(providers))
}

pub async fn get_provider(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Provider>, (StatusCode, Json<serde_json::Value>)> {
    let sql = format!("SELECT {} FROM providers WHERE id = $1", PROVIDER_COLS);
    let provider = sqlx::query_as::<_, Provider>(&sql)
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

    Ok(Json(provider))
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
      p.start_month, p.duration_months, p.notes
    FROM user_plan_items p
    JOIN providers pr ON pr.id = p.provider_id
"#;

pub async fn list_plan(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<PlanItem>>, (StatusCode, Json<serde_json::Value>)> {
    let sql = format!("{} WHERE p.user_id = $1 ORDER BY p.start_month", PLAN_JOIN);
    let items = sqlx::query_as::<_, PlanItem>(&sql)
        .bind(user_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;

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
    let item = sqlx::query_as::<_, PlanItem>(&sql)
        .bind(item_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)})),
            )
        })?;

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
    let item = sqlx::query_as::<_, PlanItem>(&sql)
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
