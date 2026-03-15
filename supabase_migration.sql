-- DiagNXT Supabase Migration
-- Run this in your Supabase project: Dashboard → SQL Editor

-- VISITS
CREATE TABLE IF NOT EXISTS visits (
  id text PRIMARY KEY,
  visit_number text,
  patient_name text,
  facility_name text,
  department text,
  provider_name text,
  chief_complaint text,
  visit_notes text,
  source_type text,
  source_document_id text,
  confidence_score integer,
  criticality text DEFAULT 'Stable',
  criticality_reason text,
  summary text,
  status text DEFAULT 'follow_up',
  needs_follow_up boolean DEFAULT true,
  pincode text DEFAULT 'UNKNOWN',
  area text,
  is_ipd_admission boolean DEFAULT false,
  clinical_analysis jsonb,
  created_at timestamptz DEFAULT now()
);

-- SYMPTOMS
CREATE TABLE IF NOT EXISTS symptoms (
  id text PRIMARY KEY,
  visit_id text REFERENCES visits(id) ON DELETE CASCADE,
  symptom_text text,
  confidence_score integer,
  severity text,
  duration text,
  source text,
  raw_text text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_symptoms_visit_id ON symptoms(visit_id);

-- MEDICATIONS
CREATE TABLE IF NOT EXISTS medications (
  id text PRIMARY KEY,
  visit_id text REFERENCES visits(id) ON DELETE CASCADE,
  medication_name text,
  date_prescribed text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medications_visit_id ON medications(visit_id);

-- DIFFERENTIALS
CREATE TABLE IF NOT EXISTS differentials (
  id text PRIMARY KEY,
  visit_id text REFERENCES visits(id) ON DELETE CASCADE,
  rank integer,
  condition_name text,
  confidence_score integer,
  rationale text,
  suggested_investigations jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_differentials_visit_id ON differentials(visit_id);

-- CLASSIFICATIONS
CREATE TABLE IF NOT EXISTS classifications (
  id text PRIMARY KEY,
  visit_id text REFERENCES visits(id) ON DELETE CASCADE,
  icd_code text,
  icd_description text,
  snomed_code text,
  snomed_description text,
  confidence_score integer DEFAULT 90,
  source text DEFAULT 'ai',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_classifications_visit_id ON classifications(visit_id);

-- SYMPTOM_HISTORY
CREATE TABLE IF NOT EXISTS symptom_history (
  id text PRIMARY KEY,
  visit_id text REFERENCES visits(id) ON DELETE CASCADE,
  symptom_text text,
  severity text DEFAULT 'moderate',
  duration_days integer DEFAULT 0,
  onset_date timestamptz,
  resolved_date timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_symptom_history_visit_id ON symptom_history(visit_id);

-- FEEDBACK
CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY,
  target_type text,
  target_id text,
  rating text,
  comment text DEFAULT '',
  user_id text DEFAULT 'anonymous',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_target_id ON feedback(target_id);

-- DOCUMENTS (flexible JSONB storage)
CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- AUDIT_LOGS (flexible JSONB storage)
CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- LLM_TASKS (flexible JSONB storage)
CREATE TABLE IF NOT EXISTS llm_tasks (
  id text PRIMARY KEY,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Disable RLS (service role bypasses it anyway, but this avoids confusion)
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms DISABLE ROW LEVEL SECURITY;
ALTER TABLE medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE differentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE classifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE llm_tasks DISABLE ROW LEVEL SECURITY;
