-- Temporary staging tables for data validation before loading into production tables
-- These tables are used to validate SARS data before final import

-- Drop existing staging tables if they exist
DROP TABLE IF EXISTS staging_hs_codes;
DROP TABLE IF EXISTS staging_legal_notes;
DROP TABLE IF EXISTS staging_validation_errors;

-- Staging table for HS codes
CREATE TABLE IF NOT EXISTS staging_hs_codes (
  code TEXT,
  code_2_digit TEXT,
  code_4_digit TEXT,
  code_6_digit TEXT,
  code_8_digit TEXT,
  check_digit TEXT,
  description TEXT,
  level TEXT,
  parent_code TEXT,
  section_code TEXT,
  tariff_rate REAL,
  unit_of_measure TEXT,
  statistical_unit TEXT,
  is_valid INTEGER DEFAULT 0, -- 0 = false, 1 = true
  validation_errors TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staging table for legal notes
CREATE TABLE IF NOT EXISTS staging_legal_notes (
  source TEXT,
  hs_code TEXT,
  note_type TEXT,
  note_number TEXT,
  note_text TEXT,
  legal_reference TEXT,
  effective_date TIMESTAMP,
  expiry_date TIMESTAMP,
  priority INTEGER,
  binding_countries TEXT,
  examples TEXT,
  is_valid INTEGER DEFAULT 0, -- 0 = false, 1 = true
  validation_errors TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track validation errors
CREATE TABLE IF NOT EXISTS staging_validation_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_identifier TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for staging tables
CREATE INDEX idx_staging_hs_codes_code ON staging_hs_codes(code);
CREATE INDEX idx_staging_hs_codes_valid ON staging_hs_codes(is_valid);
CREATE INDEX idx_staging_legal_notes_hs_code ON staging_legal_notes(hs_code);
CREATE INDEX idx_staging_legal_notes_valid ON staging_legal_notes(is_valid);