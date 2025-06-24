-- SARS-compliant schema migration - Part 2: Indexes

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