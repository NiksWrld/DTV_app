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

    /// Turn a stored avatar or photo value into an object key.
    /// Bare keys are returned as-is. Presigned URLs for this bucket yield the
    /// key after the bucket segment. Other http(s) URLs are left alone.
    pub fn object_key<'a>(&self, stored: &'a str) -> Option<String> {
        stored_object_key(&self.bucket, stored)
    }

    pub async fn present(&self, stored: &str) -> String {
        match self.object_key(stored) {
            Some(key) => self.presigned_url(&key, 60 * 60).await.unwrap_or_else(|_| stored.to_string()),
            None => stored.to_string(),
        }
    }

    pub async fn present_opt(&self, stored: Option<String>) -> Option<String> {
        match stored {
            Some(value) if !value.trim().is_empty() => Some(self.present(&value).await),
            _ => stored.filter(|value| !value.trim().is_empty()),
        }
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

pub fn stored_object_key(bucket: &str, stored: &str) -> Option<String> {
    let stored = stored.trim();
    if stored.is_empty() {
        return None;
    }
    if !stored.starts_with("http://") && !stored.starts_with("https://") {
        let key = stored.trim_start_matches('/');
        return if key.is_empty() { None } else { Some(decode_path(key)) };
    }
    let rest = stored
        .strip_prefix("https://")
        .or_else(|| stored.strip_prefix("http://"))?;
    let (host, path_and_query) = rest.split_once('/')?;
    let path = path_and_query.split(['?', '#']).next().unwrap_or("").trim_start_matches('/');
    if path.is_empty() {
        return None;
    }
    let prefix = format!("{bucket}/");
    if let Some(key) = path.strip_prefix(&prefix) {
        if !key.is_empty() {
            return Some(decode_path(key));
        }
    }
    if host.starts_with(&format!("{bucket}.")) {
        return Some(decode_path(path));
    }
    None
}

fn decode_path(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(byte) = u8::from_str_radix(&value[i + 1..i + 3], 16) {
                out.push(byte as char);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::stored_object_key;

    #[test]
    fn path_style_presigned_url_yields_the_key_after_the_bucket() {
        let url = "http://127.0.0.1:9000/dtv-documents/avatars/abc.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minio";
        assert_eq!(
            stored_object_key("dtv-documents", url).as_deref(),
            Some("avatars/abc.jpg")
        );
    }

    #[test]
    fn virtual_hosted_url_uses_the_path_as_the_key() {
        let url = "https://dtv-documents.s3.us-east-1.amazonaws.com/providers/u/p.png?X-Amz-Date=1";
        assert_eq!(
            stored_object_key("dtv-documents", url).as_deref(),
            Some("providers/u/p.png")
        );
    }

    #[test]
    fn bare_key_and_external_url() {
        assert_eq!(stored_object_key("dtv-documents", "avatars/abc.jpg").as_deref(), Some("avatars/abc.jpg"));
        assert!(stored_object_key("dtv-documents", "https://example.com/photo.jpg").is_none());
    }
}
