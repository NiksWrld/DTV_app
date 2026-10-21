use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProviderCategory {
    MuayThaiGym,
    CookingSchool,
    Medical,
    VisaAdvisory,
    Coworking,
    Insurance,
    Relocation,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VerificationStatus {
    Unreviewed,
    Listed,
    VerifiedDocsSeen,
    Featured,
}
