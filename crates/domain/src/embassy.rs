/// A Thai embassy or consulate the matcher can choose.
#[derive(Debug, Clone)]
pub struct EmbassyPost {
    pub country: String,
    pub city: String,
    pub name: String,
}

/// Pick the post that covers where the applicant lives now.
/// Nationality is intentionally ignored.
pub fn match_embassy<'a>(
    country: &str,
    city: Option<&str>,
    posts: &'a [EmbassyPost],
) -> Option<&'a EmbassyPost> {
    let country_key = canonical_country(country);
    let in_country: Vec<&EmbassyPost> = posts
        .iter()
        .filter(|post| canonical_country(&post.country) == country_key)
        .collect();
    if in_country.is_empty() {
        return None;
    }

    if let Some(city) = city.map(str::trim).filter(|value| !value.is_empty()) {
        let city_key = normalize(city);
        if let Some(post) = in_country.iter().copied().find(|post| {
            let post_city = normalize(&post.city);
            post_city == city_key || city_key.contains(&post_city) || post_city.contains(&city_key)
        }) {
            return Some(post);
        }
        if let Some(region_city) = region_city(&country_key, &city_key) {
            if let Some(post) = in_country.iter().copied().find(|post| normalize(&post.city) == region_city) {
                return Some(post);
            }
        }
    }

    in_country
        .iter()
        .copied()
        .find(|post| post.name.to_ascii_lowercase().contains("embassy"))
        .or_else(|| in_country.first().copied())
}

fn normalize(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch.to_ascii_lowercase() } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn canonical_country(value: &str) -> String {
    match normalize(value).as_str() {
        "usa" | "us" | "u s" | "u s a" | "america" | "united states of america" => "united states".to_string(),
        "uk" | "u k" | "britain" | "great britain" | "england" | "scotland" | "wales" => "united kingdom".to_string(),
        "uae" | "u a e" | "dubai" => "united arab emirates".to_string(),
        "korea" | "republic of korea" => "south korea".to_string(),
        "holland" => "netherlands".to_string(),
        other => other.to_string(),
    }
}

fn region_city(country: &str, city: &str) -> Option<&'static str> {
    let west = ["los angeles", "san francisco", "seattle", "portland", "san diego", "california", "oregon", "nevada", "arizona", "hawaii", "alaska", "washington state"];
    let midwest = ["chicago", "dallas", "houston", "austin", "texas", "illinois", "michigan", "ohio", "minnesota", "wisconsin", "colorado", "missouri", "denver"];
    let east = ["new york", "boston", "philadelphia", "miami", "atlanta", "florida", "georgia", "massachusetts", "new jersey", "pennsylvania"];
    let sydney = ["sydney", "melbourne", "brisbane", "perth", "adelaide", "queensland", "victoria"];
    let vancouver = ["vancouver", "calgary", "victoria", "british columbia", "alberta"];
    let shanghai = ["shanghai", "hangzhou", "suzhou", "nanjing"];
    let hong_kong = ["hong kong", "hongkong", "macau", "macao"];

    let hit = |needles: &[&str]| needles.iter().any(|needle| city.contains(needle));
    match country {
        "united states" if hit(&west) => Some("los angeles"),
        "united states" if hit(&midwest) => Some("chicago"),
        "united states" if hit(&east) => Some("new york"),
        "united states" => Some("washington d c"),
        "australia" if hit(&sydney) => Some("sydney"),
        "australia" => Some("canberra"),
        "canada" if hit(&vancouver) => Some("vancouver"),
        "canada" => Some("ottawa"),
        "china" if hit(&shanghai) => Some("shanghai"),
        "china" if hit(&hong_kong) => Some("hong kong"),
        "china" => Some("beijing"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn posts() -> Vec<EmbassyPost> {
        vec![
            post("United States", "Washington D.C.", "Royal Thai Embassy, Washington D.C."),
            post("United States", "New York", "Royal Thai Consulate-General, New York"),
            post("United States", "Los Angeles", "Royal Thai Consulate-General, Los Angeles"),
            post("United States", "Chicago", "Royal Thai Consulate-General, Chicago"),
            post("Australia", "Canberra", "Royal Thai Embassy, Canberra"),
            post("Australia", "Sydney", "Royal Thai Consulate-General, Sydney"),
            post("China", "Beijing", "Royal Thai Embassy, Beijing"),
            post("China", "Hong Kong", "Royal Thai Consulate-General, Hong Kong"),
            post("Germany", "Berlin", "Royal Thai Embassy, Berlin"),
        ]
    }

    fn post(country: &str, city: &str, name: &str) -> EmbassyPost {
        EmbassyPost { country: country.to_string(), city: city.to_string(), name: name.to_string() }
    }

    #[test]
    fn us_city_picks_the_regional_consulate_not_nationality() {
        let posts = posts();
        let matched = match_embassy("USA", Some("Seattle"), &posts).unwrap();
        assert_eq!(matched.city, "Los Angeles");
        let berlin = match_embassy("Germany", None, &posts).unwrap();
        assert_eq!(berlin.city, "Berlin");
    }

    #[test]
    fn unknown_country_does_not_fall_back_to_a_passport_country() {
        assert!(match_embassy("Brazil", Some("Sao Paulo"), &posts()).is_none());
    }
}
