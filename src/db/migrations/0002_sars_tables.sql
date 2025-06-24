-- SARS-compliant schema migration - Part 1: Tables only
-- This migration creates tables without indexes or data

-- Drop existing inadequate structures
DROP TABLE IF EXISTS legal_notes;
DROP TABLE IF EXISTS section_chapter_mapping;
DROP TABLE IF EXISTS classification_legal_notes;
DROP TABLE IF EXISTS sars_determinations;
DROP TABLE IF EXISTS sars_additional_notes;
DROP TABLE IF EXISTS legal_note_versions;
DROP TABLE IF EXISTS hs_code_sections;
DROP TABLE IF EXISTS hs_codes_enhanced;

-- Create sections table (21 sections)
CREATE TABLE hs_code_sections (
  code TEXT PRIMARY KEY,
  roman_numeral TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced HS codes table with SARS support
CREATE TABLE hs_codes_enhanced (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  code_2_digit TEXT,
  code_4_digit TEXT,
  code_6_digit TEXT,
  code_8_digit TEXT,
  check_digit TEXT,
  description TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('chapter', 'heading', 'subheading', 'tariff')),
  parent_code TEXT,
  section_code TEXT,
  tariff_rate REAL,
  unit_of_measure TEXT,
  statistical_unit TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal notes as first-class entities
CREATE TABLE legal_notes (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('WCO', 'SARS', 'BTI', 'Court')),
  hs_code TEXT NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('exclusion', 'inclusion', 'definition', 'scope', 'classification', 'subheading', 'additional')),
  note_number TEXT,
  note_text TEXT NOT NULL,
  legal_reference TEXT NOT NULL,
  effective_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  priority INTEGER NOT NULL DEFAULT 50,
  binding_countries TEXT NOT NULL DEFAULT '["*"]',
  examples TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SARS-specific additional notes
CREATE TABLE sars_additional_notes (
  id TEXT PRIMARY KEY,
  chapter_code TEXT NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('general', 'exclusion', 'inclusion', 'tariff', 'rebate')),
  note_number INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  conditions TEXT,
  effective_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Section-Chapter mapping
CREATE TABLE section_chapter_mapping (
  section_code TEXT NOT NULL,
  chapter_code TEXT NOT NULL,
  from_chapter INTEGER NOT NULL,
  to_chapter INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (section_code, chapter_code)
);

-- Track which legal notes were applied during classification
CREATE TABLE classification_legal_notes (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL,
  legal_note_id TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  application_reason TEXT,
  excluded_reason TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (classification_id) REFERENCES classifications(id)
);

-- SARS tariff determinations (binding rulings)
CREATE TABLE sars_determinations (
  id TEXT PRIMARY KEY,
  determination_number TEXT UNIQUE NOT NULL,
  hs_code TEXT NOT NULL,
  product_description TEXT NOT NULL,
  decision TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  effective_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  appeal_status TEXT,
  legal_basis TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Version control for legal notes
CREATE TABLE legal_note_versions (
  id TEXT PRIMARY KEY,
  legal_note_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'expire')),
  change_description TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  previous_text TEXT,
  new_text TEXT
);