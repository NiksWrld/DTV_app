/// Email client placeholder
pub struct EmailClient {
    pub from: String,
}

impl EmailClient {
    pub fn new(from: &str) -> Self {
        Self {
            from: from.to_string(),
        }
    }

    pub async fn send(&self, _to: &str, _subject: &str, _body: &str) -> Result<(), String> {
        tracing::info!("Email would be sent to: {} subject: {}", _to, _subject);
        Ok(())
    }
}
