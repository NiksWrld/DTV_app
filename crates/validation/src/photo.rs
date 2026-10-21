/// Validate passport photo meets basic requirements
pub struct PhotoSpec {
    pub min_width_px: u32,
    pub min_height_px: u32,
    pub max_size_mb: f64,
    pub allowed_formats: Vec<String>,
}

impl Default for PhotoSpec {
    fn default() -> Self {
        Self {
            min_width_px: 600,
            min_height_px: 600,
            max_size_mb: 5.0,
            allowed_formats: vec!["jpg".into(), "jpeg".into(), "png".into()],
        }
    }
}

pub fn validate_photo(
    width: u32,
    height: u32,
    size_bytes: u64,
    format: &str,
    spec: &PhotoSpec,
) -> PhotoValidation {
    let size_mb = size_bytes as f64 / (1024.0 * 1024.0);

    PhotoValidation {
        valid: width >= spec.min_width_px
            && height >= spec.min_height_px
            && size_mb <= spec.max_size_mb
            && spec.allowed_formats.iter().any(|f| f.eq_ignore_ascii_case(format)),
        issues: {
            let mut issues = vec![];
            if width < spec.min_width_px {
                issues.push(format!("Width {}px < minimum {}px", width, spec.min_width_px));
            }
            if height < spec.min_height_px {
                issues.push(format!("Height {}px < minimum {}px", height, spec.min_height_px));
            }
            if size_mb > spec.max_size_mb {
                issues.push(format!("Size {:.1}MB > maximum {:.1}MB", size_mb, spec.max_size_mb));
            }
            if !spec.allowed_formats.iter().any(|f| f.eq_ignore_ascii_case(format)) {
                issues.push(format!("Format '{}' not allowed", format));
            }
            issues
        },
    }
}

pub struct PhotoValidation {
    pub valid: bool,
    pub issues: Vec<String>,
}
