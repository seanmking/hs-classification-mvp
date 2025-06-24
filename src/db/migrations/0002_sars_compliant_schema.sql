-- SARS-compliant schema migration
-- This migration creates a properly normalized database schema for SARS tariff classification

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
CREATE TABLE IF NOT EXISTS hs_code_sections (
  code TEXT PRIMARY KEY, -- S1, S2, ... S21
  roman_numeral TEXT NOT NULL, -- I, II, ... XXI
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced HS codes table with SARS support
CREATE TABLE IF NOT EXISTS hs_codes_enhanced (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Full code (2, 4, 6, or 8 digits)
  code_2_digit TEXT, -- Chapter
  code_4_digit TEXT, -- Heading
  code_6_digit TEXT, -- Subheading (WCO)
  code_8_digit TEXT, -- SARS extension
  check_digit TEXT, -- SARS validation
  description TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('chapter', 'heading', 'subheading', 'tariff')),
  parent_code TEXT,
  section_code TEXT,
  tariff_rate REAL, -- SARS specific
  unit_of_measure TEXT, -- SARS specific (kg, l, u, etc.)
  statistical_unit TEXT, -- SARS specific
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal notes as first-class entities
CREATE TABLE IF NOT EXISTS legal_notes (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('WCO', 'SARS', 'BTI', 'Court')),
  hs_code TEXT NOT NULL, -- Can be section (S1), chapter (01), or any level
  note_type TEXT NOT NULL CHECK (note_type IN ('exclusion', 'inclusion', 'definition', 'scope', 'classification', 'subheading', 'additional')),
  note_number TEXT, -- For SARS: "Chapter 84 Note 1"
  note_text TEXT NOT NULL,
  legal_reference TEXT NOT NULL,
  effective_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  priority INTEGER NOT NULL DEFAULT 50, -- Higher number = higher priority
  binding_countries TEXT NOT NULL DEFAULT '["*"]', -- JSON array
  examples TEXT, -- JSON array of examples
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SARS-specific additional notes
CREATE TABLE IF NOT EXISTS sars_additional_notes (
  id TEXT PRIMARY KEY,
  chapter_code TEXT NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('general', 'exclusion', 'inclusion', 'tariff', 'rebate')),
  note_number INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  conditions TEXT, -- JSON for complex conditions
  effective_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Section-Chapter mapping
CREATE TABLE IF NOT EXISTS section_chapter_mapping (
  section_code TEXT NOT NULL,
  chapter_code TEXT NOT NULL,
  from_chapter INTEGER NOT NULL,
  to_chapter INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (section_code, chapter_code)
);

-- Track which legal notes were applied during classification
CREATE TABLE IF NOT EXISTS classification_legal_notes (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL,
  legal_note_id TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
  application_reason TEXT,
  excluded_reason TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (classification_id) REFERENCES classifications(id)
);

-- SARS tariff determinations (binding rulings)
CREATE TABLE IF NOT EXISTS sars_determinations (
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
CREATE TABLE IF NOT EXISTS legal_note_versions (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hs_codes_level ON hs_codes_enhanced(level);
CREATE INDEX IF NOT EXISTS idx_hs_codes_section ON hs_codes_enhanced(section_code);
CREATE INDEX IF NOT EXISTS idx_hs_codes_parent ON hs_codes_enhanced(parent_code);
CREATE INDEX IF NOT EXISTS idx_hs_codes_6digit ON hs_codes_enhanced(code_6_digit);
CREATE INDEX IF NOT EXISTS idx_hs_codes_8digit ON hs_codes_enhanced(code_8_digit);

CREATE INDEX IF NOT EXISTS idx_legal_notes_hs_code ON legal_notes(hs_code);
CREATE INDEX IF NOT EXISTS idx_legal_notes_type ON legal_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_legal_notes_source ON legal_notes(source);
CREATE INDEX IF NOT EXISTS idx_legal_notes_dates ON legal_notes(effective_date, expiry_date);

CREATE INDEX IF NOT EXISTS idx_classification_notes ON classification_legal_notes(classification_id);
CREATE INDEX IF NOT EXISTS idx_sars_determinations_hs ON sars_determinations(hs_code);

-- Insert HS sections
INSERT INTO hs_code_sections (code, roman_numeral, description) VALUES
  ('S1', 'I', 'Live Animals; Animal Products'),
  ('S2', 'II', 'Vegetable Products'),
  ('S3', 'III', 'Animal or Vegetable Fats and Oils and Their Cleavage Products; Prepared Edible Fats; Animal or Vegetable Waxes'),
  ('S4', 'IV', 'Prepared Foodstuffs; Beverages, Spirits and Vinegar; Tobacco and Manufactured Tobacco Substitutes'),
  ('S5', 'V', 'Mineral Products'),
  ('S6', 'VI', 'Products of the Chemical or Allied Industries'),
  ('S7', 'VII', 'Plastics and Articles Thereof; Rubber and Articles Thereof'),
  ('S8', 'VIII', 'Raw Hides and Skins, Leather, Furskins and Articles Thereof; Saddlery and Harness; Travel Goods, Handbags and Similar Containers; Articles of Animal Gut (Other Than Silk-Worm Gut)'),
  ('S9', 'IX', 'Wood and Articles of Wood; Wood Charcoal; Cork and Articles of Cork; Manufactures of Straw, of Esparto or of Other Plaiting Materials; Basketware and Wickerwork'),
  ('S10', 'X', 'Pulp of Wood or of Other Fibrous Cellulosic Material; Recovered (Waste and Scrap) Paper or Paperboard; Paper and Paperboard and Articles Thereof'),
  ('S11', 'XI', 'Textiles and Textile Articles'),
  ('S12', 'XII', 'Footwear, Headgear, Umbrellas, Sun Umbrellas, Walking-Sticks, Seat-Sticks, Whips, Riding-Crops and Parts Thereof; Prepared Feathers and Articles Made Therewith; Artificial Flowers; Articles of Human Hair'),
  ('S13', 'XIII', 'Articles of Stone, Plaster, Cement, Asbestos, Mica or Similar Materials; Ceramic Products; Glass and Glassware'),
  ('S14', 'XIV', 'Natural or Cultured Pearls, Precious or Semi-Precious Stones, Precious Metals, Metals Clad with Precious Metal and Articles Thereof; Imitation Jewellery; Coin'),
  ('S15', 'XV', 'Base Metals and Articles of Base Metal'),
  ('S16', 'XVI', 'Machinery and Mechanical Appliances; Electrical Equipment; Parts Thereof; Sound Recorders and Reproducers, Television Image and Sound Recorders and Reproducers, and Parts and Accessories of Such Articles'),
  ('S17', 'XVII', 'Vehicles, Aircraft, Vessels and Associated Transport Equipment'),
  ('S18', 'XVIII', 'Optical, Photographic, Cinematographic, Measuring, Checking, Precision, Medical or Surgical Instruments and Apparatus; Clocks and Watches; Musical Instruments; Parts and Accessories Thereof'),
  ('S19', 'XIX', 'Arms and Ammunition; Parts and Accessories Thereof'),
  ('S20', 'XX', 'Miscellaneous Manufactured Articles'),
  ('S21', 'XXI', 'Works of Art, Collectors'' Pieces and Antiques');