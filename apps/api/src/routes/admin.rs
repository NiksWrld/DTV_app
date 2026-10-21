use axum::{extract::{Path, State}, http::StatusCode, Json};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::{
        checklist::ChecklistTemplate,
        profile::Embassy,
        provider::Provider,
    },
    AppState,
};

fn db_err(e: impl std::fmt::Display) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::INTERNAL_SERVER_ERROR,
     Json(serde_json::json!({"error": format!("Database error: {}", e)})))
}

const PROVIDER_COLS: &str = r#"
    id, name, category, cities_served, dtv_path_relevance, description,
    documents_they_issue, supports_dtv, verification_status, affiliate_type,
    lead_capture_settings, external_url, admin_evidence_attachments,
    pricing, image_url, location, listing_type, dtv_certified, created_at
"#;

fn parse_str_array(v: &serde_json::Value) -> Vec<String> {
    match v {
        serde_json::Value::Array(arr) => arr.iter()
            .filter_map(|x| x.as_str().map(|s| s.to_string()))
            .collect(),
        serde_json::Value::String(s) => s.split(',')
            .map(|x| x.trim().to_string())
            .filter(|x| !x.is_empty())
            .collect(),
        _ => vec![],
    }
}

// ─── Provider Management ────────────────────────────────────────────────────

pub async fn list_providers_admin(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Provider>>, (StatusCode, Json<serde_json::Value>)> {
    let providers = sqlx::query_as::<_, Provider>(
        &format!("SELECT {} FROM providers ORDER BY listing_type, category, name", PROVIDER_COLS),
    )
    .fetch_all(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(providers))
}

pub async fn create_provider(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<Provider>, (StatusCode, Json<serde_json::Value>)> {
    let cities = parse_str_array(&body["cities_served"]);
    let paths  = parse_str_array(&body["dtv_path_relevance"]);
    let pricing: Option<serde_json::Value> = body.get("pricing")
        .filter(|v| !v.is_null())
        .cloned();

    let provider = sqlx::query_as::<_, Provider>(
        &format!(r#"INSERT INTO providers
           (name, category, listing_type, dtv_certified, description, location,
            cities_served, dtv_path_relevance, external_url, image_url, pricing,
            affiliate_type, supports_dtv, verification_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           RETURNING {}"#, PROVIDER_COLS),
    )
    .bind(body["name"].as_str().unwrap_or(""))
    .bind(body["category"].as_str().unwrap_or("muay_thai_gym"))
    .bind(body["listing_type"].as_str().unwrap_or("dtv_program"))
    .bind(body["dtv_certified"].as_bool().unwrap_or(false))
    .bind(body["description"].as_str())
    .bind(body["location"].as_str())
    .bind(&cities)
    .bind(&paths)
    .bind(body["external_url"].as_str())
    .bind(body["image_url"].as_str())
    .bind(pricing)
    .bind(body["affiliate_type"].as_str())
    .bind(body["supports_dtv"].as_bool().unwrap_or(true))
    .bind(body["verification_status"].as_str().unwrap_or("unreviewed"))
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(provider))
}

pub async fn update_provider(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<Provider>, (StatusCode, Json<serde_json::Value>)> {
    let cities = parse_str_array(&body["cities_served"]);
    let paths  = parse_str_array(&body["dtv_path_relevance"]);
    let pricing: Option<serde_json::Value> = body.get("pricing")
        .filter(|v| !v.is_null())
        .cloned();

    let provider = sqlx::query_as::<_, Provider>(
        &format!(r#"UPDATE providers SET
           name                = COALESCE($1, name),
           category            = COALESCE($2, category),
           listing_type        = COALESCE($3, listing_type),
           dtv_certified       = COALESCE($4, dtv_certified),
           description         = COALESCE($5, description),
           location            = COALESCE($6, location),
           cities_served       = COALESCE($7, cities_served),
           dtv_path_relevance  = COALESCE($8, dtv_path_relevance),
           external_url        = COALESCE($9, external_url),
           image_url           = COALESCE($10, image_url),
           pricing             = COALESCE($11, pricing),
           affiliate_type      = COALESCE($12, affiliate_type),
           verification_status = COALESCE($13, verification_status)
           WHERE id = $14
           RETURNING {}"#, PROVIDER_COLS),
    )
    .bind(body["name"].as_str())
    .bind(body["category"].as_str())
    .bind(body["listing_type"].as_str())
    .bind(body["dtv_certified"].as_bool())
    .bind(body["description"].as_str())
    .bind(body["location"].as_str())
    .bind(if cities.is_empty() { None } else { Some(cities) })
    .bind(if paths.is_empty() { None } else { Some(paths) })
    .bind(body["external_url"].as_str())
    .bind(body["image_url"].as_str())
    .bind(pricing)
    .bind(body["affiliate_type"].as_str())
    .bind(body["verification_status"].as_str())
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(provider))
}

pub async fn delete_provider(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM providers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(db_err)?;

    Ok(Json(serde_json::json!({"status": "deleted"})))
}

pub async fn verify_provider(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let status = body["verification_status"].as_str().unwrap_or("listed");
    sqlx::query("UPDATE providers SET verification_status = $1 WHERE id = $2")
        .bind(status)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(db_err)?;

    Ok(Json(serde_json::json!({"status": "updated"})))
}

// ─── User Management ────────────────────────────────────────────────────────

#[derive(Debug, FromRow, Serialize)]
pub struct AdminUser {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub display_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

pub async fn list_users_admin(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<AdminUser>>, (StatusCode, Json<serde_json::Value>)> {
    let users = sqlx::query_as::<_, AdminUser>(
        "SELECT id, email, role, display_name, created_at FROM users ORDER BY created_at DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(users))
}

pub async fn update_user_role(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let role = body["role"].as_str().unwrap_or("user");
    sqlx::query("UPDATE users SET role = $1 WHERE id = $2")
        .bind(role)
        .bind(user_id)
        .execute(&state.db)
        .await
        .map_err(db_err)?;

    Ok(Json(serde_json::json!({"status": "updated", "role": role})))
}

// ─── Checklist Template Management ─────────────────────────────────────────

pub async fn list_templates(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ChecklistTemplate>>, (StatusCode, Json<serde_json::Value>)> {
    let templates = sqlx::query_as::<_, ChecklistTemplate>(
        "SELECT * FROM checklist_templates ORDER BY visa_path, display_order",
    )
    .fetch_all(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(templates))
}

pub async fn create_template(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<ChecklistTemplate>, (StatusCode, Json<serde_json::Value>)> {
    let template = sqlx::query_as::<_, ChecklistTemplate>(
        r#"INSERT INTO checklist_templates
           (visa_path, title, description, required, display_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *"#,
    )
    .bind(body["visa_path"].as_str().unwrap_or(""))
    .bind(body["title"].as_str().unwrap_or(""))
    .bind(body["description"].as_str())
    .bind(body["required"].as_bool().unwrap_or(true))
    .bind(body["display_order"].as_i64().unwrap_or(0) as i32)
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(template))
}

pub async fn update_template(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<ChecklistTemplate>, (StatusCode, Json<serde_json::Value>)> {
    let template = sqlx::query_as::<_, ChecklistTemplate>(
        r#"UPDATE checklist_templates SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           required = COALESCE($3, required),
           display_order = COALESCE($4, display_order)
           WHERE id = $5
           RETURNING *"#,
    )
    .bind(body["title"].as_str())
    .bind(body["description"].as_str())
    .bind(body["required"].as_bool())
    .bind(body["display_order"].as_i64().map(|v| v as i32))
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(template))
}

pub async fn delete_template(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM checklist_templates WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(db_err)?;

    Ok(Json(serde_json::json!({"status": "deleted"})))
}

// ─── Embassy Management ─────────────────────────────────────────────────────

pub async fn list_embassies(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Embassy>>, (StatusCode, Json<serde_json::Value>)> {
    let embassies = sqlx::query_as::<_, Embassy>("SELECT * FROM embassies ORDER BY country, city")
        .fetch_all(&state.db)
        .await
        .map_err(db_err)?;

    Ok(Json(embassies))
}

pub async fn create_override(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    sqlx::query(
        r#"INSERT INTO embassy_overrides
           (embassy_id, checklist_template_id, override_type)
           VALUES ($1, $2, $3)"#,
    )
    .bind(body["embassy_id"].as_str().and_then(|s| Uuid::parse_str(s).ok()))
    .bind(body["checklist_template_id"].as_str().and_then(|s| Uuid::parse_str(s).ok()))
    .bind(body["override_type"].as_str().unwrap_or("modify"))
    .execute(&state.db)
    .await
    .map_err(db_err)?;

    Ok(Json(serde_json::json!({"status": "created"})))
}
