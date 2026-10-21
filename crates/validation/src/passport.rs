use chrono::NaiveDate;

/// Validate passport expiry meets minimum validity requirement
pub fn validate_passport_validity(
    expiry_date: NaiveDate,
    min_validity_months: i32,
) -> PassportValidation {
    let today = chrono::Utc::now().date_naive();
    let months_remaining = ((expiry_date - today).num_days() as f64 / 30.44).floor() as i32;

    PassportValidation {
        valid: months_remaining >= min_validity_months,
        months_remaining,
        min_required: min_validity_months,
        expires: expiry_date,
    }
}

pub struct PassportValidation {
    pub valid: bool,
    pub months_remaining: i32,
    pub min_required: i32,
    pub expires: NaiveDate,
}
