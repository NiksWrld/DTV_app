use sqlx::PgPool;
use uuid::Uuid;

use crate::models::checklist::ChecklistItemResponse;

/// Generate a personalized checklist for a user based on their profile.
///
/// Flow:
/// 1. Load applicant profile (path, embassy, dependents, etc.)
/// 2. Load global checklist templates for the selected path
/// 3. Load embassy-specific overrides
/// 4. Merge: apply overrides, filter by subcategory, add conditional items
/// 5. Insert generated items into user_checklist_items
/// 6. Return sorted items
pub async fn generate_checklist(
    db: &PgPool,
    user_id: Uuid,
) -> Result<Vec<ChecklistItemResponse>, String> {
    // 1. Load profile
    let profile = sqlx::query_as::<_, (String, Option<String>, Option<Uuid>, bool)>(
        r#"SELECT intended_path, soft_power_interest, preferred_embassy_id, has_dependents
           FROM applicant_profiles WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(db)
    .await
    .map_err(|e| format!("Failed to load profile: {}", e))?
    .ok_or_else(|| "Profile not found".to_string())?;

    let (path, subcategory, embassy_id, has_dependents) = profile;

    // 2. Delete existing items for regeneration
    sqlx::query("DELETE FROM user_checklist_items WHERE user_id = $1")
        .bind(user_id)
        .execute(db)
        .await
        .map_err(|e| format!("Failed to clear existing items: {}", e))?;

    // 3. Load global templates for this path
    let templates = sqlx::query_as::<_, (Uuid, String, Option<String>, bool, i32, Option<serde_json::Value>, Option<serde_json::Value>, Option<i32>, Option<String>, Option<i32>)>(
        r#"SELECT id, title, description, required, display_order,
           accepted_document_types, evidence_examples,
           freshness_window_days, min_balance_amount::TEXT, min_validity_days
           FROM checklist_templates
           WHERE visa_path = $1
           AND (subcategory IS NULL OR subcategory = $2 OR $2 IS NULL)
           ORDER BY display_order"#,
    )
    .bind(&path)
    .bind(&subcategory)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Failed to load templates: {}", e))?;

    // 4. Load embassy overrides if applicable
    let overrides = if let Some(eid) = embassy_id {
        sqlx::query_as::<_, (Uuid, String, Option<String>, Option<bool>)>(
            r#"SELECT checklist_template_id, override_type, modified_title, modified_required
               FROM embassy_overrides WHERE embassy_id = $1"#,
        )
        .bind(eid)
        .fetch_all(db)
        .await
        .map_err(|e| format!("Failed to load overrides: {}", e))?
    } else {
        vec![]
    };

    let override_map: std::collections::HashMap<Uuid, (String, Option<String>, Option<bool>)> =
        overrides.into_iter().map(|(id, t, title, req)| (id, (t, title, req))).collect();

    // 5. Insert items
    let mut items = Vec::new();

    for (template_id, title, description, required, display_order, doc_types, examples, freshness, balance, validity) in &templates {
        let mut final_title = title.clone();
        let mut final_required = *required;
        let mut skip = false;

        if let Some((override_type, mod_title, mod_required)) = override_map.get(template_id) {
            match override_type.as_str() {
                "remove" => skip = true,
                "modify" => {
                    if let Some(t) = mod_title {
                        final_title = t.clone();
                    }
                    if let Some(r) = mod_required {
                        final_required = *r;
                    }
                }
                _ => {}
            }
        }

        if skip {
            continue;
        }

        let item = sqlx::query_as::<_, (Uuid,)>(
            r#"INSERT INTO user_checklist_items
               (user_id, template_id, title, description, required, status, display_order)
               VALUES ($1, $2, $3, $4, $5, 'missing', $6)
               RETURNING id"#,
        )
        .bind(user_id)
        .bind(template_id)
        .bind(&final_title)
        .bind(description)
        .bind(final_required)
        .bind(display_order)
        .fetch_one(db)
        .await
        .map_err(|e| format!("Failed to insert item: {}", e))?;

        items.push(ChecklistItemResponse {
            id: item.0,
            template_id: Some(*template_id),
            title: final_title,
            description: description.clone(),
            required: final_required,
            status: "missing".to_string(),
            display_order: *display_order,
            accepted_document_types: doc_types.clone(),
            evidence_examples: examples.clone(),
            freshness_window_days: *freshness,
            min_balance_amount: balance.clone(),
            min_validity_days: *validity,
        });
    }

    // 6. Add dependent items if applicable
    if has_dependents {
        let dep_templates = sqlx::query_as::<_, (Uuid, String, Option<String>, bool, i32)>(
            r#"SELECT id, title, description, required, display_order
               FROM checklist_templates
               WHERE visa_path = 'dependent'
               ORDER BY display_order"#,
        )
        .fetch_all(db)
        .await
        .map_err(|e| format!("Failed to load dependent templates: {}", e))?;

        for (template_id, title, description, required, display_order) in dep_templates {
            let item = sqlx::query_as::<_, (Uuid,)>(
                r#"INSERT INTO user_checklist_items
                   (user_id, template_id, title, description, required, status, display_order)
                   VALUES ($1, $2, $3, $4, $5, 'missing', $6)
                   RETURNING id"#,
            )
            .bind(user_id)
            .bind(template_id)
            .bind(&title)
            .bind(&description)
            .bind(required)
            .bind(display_order)
            .fetch_one(db)
            .await
            .map_err(|e| format!("Failed to insert dependent item: {}", e))?;

            items.push(ChecklistItemResponse {
                id: item.0,
                template_id: Some(template_id),
                title,
                description,
                required,
                status: "missing".to_string(),
                display_order,
                accepted_document_types: None,
                evidence_examples: None,
                freshness_window_days: None,
                min_balance_amount: None,
                min_validity_days: None,
            });
        }
    }

    items.sort_by_key(|i| i.display_order);
    Ok(items)
}
