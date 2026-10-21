use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DocumentType {
    Passport,
    Photograph,
    BankStatement,
    EmploymentContract,
    EmployerCertificate,
    FreelancerPortfolio,
    RemoteWorkEvidence,
    ActivityConfirmation,
    RelationshipProof,
    Insurance,
    Other(String),
}
