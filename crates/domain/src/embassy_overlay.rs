use shared_types::embassy::EmbassyOverride;

/// Apply embassy-specific overrides to a checklist template
pub fn apply_overrides(
    template_title: &str,
    template_required: bool,
    overrides: &[EmbassyOverride],
) -> (String, bool, bool) {
    let mut title = template_title.to_string();
    let mut required = template_required;
    let mut removed = false;

    for override_item in overrides {
        match override_item.override_type {
            shared_types::embassy::OverrideType::Remove => {
                removed = true;
            }
            shared_types::embassy::OverrideType::Modify => {
                if let Some(ref t) = override_item.modified_title {
                    title = t.clone();
                }
                if let Some(r) = override_item.modified_required {
                    required = r;
                }
            }
            shared_types::embassy::OverrideType::Add => {
                // Add handled at the DB query level
            }
        }
    }

    (title, required, removed)
}
