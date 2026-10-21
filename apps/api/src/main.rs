use axum::{
    middleware as axum_mw,
    routing::{get, post, put, delete},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

mod config;
mod db;
mod middleware;
mod models;
mod routes;
mod services;

pub struct AppState {
    pub db: sqlx::PgPool,
    pub config: config::AppConfig,
    pub storage: integrations::s3::StorageClient,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    dotenvy::dotenv().ok();

    let config = config::AppConfig::from_env();
    let db = PgPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    let migration_files = [
        include_str!("../../../infra/migrations/001_initial.sql"),
        include_str!("../../../infra/migrations/002_checklist_items.sql"),
        include_str!("../../../infra/migrations/003_providers.sql"),
        include_str!("../../../infra/migrations/004_guides.sql"),
        include_str!("../../../infra/migrations/006_providers_plan.sql"),
        include_str!("../../../infra/migrations/007_listing_type.sql"),
        include_str!("../../../infra/migrations/008_user_account.sql"),
        include_str!("../../../infra/migrations/009_compliance.sql"),
        include_str!("../../../infra/migrations/010_provider_certified.sql"),
    ];
    for sql in &migration_files {
        for statement in sql.split(';').map(|s| s.trim()).filter(|s| !s.is_empty()) {
            if let Err(e) = sqlx::query(statement).execute(&db).await {
                tracing::warn!("Migration note: {}", e);
            }
        }
    }

    // Seed data (idempotent)
    let embassy_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM embassies")
        .fetch_one(&db).await.unwrap_or(0);

    if embassy_count == 0 {
        tracing::info!("Seeding database...");
        let seed_files = [
            include_str!("../../../infra/seeds/embassies.sql"),
            include_str!("../../../infra/seeds/checklist_items.sql"),
            include_str!("../../../infra/seeds/providers.sql"),
            include_str!("../../../infra/seeds/guides.sql"),
        ];
        for sql in &seed_files {
            for statement in sql.split(';').map(|s| s.trim()).filter(|s| !s.is_empty()) {
                if let Err(e) = sqlx::query(statement).execute(&db).await {
                    tracing::warn!("Seed note: {}", e);
                }
            }
        }
        tracing::info!("Seeding complete.");
    } else {
        tracing::info!("Database already seeded, skipping.");
    }

    // Always ensure admin account exists
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };
    let salt = SaltString::generate(&mut OsRng);
    let admin_hash = Argon2::default()
        .hash_password(b"admin123", &salt)
        .unwrap()
        .to_string();
    sqlx::query("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING")
        .bind("admin@dtv.local")
        .bind(&admin_hash)
        .execute(&db)
        .await
        .unwrap_or_else(|e| { tracing::warn!("Admin seed: {}", e); Default::default() });

    // S3 / MinIO storage client
    let storage = integrations::s3::StorageClient::new(
        &config.s3_bucket,
        config.s3_endpoint.as_deref(),
        &config.s3_region,
        &config.s3_access_key,
        &config.s3_secret_key,
    ).await;
    tracing::info!("Storage client initialized (bucket: {})", config.s3_bucket);

    let state = Arc::new(AppState {
        db,
        config: config.clone(),
        storage,
    });

    let public_routes = Router::new()
        .route("/api/auth/register", post(routes::auth::register))
        .route("/api/auth/login", post(routes::auth::login))
        .route("/api/health", get(|| async { "ok" }));

    let protected_routes = Router::new()
        .route("/api/auth/me", get(routes::auth::me))
        .route("/api/onboarding/profile", get(routes::onboarding::get_profile))
        .route("/api/onboarding/profile", post(routes::onboarding::create_profile))
        .route("/api/onboarding/profile", put(routes::onboarding::update_profile))
        .route("/api/embassies", get(routes::onboarding::list_embassies))
        .route("/api/checklist", get(routes::checklist::get_checklist))
        .route("/api/checklist/generate", post(routes::checklist::generate))
        .route("/api/checklist/:id/status", put(routes::checklist::update_status))
        .route("/api/documents", get(routes::documents::list_documents))
        .route("/api/documents/upload", post(routes::documents::upload))
        .route("/api/documents/:id/download", get(routes::documents::download_url))
        .route("/api/documents/:id", delete(routes::documents::delete_document))
        .route("/api/providers", get(routes::providers::list_providers))
        .route("/api/providers/categories", get(routes::providers::list_categories))
        .route("/api/providers/:id", get(routes::providers::get_provider))
        .route("/api/plan", get(routes::providers::list_plan).post(routes::providers::add_plan_item))
        .route("/api/plan/:id", put(routes::providers::update_plan_item).delete(routes::providers::delete_plan_item))
        .route("/api/guides", get(routes::guides::list_guides))
        .route("/api/guides/:slug", get(routes::guides::get_guide))
        .route("/api/faq", get(routes::guides::list_faq))
        .route("/api/account", get(routes::account::get_account).put(routes::account::update_account))
        .route("/api/account/avatar", post(routes::account::upload_avatar))
        .route("/api/compliance", get(routes::compliance::get_overview))
        .route("/api/compliance/entry", post(routes::compliance::set_entry))
        .route("/api/compliance/tasks", post(routes::compliance::create_task))
        .route("/api/compliance/tasks/:id/complete", put(routes::compliance::complete_task))
        .route("/api/compliance/tasks/:id", put(routes::compliance::update_task).delete(routes::compliance::delete_task))
        .route("/api/review", get(routes::review::get_review))
        .route("/api/review/generate", post(routes::review::generate))
        .route_layer(axum_mw::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::require_auth,
        ));

    let admin_routes = Router::new()
        .route("/api/admin/checklist", get(routes::admin::list_templates).post(routes::admin::create_template))
        .route("/api/admin/checklist/:id", put(routes::admin::update_template).delete(routes::admin::delete_template))
        .route("/api/admin/embassies", get(routes::admin::list_embassies))
        .route("/api/admin/embassy-overrides", post(routes::admin::create_override))
        .route("/api/admin/providers", get(routes::admin::list_providers_admin).post(routes::admin::create_provider))
        .route("/api/admin/providers/:id/verify", put(routes::admin::verify_provider))
        .route("/api/admin/providers/:id", put(routes::admin::update_provider).delete(routes::admin::delete_provider))
        .route("/api/admin/users", get(routes::admin::list_users_admin))
        .route("/api/admin/users/:id", put(routes::admin::update_user_role))
        .route_layer(axum_mw::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::require_admin,
        ));

    let app = public_routes
        .merge(protected_routes)
        .merge(admin_routes)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = format!("0.0.0.0:{}", config.port);
    tracing::info!("Server starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}
