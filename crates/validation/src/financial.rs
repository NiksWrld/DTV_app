/// Validate financial document freshness
pub fn is_within_freshness_window(
    document_date: chrono::NaiveDate,
    max_days: i32,
) -> bool {
    let today = chrono::Utc::now().date_naive();
    let days_old = (today - document_date).num_days();
    days_old <= max_days as i64
}
