use axum::{extract::State, http::StatusCode, Extension, Json};
use axum::extract::Multipart;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::user::{UpdateAccountRequest, User, UserResponse},
    AppState,
};

pub async fn get_account(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<UserResponse>, (StatusCode, Json<serde_json::Value>)> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            (StatusCode::INTERNAL_SERVER_ERROR,
             Json(serde_json::json!({"error": format!("Database error: {}", e)})))
        })?
        .ok_or_else(|| {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "User not found"})))
        })?;

    Ok(Json(user.into()))
}

pub async fn update_account(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<UpdateAccountRequest>,
) -> Result<Json<UserResponse>, (StatusCode, Json<serde_json::Value>)> {
    let user = sqlx::query_as::<_, User>(
        r#"UPDATE users SET
           display_name = COALESCE($1, display_name),
           phone        = COALESCE($2, phone),
           bio          = COALESCE($3, bio),
           updated_at   = NOW()
           WHERE id = $4
           RETURNING *"#,
    )
    .bind(&req.display_name)
    .bind(&req.phone)
    .bind(&req.bio)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR,
         Json(serde_json::json!({"error": format!("Database error: {}", e)})))
    })?;

    Ok(Json(user.into()))
}

pub async fn upload_avatar(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<UserResponse>, (StatusCode, Json<serde_json::Value>)> {
    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": format!("Multipart error: {}", e)})))
    })? {
        if field.name() == Some("avatar") {
            let content_type = field.content_type()
                .unwrap_or("image/jpeg")
                .to_string();
            let data = field.bytes().await.map_err(|e| {
                (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": format!("Read error: {}", e)})))
            })?;

            if data.len() > 5 * 1024 * 1024 {
                return Err((StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({"error": "Avatar must be under 5 MB"}))));
            }

            let allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
            if !allowed.contains(&content_type.as_str()) {
                return Err((StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({"error": "Only JPG, PNG, WebP or GIF allowed"}))));
            }

            file_data = Some((data.to_vec(), content_type));
        }
    }

    let (data, content_type) = file_data.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "No avatar field in request"})))
    })?;

    let ext = match content_type.as_str() {
        "image/png"  => "png",
        "image/webp" => "webp",
        "image/gif"  => "gif",
        _            => "jpg",
    };
    let key = format!("avatars/{}.{}", user_id, ext);

    state.storage.upload(&key, data, &content_type).await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR,
         Json(serde_json::json!({"error": format!("Upload failed: {}", e)})))
    })?;

    let avatar_url = state.storage.presigned_url(&key, 60 * 60 * 24 * 7).await
        .unwrap_or_else(|_| key.clone());

    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    )
    .bind(&avatar_url)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR,
         Json(serde_json::json!({"error": format!("Database error: {}", e)})))
    })?;

    Ok(Json(user.into()))
}
