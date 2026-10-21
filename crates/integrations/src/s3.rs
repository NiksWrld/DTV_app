use aws_config::Region;
use aws_sdk_s3::{
    config::{Builder as S3ConfigBuilder, Credentials},
    presigning::PresigningConfig,
    primitives::ByteStream,
    Client,
};
use std::time::Duration;

#[derive(Clone)]
pub struct StorageClient {
    client: Client,
    bucket: String,
}

impl StorageClient {
    pub async fn new(
        bucket: &str,
        endpoint: Option<&str>,
        region: &str,
        access_key: &str,
        secret_key: &str,
    ) -> Self {
        let creds = Credentials::new(access_key, secret_key, None, None, "static");

        let mut base = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(Region::new(region.to_string()))
            .credentials_provider(creds);

        if let Some(ep) = endpoint {
            base = base.endpoint_url(ep);
        }

        let base_config = base.load().await;

        let mut s3_builder = S3ConfigBuilder::from(&base_config);
        if endpoint.is_some() {
            s3_builder = s3_builder.force_path_style(true);
        }

        Self {
            client: Client::from_conf(s3_builder.build()),
            bucket: bucket.to_string(),
        }
    }

    pub async fn upload(&self, key: &str, data: Vec<u8>, content_type: &str) -> Result<(), String> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(data))
            .content_type(content_type)
            .send()
            .await
            .map_err(|e| format!("Upload failed: {e}"))?;
        Ok(())
    }

    pub async fn presigned_url(&self, key: &str, expires_secs: u64) -> Result<String, String> {
        let config = PresigningConfig::expires_in(Duration::from_secs(expires_secs))
            .map_err(|e| format!("Presigning config: {e}"))?;

        let presigned = self.client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(config)
            .await
            .map_err(|e| format!("Presigned URL: {e}"))?;

        Ok(presigned.uri().to_string())
    }

    pub async fn delete(&self, key: &str) -> Result<(), String> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| format!("Delete failed: {e}"))?;
        Ok(())
    }
}
