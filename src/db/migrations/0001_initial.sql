-- Initial database schema for HS Classification MVP

-- Classifications table
CREATE TABLE IF NOT EXISTS classifications (
  id TEXT PRIMARY KEY,
  product_description TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_step TEXT NOT NULL DEFAULT 'gri_1',
  final_hs_code TEXT,
  confidence REAL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  metadata TEXT
);

-- Classification steps table
CREATE TABLE IF NOT EXISTS classification_steps (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  data TEXT
);

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  confidence REAL NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  hash TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percentage REAL NOT NULL,
  hs_code TEXT,
  description TEXT,
  determination_method TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  data TEXT NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HS codes reference table
CREATE TABLE IF NOT EXISTS hs_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_code TEXT,
  notes TEXT,
  exclusions TEXT
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS classification_user_id_idx ON classifications(user_id);
CREATE INDEX IF NOT EXISTS classification_status_idx ON classifications(status);
CREATE INDEX IF NOT EXISTS classification_created_at_idx ON classifications(created_at);

CREATE INDEX IF NOT EXISTS step_classification_id_idx ON classification_steps(classification_id);

CREATE INDEX IF NOT EXISTS decision_classification_id_idx ON decisions(classification_id);
CREATE INDEX IF NOT EXISTS decision_step_idx ON decisions(step);

CREATE INDEX IF NOT EXISTS chat_classification_id_idx ON chat_messages(classification_id);

CREATE INDEX IF NOT EXISTS audit_classification_id_idx ON audit_logs(classification_id);
CREATE INDEX IF NOT EXISTS audit_timestamp_idx ON audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS material_classification_id_idx ON materials(classification_id);

CREATE INDEX IF NOT EXISTS form_classification_id_idx ON form_submissions(classification_id);

CREATE INDEX IF NOT EXISTS hs_code_parent_idx ON hs_codes(parent_code);

CREATE INDEX IF NOT EXISTS session_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON sessions(user_id);

-- Insert some sample HS codes for testing
INSERT OR IGNORE INTO hs_codes (code, description, level, parent_code) VALUES
  ('84', 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof', 'chapter', NULL),
  ('8471', 'Automatic data-processing machines and units thereof', 'heading', '84'),
  ('847130', 'Portable automatic data-processing machines, weighing not more than 10 kg', 'subheading', '8471'),
  ('84713000', 'Laptops, notebooks and similar portable computers', 'tariff', '847130'),
  ('85', 'Electrical machinery and equipment and parts thereof', 'chapter', NULL),
  ('8517', 'Telephone sets, including smartphones', 'heading', '85'),
  ('851712', 'Telephones for cellular networks or for other wireless networks', 'subheading', '8517'),
  ('85171200', 'Smartphones', 'tariff', '851712');