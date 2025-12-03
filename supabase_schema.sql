-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Visits Table
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_number TEXT,
    facility_name TEXT,
    department TEXT,
    provider_name TEXT,
    chief_complaint TEXT,
    visit_notes TEXT,
    source_type TEXT,
    source_document_id UUID,
    confidence_score NUMERIC,
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Symptoms Table
CREATE TABLE IF NOT EXISTS symptoms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    symptom_text TEXT,
    confidence_score NUMERIC,
    severity TEXT,
    duration TEXT,
    source TEXT,
    raw_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Medications Table
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    medication_name TEXT,
    date_prescribed TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT,
    raw_text TEXT,
    cleaned_text TEXT,
    processing_method TEXT,
    processing_time_ms NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    module_id TEXT,
    file_name TEXT,
    status TEXT,
    elapsed_ms NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LLM Tasks Table
CREATE TABLE IF NOT EXISTS llm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    model TEXT,
    status TEXT,
    output TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Differentials Table (Optional, for storing generated DDX)
CREATE TABLE IF NOT EXISTS differentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    condition_name TEXT,
    icd10_code TEXT,
    confidence_score NUMERIC,
    rationale TEXT,
    suggested_investigations TEXT[], -- Array of strings
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - Optional but recommended
-- For now, we allow public access to keep it simple for the demo
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON visits FOR ALL USING (true);

ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON symptoms FOR ALL USING (true);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON medications FOR ALL USING (true);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON documents FOR ALL USING (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON audit_logs FOR ALL USING (true);

ALTER TABLE llm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON llm_tasks FOR ALL USING (true);

ALTER TABLE differentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON differentials FOR ALL USING (true);
