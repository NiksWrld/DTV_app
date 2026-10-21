use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DtvPath {
    Workcation,
    SoftPower,
    Dependent,
}

impl DtvPath {
    pub fn as_str(&self) -> &'static str {
        match self {
            DtvPath::Workcation => "workcation",
            DtvPath::SoftPower => "soft_power",
            DtvPath::Dependent => "dependent",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "workcation" => Some(DtvPath::Workcation),
            "soft_power" => Some(DtvPath::SoftPower),
            "dependent" => Some(DtvPath::Dependent),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EmploymentType {
    Employed,
    Freelancer,
    RemoteWorker,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SoftPowerInterest {
    MuayThai,
    Cooking,
    Medical,
    SportTraining,
    Seminar,
    MusicFestival,
}
