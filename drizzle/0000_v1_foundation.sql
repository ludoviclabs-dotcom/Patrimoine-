CREATE TYPE tenant_status AS ENUM ('active', 'pilot', 'paused');
CREATE TYPE user_role AS ENUM ('admin', 'conseiller', 'expert', 'client');
CREATE TYPE user_status AS ENUM ('active', 'invited', 'disabled');
CREATE TYPE case_status AS ENUM (
  'draft',
  'simulation_indicative',
  'review_required',
  'validated_by_professional',
  'archived'
);
CREATE TYPE document_kind AS ENUM (
  'tax_notice',
  'loan_contract',
  'company_statutes',
  'life_insurance',
  'real_estate_title',
  'transmission_family_record',
  'identity',
  'other'
);
CREATE TYPE document_status AS ENUM ('missing', 'received', 'to_review', 'validated');
CREATE TYPE review_decision AS ENUM ('pending', 'approved', 'changes_requested', 'rejected');
CREATE TYPE audit_action AS ENUM (
  'case.created',
  'document.received',
  'simulation.run',
  'review.requested',
  'review.decided',
  'data.export.requested',
  'data.deletion.requested',
  'source.checked'
);

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  slug varchar(96) NOT NULL UNIQUE,
  status tenant_status NOT NULL DEFAULT 'pilot',
  data_region varchar(16) NOT NULL DEFAULT 'eu',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name varchar(160) NOT NULL,
  email varchar(320) NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  name varchar(180) NOT NULL,
  risk_level varchar(24) NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  name varchar(180) NOT NULL,
  profile text NOT NULL,
  members jsonb NOT NULL,
  children integer NOT NULL DEFAULT 0,
  fiscal_residence varchar(120) NOT NULL,
  professional_context text NOT NULL,
  objectives jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE client_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  household_id uuid NOT NULL REFERENCES households(id),
  title varchar(220) NOT NULL,
  status case_status NOT NULL DEFAULT 'draft',
  assigned_expert_user_id uuid REFERENCES users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  household_id uuid NOT NULL REFERENCES households(id),
  label varchar(180) NOT NULL,
  category varchar(48) NOT NULL,
  value numeric(14, 2) NOT NULL,
  ifi_kind varchar(48),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  household_id uuid NOT NULL REFERENCES households(id),
  label varchar(180) NOT NULL,
  value numeric(14, 2) NOT NULL,
  linked_category varchar(48) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  case_id uuid NOT NULL REFERENCES client_cases(id),
  kind document_kind NOT NULL,
  label varchar(220) NOT NULL,
  status document_status NOT NULL DEFAULT 'missing',
  storage_provider varchar(64) NOT NULL DEFAULT 'demo-placeholder',
  blob_path text,
  required boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence_sources (
  id varchar(120) PRIMARY KEY,
  title text NOT NULL,
  authority varchar(64) NOT NULL,
  url text NOT NULL,
  checked_at timestamptz NOT NULL,
  legal_scope varchar(80) NOT NULL,
  reliability varchar(32) NOT NULL,
  status varchar(32) NOT NULL
);

CREATE TABLE rule_versions (
  id varchar(120) PRIMARY KEY,
  rule_set varchar(80) NOT NULL,
  version varchar(64) NOT NULL,
  title text NOT NULL,
  effective_from timestamptz NOT NULL,
  status varchar(32) NOT NULL,
  evidence_source_ids jsonb NOT NULL
);

CREATE TABLE simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  case_id uuid NOT NULL REFERENCES client_cases(id),
  household_id uuid NOT NULL REFERENCES households(id),
  scenario varchar(80) NOT NULL,
  status varchar(32) NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE calculation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id uuid NOT NULL REFERENCES simulation_runs(id),
  step_order integer NOT NULL,
  label text NOT NULL,
  input_value text NOT NULL,
  formula text NOT NULL,
  output_value text NOT NULL,
  rule_version_id varchar(120) NOT NULL REFERENCES rule_versions(id),
  evidence_source_id varchar(120) NOT NULL REFERENCES evidence_sources(id),
  confidence_status varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE professional_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  case_id uuid NOT NULL REFERENCES client_cases(id),
  reviewer_user_id uuid NOT NULL REFERENCES users(id),
  decision review_decision NOT NULL DEFAULT 'pending',
  summary text NOT NULL,
  required_actions jsonb NOT NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  action audit_action NOT NULL,
  entity_type varchar(48) NOT NULL,
  entity_id varchar(120) NOT NULL,
  summary text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  purpose varchar(64) NOT NULL,
  status varchar(32) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dpia_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  title varchar(220) NOT NULL,
  risk_level varchar(24) NOT NULL,
  status varchar(32) NOT NULL,
  mitigations jsonb NOT NULL,
  last_reviewed_at timestamptz NOT NULL
);

CREATE INDEX users_tenant_idx ON users(tenant_id);
CREATE INDEX clients_tenant_idx ON clients(tenant_id);
CREATE INDEX households_tenant_idx ON households(tenant_id);
CREATE INDEX cases_tenant_idx ON client_cases(tenant_id);
CREATE INDEX assets_household_idx ON assets(household_id);
CREATE INDEX liabilities_household_idx ON liabilities(household_id);
CREATE INDEX documents_tenant_idx ON documents(tenant_id);
CREATE INDEX simulation_runs_case_idx ON simulation_runs(case_id);
CREATE INDEX calculation_steps_run_idx ON calculation_steps(simulation_run_id);
CREATE INDEX audit_tenant_created_idx ON audit_logs(tenant_id, created_at);
