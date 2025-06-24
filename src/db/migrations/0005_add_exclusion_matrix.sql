-- Add exclusion matrix and cross-references tables

-- Exclusion matrix table
CREATE TABLE IF NOT EXISTS exclusion_matrix (
  id TEXT PRIMARY KEY,
  from_hs_code TEXT NOT NULL,
  to_hs_code TEXT NOT NULL,
  exclusion_type TEXT NOT NULL,
  note_reference TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for exclusion matrix
CREATE INDEX IF NOT EXISTS idx_exclusion_from_code ON exclusion_matrix(from_hs_code);
CREATE INDEX IF NOT EXISTS idx_exclusion_to_code ON exclusion_matrix(to_hs_code);

-- Cross-references table  
CREATE TABLE IF NOT EXISTS cross_references (
  id TEXT PRIMARY KEY,
  from_hs_code TEXT NOT NULL,
  to_hs_code TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  note_reference TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for cross-references
CREATE INDEX IF NOT EXISTS idx_cross_ref_from_code ON cross_references(from_hs_code);
CREATE INDEX IF NOT EXISTS idx_cross_ref_to_code ON cross_references(to_hs_code);
CREATE INDEX IF NOT EXISTS idx_cross_ref_type ON cross_references(reference_type);