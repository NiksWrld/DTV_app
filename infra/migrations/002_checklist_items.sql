-- 002_checklist_items.sql: Checklist templates, overrides, user items, documents

CREATE TABLE checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visa_path TEXT NOT NULL,
    subcategory TEXT,
    title TEXT NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT true,
    recommendation_level TEXT NOT NULL DEFAULT 'required',
    accepted_document_types JSONB,
    freshness_window_days INTEGER,
    min_balance_amount NUMERIC,
    min_validity_days INTEGER,
    evidence_examples JSONB,
    source_url TEXT,
    admin_notes TEXT,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE embassy_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    embassy_id UUID NOT NULL REFERENCES embassies(id) ON DELETE CASCADE,
    checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
    override_type TEXT NOT NULL,
    modified_title TEXT,
    modified_description TEXT,
    modified_required BOOLEAN,
    modified_document_types JSONB,
    notes TEXT,
    UNIQUE(embassy_id, checklist_template_id)
);

CREATE TABLE user_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES checklist_templates(id),
    title TEXT NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'missing',
    embassy_override_applied BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checklist_item_id UUID REFERENCES user_checklist_items(id),
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_key TEXT NOT NULL,
    document_status TEXT NOT NULL DEFAULT 'uploaded',
    user_notes TEXT,
    admin_notes TEXT,
    expiry_date DATE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
