use shared_types::dtv_path::DtvPath;

/// Check if a financial amount meets the minimum threshold
pub fn meets_financial_threshold(amount: f64, min_balance: f64) -> bool {
    amount >= min_balance
}

/// Get default financial threshold for DTV (500,000 THB)
pub fn default_financial_threshold() -> f64 {
    500_000.0
}

/// Get required passport validity in months
pub fn required_passport_validity_months() -> i32 {
    6
}

/// Determine if a Soft Power subcategory is valid
pub fn is_valid_soft_power_activity(activity: &str) -> bool {
    matches!(
        activity,
        "muay_thai" | "cooking" | "medical" | "sport_training" | "seminar" | "music_festival"
    )
}

/// Get the display name for a DTV path
pub fn path_display_name(path: &DtvPath) -> &'static str {
    match path {
        DtvPath::Workcation => "Workcation",
        DtvPath::SoftPower => "Thai Soft Power",
        DtvPath::Dependent => "Dependent",
    }
}
