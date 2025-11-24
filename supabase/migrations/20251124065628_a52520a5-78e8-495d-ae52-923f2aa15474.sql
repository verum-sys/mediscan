-- Create enum types
CREATE TYPE processing_method AS ENUM ('inline', 'batch', 'image');
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE llm_task_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Modules table
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents table (NO PHI - only medical metadata)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  module_id UUID REFERENCES public.modules(id),
  
  -- Medical metadata ONLY (no patient identifiers)
  hospital_name TEXT,
  clinic_name TEXT,
  doctor_name TEXT,
  department TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  prescribed_medicines TEXT,
  dosage TEXT,
  test_name TEXT,
  test_results TEXT,
  sample_collection_date DATE,
  report_generated_date DATE,
  
  -- OCR processing data
  raw_text TEXT,
  cleaned_text TEXT,
  processing_method processing_method,
  processing_time_ms INTEGER,
  status document_status DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id),
  file_name TEXT,
  status document_status,
  error_message TEXT,
  elapsed_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LLM tasks
CREATE TABLE public.llm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  prompt TEXT,
  model TEXT,
  output TEXT,
  status llm_task_status DEFAULT 'pending',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_documents_module ON public.documents(module_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_created ON public.documents(created_at DESC);
CREATE INDEX idx_audit_logs_document ON public.audit_logs(document_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_llm_tasks_document ON public.llm_tasks(document_id);

-- Enable RLS (public access for MVP - no auth required)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_tasks ENABLE ROW LEVEL SECURITY;

-- Public access policies (no authentication required for MVP)
CREATE POLICY "Public read access" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Public write access" ON public.modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.modules FOR UPDATE USING (true);

CREATE POLICY "Public read documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Public write documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update documents" ON public.documents FOR UPDATE USING (true);

CREATE POLICY "Public read audit" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Public write audit" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read llm" ON public.llm_tasks FOR SELECT USING (true);
CREATE POLICY "Public write llm" ON public.llm_tasks FOR INSERT WITH CHECK (true);

-- Seed default modules
INSERT INTO public.modules (name, description, icon) VALUES
  ('document_scanner', 'General medical document scanning', 'FileText'),
  ('opd_ipd_forms', 'Outpatient and inpatient forms', 'ClipboardList'),
  ('lab_reports', 'Laboratory test reports', 'TestTube'),
  ('medicine_stock', 'Medicine inventory parser', 'Pill'),
  ('generic_upload', 'Generic file upload', 'Upload');