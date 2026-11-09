/// Known checklist item statuses stored in `user_checklist_items.status`.
pub fn normalize_checklist_status(status: &str) -> Option<&'static str> {
    match status {
        "missing" => Some("missing"),
        "uploaded" => Some("uploaded"),
        "under_review" => Some("under_review"),
        "accepted" => Some("accepted"),
        "risky" => Some("risky"),
        _ => None,
    }
}

/// Users can move along the preparation flow and can always step back.
/// `missing` is reachable from every status, including `accepted`.
pub fn allows_checklist_transition(from: &str, to: &str) -> bool {
    if normalize_checklist_status(to).is_none() {
        return false;
    }
    if from == to || to == "missing" {
        return true;
    }
    matches!(
        (from, to),
        ("missing", "uploaded")
            | ("uploaded", "accepted" | "under_review" | "risky")
            | ("accepted", "uploaded" | "under_review" | "risky")
            | ("under_review", "uploaded" | "accepted" | "risky")
            | ("risky", "uploaded" | "accepted" | "under_review")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepted_can_return_to_missing_or_uploaded() {
        assert!(allows_checklist_transition("accepted", "missing"));
        assert!(allows_checklist_transition("accepted", "uploaded"));
    }

    #[test]
    fn uploaded_can_be_cleared() {
        assert!(allows_checklist_transition("uploaded", "missing"));
    }

    #[test]
    fn missing_can_become_uploaded_but_not_skip_to_accepted() {
        assert!(allows_checklist_transition("missing", "uploaded"));
        assert!(!allows_checklist_transition("missing", "accepted"));
    }

    #[test]
    fn unknown_status_is_rejected_except_reset() {
        assert!(!allows_checklist_transition("done", "accepted"));
        assert!(allows_checklist_transition("done", "missing"));
        assert!(normalize_checklist_status("nope").is_none());
    }
}
