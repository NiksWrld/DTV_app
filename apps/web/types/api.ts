// API response types

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string[]>;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  created_at: string;
}

// Onboarding
export interface OnboardingRequest {
  nationality: string;
  current_country: string;
  current_city?: string;
  intended_path: string;
  has_dependents: boolean;
  preferred_embassy_id?: string;
  intended_stay_duration?: string;
  soft_power_interest?: string;
  employment_type?: string;
}

// Checklist
export interface ChecklistGenerateResponse {
  items: import('./dtv').ChecklistItem[];
  embassy_name?: string;
  generated_at: string;
}

export interface StatusUpdateRequest {
  status: import('./dtv').ChecklistItemStatus;
}
