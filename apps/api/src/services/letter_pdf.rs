//! Minimal, dependency-free PDF writer for DTV enrollment letters.
//!
//! Uses the standard Helvetica fonts (no embedding) with WinAnsi encoding, so it
//! builds the same on Linux and Windows MSVC. Characters outside Latin-1 are
//! replaced with '?'.

use chrono::NaiveDate;

pub struct LetterData {
    pub reference: String,
    pub letter_date: NaiveDate,
    pub provider_name: String,
    pub provider_address: Option<String>,
    pub provider_email: Option<String>,
    pub provider_phone: Option<String>,
    pub student_name: String,
    pub nationality: Option<String>,
    pub passport_number: Option<String>,
    pub course_name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub hours_per_week: f64,
    pub fees_paid: Option<f64>,
    pub currency: String,
}

const PAGE_W: f64 = 595.28; // A4 in points
const PAGE_H: f64 = 841.89;
const MARGIN: f64 = 64.0;

#[derive(Clone, Copy)]
enum Font {
    Regular,
    Bold,
}

struct Page {
    ops: Vec<u8>,
    y: f64,
}

impl Page {
    fn new() -> Self {
        Self { ops: Vec::new(), y: PAGE_H - MARGIN }
    }

    fn text_at(&mut self, font: Font, size: f64, x: f64, y: f64, text: &str) {
        let name = match font {
            Font::Regular => "F1",
            Font::Bold => "F2",
        };
        self.ops.extend_from_slice(format!("BT /{name} {size:.1} Tf 1 0 0 1 {x:.2} {y:.2} Tm (").as_bytes());
        self.ops.extend_from_slice(&encode(text));
        self.ops.extend_from_slice(b") Tj ET\n");
    }

    fn line(&mut self, font: Font, size: f64, text: &str) {
        self.y -= size * 1.35;
        let y = self.y;
        self.text_at(font, size, MARGIN, y, text);
    }

    fn paragraph(&mut self, size: f64, text: &str) {
        let max = PAGE_W - 2.0 * MARGIN;
        for line in wrap(text, size, max) {
            self.line(Font::Regular, size, &line);
        }
    }

    fn gap(&mut self, pts: f64) {
        self.y -= pts;
    }

    fn rule(&mut self) {
        self.y -= 8.0;
        let y = self.y;
        self.ops.extend_from_slice(
            format!("0.6 w 0.75 G {:.2} {y:.2} m {:.2} {y:.2} l S 0 G\n", MARGIN, PAGE_W - MARGIN).as_bytes(),
        );
        self.y -= 4.0;
    }

    fn row(&mut self, label: &str, value: &str) {
        let size = 10.5;
        let value_x = MARGIN + 150.0;
        let lines = wrap(value, size, PAGE_W - MARGIN - value_x);
        self.y -= size * 1.5;
        let y = self.y;
        self.text_at(Font::Bold, size, MARGIN, y, label);
        for (i, line) in lines.iter().enumerate() {
            if i > 0 {
                self.y -= size * 1.35;
            }
            let y = self.y;
            self.text_at(Font::Regular, size, value_x, y, line);
        }
    }
}

/// Map to WinAnsi bytes and escape PDF string delimiters.
fn encode(text: &str) -> Vec<u8> {
    let mut out = Vec::with_capacity(text.len());
    for ch in text.chars() {
        let byte = match ch {
            '\u{2013}' => 0x96,
            '\u{2014}' => 0x97,
            '\u{2018}' => 0x91,
            '\u{2019}' => 0x92,
            '\u{201C}' => 0x93,
            '\u{201D}' => 0x94,
            '\u{2022}' => 0x95,
            '\u{20AC}' => 0x80,
            c if (c as u32) < 0x20 => b' ',
            c if (c as u32) <= 0xFF && !(0x80..0xA0).contains(&(c as u32)) => c as u32 as u8,
            _ => b'?',
        };
        if matches!(byte, b'(' | b')' | b'\\') {
            out.push(b'\\');
        }
        out.push(byte);
    }
    out
}

/// Rough Helvetica advance width in 1/1000 em.
fn char_width(ch: char) -> f64 {
    match ch {
        'i' | 'j' | 'l' | '.' | ',' | ':' | ';' | '\'' | '!' | '|' => 260.0,
        ' ' | 'f' | 't' | 'r' | 'I' | '(' | ')' | '-' | '/' => 320.0,
        'm' | 'w' | 'M' | 'W' | '@' => 860.0,
        'A'..='Z' => 690.0,
        '0'..='9' => 556.0,
        _ => 540.0,
    }
}

fn text_width(text: &str, size: f64) -> f64 {
    text.chars().map(char_width).sum::<f64>() * size / 1000.0
}

fn wrap(text: &str, size: f64, max_width: f64) -> Vec<String> {
    let mut lines = Vec::new();
    for raw in text.split('\n') {
        let mut current = String::new();
        for word in raw.split_whitespace() {
            let candidate = if current.is_empty() { word.to_string() } else { format!("{current} {word}") };
            if text_width(&candidate, size) > max_width && !current.is_empty() {
                lines.push(std::mem::take(&mut current));
                current = word.to_string();
            } else {
                current = candidate;
            }
        }
        lines.push(current);
    }
    lines
}

fn long_date(date: NaiveDate) -> String {
    date.format("%-d %B %Y").to_string()
}

fn money(amount: f64) -> String {
    let whole = amount.round() as i64;
    let digits = whole.abs().to_string();
    let mut out = String::new();
    for (i, ch) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(ch);
    }
    if whole < 0 {
        format!("-{out}")
    } else {
        out
    }
}

fn duration_text(start: NaiveDate, end: NaiveDate) -> String {
    let days = (end - start).num_days().max(0) + 1;
    let months = days as f64 / 30.44;
    if months >= 1.0 {
        format!("{days} days (about {:.1} months)", months)
    } else {
        format!("{days} days")
    }
}

pub fn render(letter: &LetterData) -> Vec<u8> {
    let mut page = Page::new();

    page.line(Font::Bold, 18.0, &letter.provider_name);
    if let Some(address) = letter.provider_address.as_deref().filter(|s| !s.trim().is_empty()) {
        page.line(Font::Regular, 10.0, &format!("{address}, Thailand"));
    }
    let contact: Vec<String> = [
        letter.provider_email.as_deref().map(|e| format!("Email: {e}")),
        letter.provider_phone.as_deref().map(|p| format!("Phone: {p}")),
    ]
    .into_iter()
    .flatten()
    .filter(|s| !s.trim().ends_with(':'))
    .collect();
    if !contact.is_empty() {
        page.line(Font::Regular, 10.0, &contact.join("   |   "));
    }
    page.rule();

    page.gap(6.0);
    page.line(Font::Regular, 10.5, &format!("Date: {}", long_date(letter.letter_date)));
    page.line(Font::Regular, 10.5, &format!("Reference: {}", letter.reference));
    page.gap(14.0);
    page.line(Font::Regular, 10.5, "To: The Royal Thai Embassy / Royal Thai Consulate-General");
    page.line(Font::Regular, 10.5, "To whom it may concern");
    page.gap(14.0);
    page.line(
        Font::Bold,
        12.0,
        "Confirmation of enrollment - Destination Thailand Visa (DTV), Soft Power",
    );
    page.gap(6.0);
    page.paragraph(
        10.5,
        &format!(
            "This letter confirms that the person named below has enrolled in the following programme at {}. \
             The programme takes place in Thailand on the dates stated.",
            letter.provider_name
        ),
    );
    page.gap(4.0);

    page.row("Student name", &letter.student_name);
    page.row("Nationality", letter.nationality.as_deref().unwrap_or("-"));
    page.row("Passport number", letter.passport_number.as_deref().filter(|s| !s.trim().is_empty()).unwrap_or("-"));
    page.row("Programme / course", &letter.course_name);
    page.row("Start date", &long_date(letter.start_date));
    page.row("End date", &long_date(letter.end_date));
    page.row("Duration", &duration_text(letter.start_date, letter.end_date));
    page.row("Hours per week", &format!("{} hours", trim_float(letter.hours_per_week)));
    page.row(
        "Fees paid",
        &match letter.fees_paid {
            Some(amount) if amount > 0.0 => format!("{} {}", letter.currency, money(amount)),
            _ => "-".to_string(),
        },
    );

    page.gap(16.0);
    page.paragraph(
        10.5,
        &format!(
            "We kindly ask that this enrollment be taken into account for the applicant's Destination Thailand Visa. \
             To verify this letter, please contact {} and quote reference {}.",
            letter.provider_name, letter.reference
        ),
    );

    page.gap(24.0);
    page.line(Font::Regular, 10.5, "Yours faithfully,");
    page.gap(42.0);
    page.line(Font::Regular, 10.5, "______________________________");
    page.line(Font::Regular, 10.5, &format!("Authorised signatory, {}", letter.provider_name));
    page.line(Font::Regular, 9.0, "Name, position, and company stamp");

    let footer = format!(
        "Issued through the DTV app  |  Reference {}  |  {}",
        letter.reference,
        long_date(letter.letter_date)
    );
    page.text_at(Font::Regular, 8.0, MARGIN, MARGIN - 24.0, &footer);

    assemble(&page.ops)
}

fn trim_float(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{}", value as i64)
    } else {
        format!("{value:.1}")
    }
}

fn assemble(content: &[u8]) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    let mut offsets: Vec<usize> = Vec::new();
    out.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    let objects: Vec<Vec<u8>> = vec![
        b"<< /Type /Catalog /Pages 2 0 R >>".to_vec(),
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_vec(),
        format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] \
             /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>"
        )
        .into_bytes(),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>".to_vec(),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>".to_vec(),
        {
            let mut stream = format!("<< /Length {} >>\nstream\n", content.len()).into_bytes();
            stream.extend_from_slice(content);
            stream.extend_from_slice(b"\nendstream");
            stream
        },
    ];

    for (i, body) in objects.iter().enumerate() {
        offsets.push(out.len());
        out.extend_from_slice(format!("{} 0 obj\n", i + 1).as_bytes());
        out.extend_from_slice(body);
        out.extend_from_slice(b"\nendobj\n");
    }

    let xref_at = out.len();
    out.extend_from_slice(format!("xref\n0 {}\n0000000000 65535 f \n", objects.len() + 1).as_bytes());
    for offset in offsets {
        out.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    out.extend_from_slice(
        format!("trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF\n", objects.len() + 1).as_bytes(),
    );
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> LetterData {
        LetterData {
            reference: "DTV-261109-ABCD1234".into(),
            letter_date: NaiveDate::from_ymd_opt(2026, 11, 9).unwrap(),
            provider_name: "Tiger (Muay) Thai".into(),
            provider_address: Some("Chalong, Phuket".into()),
            provider_email: Some("info@example.com".into()),
            provider_phone: None,
            student_name: "Jan Müller".into(),
            nationality: Some("Germany".into()),
            passport_number: Some("C01X00T47".into()),
            course_name: "6-month Muay Thai programme".into(),
            start_date: NaiveDate::from_ymd_opt(2027, 1, 5).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2027, 7, 4).unwrap(),
            hours_per_week: 12.0,
            fees_paid: Some(82000.0),
            currency: "THB".into(),
        }
    }

    #[test]
    fn renders_a_valid_looking_pdf() {
        let pdf = render(&sample());
        assert!(pdf.starts_with(b"%PDF-1.4"));
        assert!(pdf.ends_with(b"%%EOF\n"));
        let text = String::from_utf8_lossy(&pdf);
        assert!(text.contains("Tiger \\(Muay\\) Thai"));
        assert!(text.contains("82,000"));
        // xref offset points at the xref keyword
        let start = text.rfind("startxref\n").unwrap() + "startxref\n".len();
        let offset: usize = text[start..].lines().next().unwrap().trim().parse().unwrap();
        assert_eq!(&pdf[offset..offset + 4], b"xref");
        if let Ok(path) = std::env::var("LETTER_PDF_OUT") {
            std::fs::write(path, &pdf).unwrap();
        }
    }

    #[test]
    fn wraps_long_text() {
        let lines = wrap(&"word ".repeat(80), 10.5, 300.0);
        assert!(lines.len() > 3);
    }
}
