use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Extension, Json,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::document::{Document, DocumentResponse},
    AppState,
};

const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: &[&str] = &["application/pdf", "image/jpeg", "image/png"];

pub async fn list_documents(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<DocumentResponse>>, (StatusCode, Json<serde_json::Value>)> {
    let docs = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Database error: {e}")})))
    })?;

    let response = docs.into_iter().map(|d| DocumentResponse {
        id: d.id,
        checklist_item_id: d.checklist_item_id,
        filename: d.filename,
        file_type: d.file_type,
        file_size: d.file_size,
        document_status: d.document_status,
        user_notes: d.user_notes,
        expiry_date: d.expiry_date,
        version: d.version,
        created_at: d.created_at,
    }).collect();

    Ok(Json(response))
}

pub async fn upload(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<DocumentResponse>, (StatusCode, Json<serde_json::Value>)> {
    let mut file_data: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;
    let mut content_type_str = String::from("application/octet-stream");
    let mut checklist_item_id: Option<Uuid> = None;
    let mut expiry_date: Option<chrono::NaiveDate> = None;
    let mut user_notes: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Multipart error: {e}")})))
    })? {
        match field.name().unwrap_or("") {
            "file" => {
                filename = field.file_name().map(str::to_string);
                if let Some(ct) = field.content_type() {
                    content_type_str = ct.to_string();
                }
                let bytes = field.bytes().await.map_err(|e| {
                    (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Read error: {e}")})))
                })?;
                file_data = Some(bytes.to_vec());
            }
            "checklist_item_id" => {
                if let Ok(text) = field.text().await {
                    checklist_item_id = Uuid::parse_str(text.trim()).ok();
                }
            }
            "expiry_date" => {
                if let Ok(text) = field.text().await {
                    expiry_date = chrono::NaiveDate::parse_from_str(text.trim(), "%Y-%m-%d").ok();
                }
            }
            "user_notes" => {
                if let Ok(text) = field.text().await {
                    user_notes = Some(text);
                }
            }
            _ => {}
        }
    }

    let data = file_data.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(json!({"error": "No file provided"})))
    })?;

    if !ALLOWED_TYPES.contains(&content_type_str.as_str()) {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "Only PDF, JPG, and PNG files are allowed"})),
        ));
    }

    if data.len() > MAX_FILE_SIZE {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({"error": "File too large. Maximum 10 MB."})),
        ));
    }

    let doc_id = Uuid::new_v4();
    let ext = match content_type_str.as_str() {
        "application/pdf" => "pdf",
        "image/png" => "png",
        _ => "jpg",
    };
    let storage_key = format!("{}/{}.{}", user_id, doc_id, ext);
    let fname = filename.unwrap_or_else(|| format!("document.{ext}"));
    let file_size = data.len() as i32;

    state.storage.upload(&storage_key, data, &content_type_str).await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Storage error: {e}")})))
    })?;

    let doc = sqlx::query_as::<_, Document>(
        r#"INSERT INTO documents
           (id, user_id, checklist_item_id, filename, file_type, file_size,
            storage_key, document_status, user_notes, expiry_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded', $8, $9)
           RETURNING *"#,
    )
    .bind(doc_id)
    .bind(user_id)
    .bind(checklist_item_id)
    .bind(&fname)
    .bind(&content_type_str)
    .bind(file_size)
    .bind(&storage_key)
    .bind(user_notes)
    .bind(expiry_date)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("DB error: {e}")})))
    })?;

    // Auto-update linked checklist item to 'uploaded' if it was 'missing'
    if let Some(item_id) = checklist_item_id {
        let _ = sqlx::query(
            "UPDATE user_checklist_items SET status = 'uploaded', updated_at = now() \
             WHERE id = $1 AND user_id = $2 AND status = 'missing'",
        )
        .bind(item_id)
        .bind(user_id)
        .execute(&state.db)
        .await;
    }

    Ok(Json(DocumentResponse {
        id: doc.id,
        checklist_item_id: doc.checklist_item_id,
        filename: doc.filename,
        file_type: doc.file_type,
        file_size: doc.file_size,
        document_status: doc.document_status,
        user_notes: doc.user_notes,
        expiry_date: doc.expiry_date,
        version: doc.version,
        created_at: doc.created_at,
    }))
}

pub async fn download_url(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(doc_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let doc = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE id = $1 AND user_id = $2",
    )
    .bind(doc_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("DB error: {e}")})))
    })?
    .ok_or_else(|| (StatusCode::NOT_FOUND, Json(json!({"error": "Document not found"}))))?;

    let url = state.storage.presigned_url(&doc.storage_key, 3600).await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("URL error: {e}")})))
    })?;

    Ok(Json(json!({ "url": url, "filename": doc.filename })))
}

pub async fn delete_document(
    State(state): State<Arc<AppState>>,
    Extension(user_id): Extension<Uuid>,
    Path(doc_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let doc = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE id = $1 AND user_id = $2",
    )
    .bind(doc_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("DB error: {e}")})))
    })?
    .ok_or_else(|| (StatusCode::NOT_FOUND, Json(json!({"error": "Document not found"}))))?;

    // Delete from S3 first (best-effort — don't block DB delete if S3 fails)
    if let Err(e) = state.storage.delete(&doc.storage_key).await {
        tracing::warn!("S3 delete failed for {}: {}", doc.storage_key, e);
    }

    sqlx::query("DELETE FROM documents WHERE id = $1 AND user_id = $2")
        .bind(doc_id)
        .bind(user_id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("DB error: {e}")})))
        })?;

    Ok(Json(json!({"status": "deleted"})))
}
