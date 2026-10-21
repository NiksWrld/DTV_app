#[derive(Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub s3_bucket: String,
    pub s3_endpoint: Option<String>,
    pub s3_region: String,
    pub s3_access_key: String,
    pub s3_secret_key: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://dtv:dtv@localhost:5432/dtv".to_string()),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "change-me-in-production".to_string()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .unwrap_or(3001),
            s3_bucket: std::env::var("S3_BUCKET")
                .unwrap_or_else(|_| "dtv-documents".to_string()),
            s3_endpoint: std::env::var("S3_ENDPOINT").ok(),
            s3_region: std::env::var("S3_REGION")
                .unwrap_or_else(|_| "us-east-1".to_string()),
            s3_access_key: std::env::var("S3_ACCESS_KEY")
                .unwrap_or_else(|_| "minioadmin".to_string()),
            s3_secret_key: std::env::var("S3_SECRET_KEY")
                .unwrap_or_else(|_| "minioadmin".to_string()),
        }
    }
}
