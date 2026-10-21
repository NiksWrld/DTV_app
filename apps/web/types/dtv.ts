// DTV domain types

export type DtvPath = 'workcation' | 'soft_power' | 'dependent';

export type EmploymentType = 'employed' | 'freelancer' | 'remote_worker' | 'other';

export type SoftPowerInterest =
  | 'muay_thai'
  | 'cooking'
  | 'medical'
  | 'seminar';

export type ChecklistItemStatus =
  | 'missing'
  | 'uploaded'
  | 'under_review'
  | 'accepted'
  | 'risky';

export type DocumentStatus = 'uploaded' | 'under_review' | 'accepted' | 'risky';

export type ProviderCategory =
  | 'muay_thai_gym'
  | 'cooking_school'
  | 'medical'
  | 'visa_advisory'
  | 'coworking'
  | 'insurance'
  | 'relocation';

export type ListingType = 'dtv_program' | 'useful_link';

export type VerificationStatus =
  | 'unreviewed'
  | 'listed'
  | 'verified_docs_seen'
  | 'featured';

export type GuideContentType =
  | 'guide'
  | 'faq'
  | 'embassy_note'
  | 'provider_explainer'
  | 'common_mistake'
  | 'checklist_explainer';

export type ReadinessStatus = 'incomplete' | 'needs_review' | 'ready';

export interface ApplicantProfile {
  id: string;
  nationality: string;
  current_country: string;
  current_city?: string;
  intended_path: DtvPath;
  has_dependents: boolean;
  preferred_embassy_id?: string;
  intended_stay_duration?: string;
  soft_power_interest?: SoftPowerInterest;
  employment_type?: EmploymentType;
}

export interface Embassy {
  id: string;
  country: string;
  city: string;
  name: string;
  website_url?: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  template_id?: string;
  title: string;
  description: string;
  required: boolean;
  status: ChecklistItemStatus;
  display_order: number;
  accepted_document_types?: string[];
  evidence_examples?: string[];
  freshness_window_days?: number;
  min_balance_amount?: number;
  min_validity_days?: number;
}

export interface Document {
  id: string;
  checklist_item_id?: string;
  filename: string;
  file_type: string;
  file_size?: number;
  document_status: DocumentStatus;
  user_notes?: string;
  expiry_date?: string;
  version: number;
  created_at: string;
}

export interface PricingTier {
  months: number;
  price: number;
}

export interface Pricing {
  currency: string;
  tiers: PricingTier[];
  note?: string;
}

export interface Provider {
  id: string;
  name: string;
  category: ProviderCategory;
  cities_served: string[];
  dtv_path_relevance: DtvPath[];
  description: string;
  documents_they_issue: string[];
  supports_dtv: boolean;
  verification_status: VerificationStatus;
  external_url?: string;
  affiliate_type?: string;
  pricing?: Pricing;
  image_url?: string;
  location?: string;
  listing_type: ListingType;
  dtv_certified: boolean;
}

export interface PlanItem {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_category: ProviderCategory;
  provider_location?: string;
  provider_image_url?: string;
  provider_pricing?: Pricing;
  start_month: number;
  duration_months: number;
  notes?: string;
}

export interface Guide {
  id: string;
  content_type: GuideContentType;
  title: string;
  slug: string;
  body: string;
  tags: string[];
  related_paths: DtvPath[];
}

export type ComplianceTaskType = 'tm30' | '90_day_notice' | 'stamp_renewal' | 'custom';

export interface VisaEntry {
  id: string;
  user_id: string;
  entry_date: string;       // 'YYYY-MM-DD'
  stamp_expires: string;    // 'YYYY-MM-DD'
  port_of_entry?: string;
  notes?: string;
  is_current: boolean;
}

export interface ComplianceTask {
  id: string;
  user_id: string;
  type: ComplianceTaskType;
  title: string;
  due_date: string;         // 'YYYY-MM-DD'
  completed_at?: string;    // ISO timestamp
  document_id?: string;
  notes?: string;
}

export interface ComplianceOverview {
  entry: VisaEntry | null;
  tasks: ComplianceTask[];
}

export interface ReadinessReview {
  id: string;
  overall_status: ReadinessStatus;
  missing_items_count: number;
  risky_items_count: number;
  completed_items_count: number;
  total_items_count: number;
  generated_at: string;
}
