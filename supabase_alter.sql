-- Add missing columns to existing visits table
ALTER TABLE visits ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS criticality TEXT DEFAULT 'Stable';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS criticality_reason TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'follow_up';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS needs_follow_up BOOLEAN DEFAULT true;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS pincode TEXT DEFAULT 'UNKNOWN';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS is_ipd_admission BOOLEAN DEFAULT false;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS clinical_analysis JSONB;

-- Add missing columns to existing symptoms table
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS raw_text TEXT;

-- Create tables that didn't exist in the old schema
CREATE TABLE IF NOT EXISTS differentials (
  id text PRIMARY KEY,
  visit_id text,
  rank integer,
  condition_name text,
  confidence_score integer,
  rationale text,
  suggested_investigations jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classifications (
  id text PRIMARY KEY,
  visit_id text,
  icd_code text,
  icd_description text,
  snomed_code text,
  snomed_description text,
  confidence_score integer DEFAULT 90,
  source text DEFAULT 'ai',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS symptom_history (
  id text PRIMARY KEY,
  visit_id text,
  symptom_text text,
  severity text DEFAULT 'moderate',
  duration_days integer DEFAULT 0,
  onset_date timestamptz,
  resolved_date timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY,
  target_type text,
  target_id text,
  rating text,
  comment text DEFAULT '',
  user_id text DEFAULT 'anonymous',
  created_at timestamptz DEFAULT now()
);

-- Alter documents/audit_logs/llm_tasks to add data column if missing
ALTER TABLE documents ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}';
ALTER TABLE llm_tasks ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}';

-- Disable RLS
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms DISABLE ROW LEVEL SECURITY;
ALTER TABLE medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE llm_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE differentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE classifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
