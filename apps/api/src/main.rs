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

/// Migration files run at startup, in order. Each file runs once and is then
/// recorded in `schema_migrations`. 005 is not listed: checklist templates come
/// from infra/seeds/checklist_items.sql.
const MIGRATIONS: &[(&str, &str)] = &[
    ("001_initial.sql", include_str!("../../../infra/migrations/001_initial.sql")),
    ("002_checklist_items.sql", include_str!("../../../infra/migrations/002_checklist_items.sql")),
    ("003_providers.sql", include_str!("../../../infra/migrations/003_providers.sql")),
    ("004_guides.sql", include_str!("../../../infra/migrations/004_guides.sql")),
    ("006_providers_plan.sql", include_str!("../../../infra/migrations/006_providers_plan.sql")),
    ("007_listing_type.sql", include_str!("../../../infra/migrations/007_listing_type.sql")),
    ("008_user_account.sql", include_str!("../../../infra/migrations/008_user_account.sql")),
    ("009_compliance.sql", include_str!("../../../infra/migrations/009_compliance.sql")),
    ("010_provider_certified.sql", include_str!("../../../infra/migrations/010_provider_certified.sql")),
    ("011_passport_expiry.sql", include_str!("../../../infra/migrations/011_passport_expiry.sql")),
    ("012_provider_portal.sql", include_str!("../../../infra/migrations/012_provider_portal.sql")),
    ("013_embassy_override.sql", include_str!("../../../infra/migrations/013_embassy_override.sql")),
    ("014_provider_views.sql", include_str!("../../../infra/migrations/014_provider_views.sql")),
    ("015_provider_bookings.sql", include_str!("../../../infra/migrations/015_provider_bookings.sql")),
    ("016_provider_reviews.sql", include_str!("../../../infra/migrations/016_provider_reviews.sql")),
    ("017_app_settings.sql", include_str!("../../../infra/migrations/017_app_settings.sql")),
    ("018_dedupe_providers.sql", include_str!("../../../infra/migrations/018_dedupe_providers.sql")),
    ("019_sat_certification.sql", include_str!("../../../infra/migrations/019_sat_certification.sql")),
];

/// Files up to here were written before tracking existed and were re-run on
/// every start, so on older databases their CREATE statements fail with
/// "already exists". Those errors are expected; the file is still recorded.
const LAST_UNTRACKED_MIGRATION: &str = "013_embassy_override.sql";

/// Split a migration file into statements, dropping chunks that are only comments.
fn statements(sql: &str) -> impl Iterator<Item = &str> {
    sql.split(';').map(str::trim).filter(|chunk| {
        chunk
            .lines()
            .any(|line| !line.trim().is_empty() && !line.trim_start().starts_with("--"))
    })
}

async fn run_migrations(db: &sqlx::PgPool) {
    if let Err(e) = sqlx::query(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )",
    )
    .execute(db)
    .await
    {
        tracing::error!("Could not create schema_migrations: {}", e);
        return;
    }
    let applied: std::collections::HashSet<String> =
        sqlx::query_scalar::<_, String>("SELECT filename FROM schema_migrations")
            .fetch_all(db)
            .await
            .unwrap_or_default()
            .into_iter()
            .collect();

    for (name, sql) in MIGRATIONS {
        if applied.contains(*name) {
            continue;
        }
        let legacy = *name <= LAST_UNTRACKED_MIGRATION;
        let mut failed = false;
        for statement in statements(sql) {
            if let Err(e) = sqlx::query(statement).execute(db).await {
                if legacy {
                    tracing::debug!("Migration {} note: {}", name, e);
                } else {
                    tracing::warn!("Migration {} failed: {}", name, e);
                    failed = true;
                }
            }
        }
        if failed {
            tracing::warn!("Migration {} not recorded; it will be retried on the next start", name);
            continue;
        }
        if let Err(e) = sqlx::query("INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING")
            .bind(name)
            .execute(db)
            .await
        {
            tracing::warn!("Could not record migration {}: {}", name, e);
        } else {
            tracing::info!("Applied migration {}", name);
        }
    }
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

    run_migrations(&db).await;

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
            for statement in statements(sql) {
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
        .route("/api/auth/register-provider", post(routes::auth::register_provider))
        .route("/api/auth/login", post(routes::auth::login))
        .route("/api/health", get(|| async { "ok" }));

    let protected_routes = Router::new()
        .route("/api/auth/me", get(routes::auth::me))
        .route("/api/onboarding/profile", get(routes::onboarding::get_profile))
        .route("/api/onboarding/profile", post(routes::onboarding::create_profile))
        .route("/api/onboarding/profile", put(routes::onboarding::update_profile))
        .route("/api/embassies", get(routes::onboarding::list_embassies))
        .route("/api/embassies/match", post(routes::onboarding::match_embassy))
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
        .route("/api/providers/:id/packages", get(routes::provider_portal::list_packages))
        .route("/api/providers/:id/requests", post(routes::bookings::create_request))
        .route("/api/bookings", get(routes::bookings::list_my_bookings))
        .route("/api/bookings/:id/cancel", post(routes::bookings::cancel_my_request))
        .route("/api/bookings/:id/letter", get(routes::bookings::my_letter_url))
        .route("/api/bookings/:id/review", post(routes::reviews::create_review))
        .route("/api/providers/:id/reviews", get(routes::reviews::list_provider_reviews))
        .route("/api/provider/reviews", get(routes::reviews::list_my_reviews))
        .route("/api/provider/reviews/:id/reply", post(routes::reviews::reply_to_review))
        .route("/api/provider/requests", get(routes::bookings::list_provider_requests))
        .route("/api/provider/requests/:id/approve", post(routes::bookings::approve_request))
        .route("/api/provider/requests/:id/decline", post(routes::bookings::decline_request))
        .route("/api/provider/requests/:id/complete", post(routes::bookings::complete_request))
        .route("/api/provider/requests/:id/letter", get(routes::bookings::provider_letter_url))
        .route("/api/provider/me", get(routes::provider_portal::get_mine).put(routes::provider_portal::update_listing).post(routes::provider_portal::create_listing))
        .route("/api/provider/claimable", get(routes::provider_portal::search_claimable))
        .route("/api/provider/claim", post(routes::provider_portal::claim_listing))
        .route("/api/provider/packages", post(routes::provider_portal::add_package))
        .route("/api/provider/packages/:id", delete(routes::provider_portal::delete_package))
        .route("/api/provider/photos", post(routes::provider_portal::upload_photo))
        .route("/api/provider/sat", get(routes::sat::my_sat).post(routes::sat::submit_sat))
        .route("/api/provider/sat/evidence", get(routes::sat::my_sat_evidence))
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
        .route("/api/admin/embassies/:id/sat", put(routes::sat::admin_update_embassy_rule))
        .route("/api/admin/sat", get(routes::sat::admin_list))
        .route("/api/admin/providers/:id/sat", post(routes::sat::admin_review))
        .route("/api/admin/providers/:id/sat/evidence", get(routes::sat::admin_evidence))
        .route("/api/admin/embassy-overrides", post(routes::admin::create_override))
        .route("/api/admin/providers", get(routes::admin::list_providers_admin).post(routes::admin::create_provider))
        .route("/api/admin/providers/:id/verify", put(routes::admin::verify_provider))
        .route("/api/admin/provider-stats", get(routes::provider_stats::list_view_stats))
        .route("/api/admin/provider-claims", get(routes::provider_portal::list_pending_claims))
        .route("/api/admin/provider-claims/:id", post(routes::provider_portal::review_claim))
        .route("/api/admin/providers/:id", put(routes::admin::update_provider).delete(routes::admin::delete_provider))
        .route("/api/admin/settings", get(routes::settings::get_settings).put(routes::settings::update_settings))
        .route("/api/admin/reviews", get(routes::reviews::admin_list_reviews))
        .route("/api/admin/reviews/:id", put(routes::reviews::admin_set_hidden))
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
