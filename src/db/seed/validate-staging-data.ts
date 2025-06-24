import { getDb } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

interface ValidationResult {
  totalCodes: number
  validCodes: number
  invalidCodes: any[]
  totalNotes: number
  validNotes: number
  invalidNotes: any[]
  errors: ValidationError[]
}

interface ValidationError {
  tableName: string
  recordIdentifier: string
  errorType: string
  errorMessage: string
  severity: 'error' | 'warning' | 'info'
}

export async function validateStagingData(): Promise<ValidationResult> {
  const db = getDb()
  const errors: ValidationError[] = []
  
  console.log('Starting staging data validation...')
  
  // Reset validation status
  await db.run(sql`UPDATE staging_hs_codes SET is_valid = 0, validation_errors = NULL`)
  await db.run(sql`UPDATE staging_legal_notes SET is_valid = 0, validation_errors = NULL`)
  await db.run(sql`DELETE FROM staging_validation_errors`)
  
  // Validate HS codes
  await validateHSCodes(db, errors)
  
  // Validate legal notes
  await validateLegalNotes(db, errors)
  
  // Get validation summary
  const codeStats = await db.get(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid
    FROM staging_hs_codes
  `)
  
  const noteStats = await db.get(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid
    FROM staging_legal_notes
  `)
  
  const invalidCodes = await db.all(sql`
    SELECT code, description, validation_errors 
    FROM staging_hs_codes 
    WHERE is_valid = 0 
    LIMIT 10
  `)
  
  const invalidNotes = await db.all(sql`
    SELECT hs_code, note_type, note_number, validation_errors 
    FROM staging_legal_notes 
    WHERE is_valid = 0 
    LIMIT 10
  `)
  
  // Insert errors into validation errors table
  for (const error of errors) {
    await db.run(sql`
      INSERT INTO staging_validation_errors (table_name, record_identifier, error_type, error_message, severity)
      VALUES (${error.tableName}, ${error.recordIdentifier}, ${error.errorType}, ${error.errorMessage}, ${error.severity})
    `)
  }
  
  return {
    totalCodes: (codeStats as any).total || 0,
    validCodes: (codeStats as any).valid || 0,
    invalidCodes,
    totalNotes: (noteStats as any).total || 0,
    validNotes: (noteStats as any).valid || 0,
    invalidNotes,
    errors
  }
}

async function validateHSCodes(db: any, errors: ValidationError[]) {
  console.log('Validating HS codes...')
  
  // 1. Validate code format based on level
  await db.run(sql`
    UPDATE staging_hs_codes 
    SET validation_errors = 'Invalid code format for level'
    WHERE (level = 'chapter' AND (length(code) != 2 OR code != code_2_digit))
       OR (level = 'heading' AND (length(code) != 4 OR code != code_4_digit))
       OR (level = 'subheading' AND (length(code) != 6 OR code != code_6_digit))
       OR (level = 'tariff' AND (length(code) != 8 OR code != code_8_digit))
  `)
  
  // 2. Validate parent references
  await db.run(sql`
    UPDATE staging_hs_codes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid parent reference'
    WHERE parent_code IS NOT NULL 
    AND parent_code NOT IN (SELECT code FROM staging_hs_codes)
  `)
  
  // 3. Validate hierarchy (chapters should not have parents, etc.)
  await db.run(sql`
    UPDATE staging_hs_codes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid hierarchy'
    WHERE (level = 'chapter' AND parent_code IS NOT NULL)
       OR (level = 'heading' AND (parent_code IS NULL OR length(parent_code) != 2))
       OR (level = 'subheading' AND (parent_code IS NULL OR length(parent_code) != 4))
       OR (level = 'tariff' AND (parent_code IS NULL OR length(parent_code) != 6))
  `)
  
  // 4. Validate section codes
  await db.run(sql`
    UPDATE staging_hs_codes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid section code'
    WHERE section_code IS NOT NULL 
    AND section_code NOT IN ('S1','S2','S3','S4','S5','S6','S7','S8','S9','S10',
                             'S11','S12','S13','S14','S15','S16','S17','S18','S19','S20','S21')
  `)
  
  // 5. Validate SARS-specific fields
  await db.run(sql`
    UPDATE staging_hs_codes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Missing SARS fields'
    WHERE level = 'tariff' 
    AND (check_digit IS NULL OR tariff_rate IS NULL OR unit_of_measure IS NULL)
  `)
  
  // 6. Validate check digits for SARS codes
  const sarsCodesResult = await db.all(sql`
    SELECT code, code_8_digit, check_digit 
    FROM staging_hs_codes 
    WHERE level = 'tariff' AND code_8_digit IS NOT NULL AND check_digit IS NOT NULL
  `)
  
  const sarsCodes = sarsCodesResult as any[]
  
  for (const code of sarsCodes) {
    if (!validateCheckDigit(code.code_8_digit, code.check_digit)) {
      await db.run(sql`
        UPDATE staging_hs_codes 
        SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid check digit'
        WHERE code = ${code.code}
      `)
      
      errors.push({
        tableName: 'staging_hs_codes',
        recordIdentifier: code.code,
        errorType: 'check_digit',
        errorMessage: `Invalid check digit: expected ${calculateCheckDigit(code.code_8_digit)}, got ${code.check_digit}`,
        severity: 'error'
      })
    }
  }
  
  // 7. Check for duplicates
  const duplicatesResult = await db.all(sql`
    SELECT code, COUNT(*) as count 
    FROM staging_hs_codes 
    GROUP BY code 
    HAVING COUNT(*) > 1
  `)
  
  const duplicates = duplicatesResult as any[]
  
  for (const dup of duplicates) {
    await db.run(sql`
      UPDATE staging_hs_codes 
      SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Duplicate code'
      WHERE code = ${dup.code}
    `)
    
    errors.push({
      tableName: 'staging_hs_codes',
      recordIdentifier: dup.code,
      errorType: 'duplicate',
      errorMessage: `Duplicate code found: ${dup.count} occurrences`,
      severity: 'error'
    })
  }
  
  // Mark valid codes
  await db.run(sql`
    UPDATE staging_hs_codes 
    SET is_valid = 1 
    WHERE validation_errors IS NULL
  `)
}

async function validateLegalNotes(db: any, errors: ValidationError[]) {
  console.log('Validating legal notes...')
  
  // 1. Validate required fields
  await db.run(sql`
    UPDATE staging_legal_notes 
    SET validation_errors = 'Missing required fields'
    WHERE source IS NULL 
       OR hs_code IS NULL 
       OR note_type IS NULL 
       OR note_text IS NULL 
       OR legal_reference IS NULL 
       OR effective_date IS NULL
  `)
  
  // 2. Validate source values
  await db.run(sql`
    UPDATE staging_legal_notes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid source'
    WHERE source NOT IN ('WCO', 'SARS', 'BTI', 'Court')
  `)
  
  // 3. Validate note types
  await db.run(sql`
    UPDATE staging_legal_notes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid note type'
    WHERE note_type NOT IN ('exclusion', 'inclusion', 'definition', 'scope', 
                           'classification', 'subheading', 'additional')
  `)
  
  // 4. Validate HS code references
  await db.run(sql`
    UPDATE staging_legal_notes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid HS code reference'
    WHERE hs_code NOT LIKE 'S%' -- Section codes
      AND hs_code NOT IN (SELECT code FROM staging_hs_codes WHERE is_valid = 1)
  `)
  
  // 5. Validate JSON fields
  const notesWithJsonResult = await db.all(sql`
    SELECT hs_code, note_number, binding_countries, examples 
    FROM staging_legal_notes 
    WHERE binding_countries IS NOT NULL OR examples IS NOT NULL
  `)
  
  const notesWithJson = notesWithJsonResult as any[]
  
  for (const note of notesWithJson) {
    try {
      if (note.binding_countries) {
        JSON.parse(note.binding_countries)
      }
      if (note.examples) {
        JSON.parse(note.examples)
      }
    } catch (e) {
      await db.run(sql`
        UPDATE staging_legal_notes 
        SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid JSON format'
        WHERE hs_code = ${note.hs_code} AND note_number = ${note.note_number}
      `)
      
      errors.push({
        tableName: 'staging_legal_notes',
        recordIdentifier: `${note.hs_code} - ${note.note_number}`,
        errorType: 'json_format',
        errorMessage: 'Invalid JSON in binding_countries or examples field',
        severity: 'error'
      })
    }
  }
  
  // 6. Validate date logic
  await db.run(sql`
    UPDATE staging_legal_notes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid date range'
    WHERE expiry_date IS NOT NULL AND expiry_date <= effective_date
  `)
  
  // 7. Validate priority
  await db.run(sql`
    UPDATE staging_legal_notes 
    SET validation_errors = COALESCE(validation_errors || '; ', '') || 'Invalid priority'
    WHERE priority IS NOT NULL AND (priority < 0 OR priority > 100)
  `)
  
  // Mark valid notes
  await db.run(sql`
    UPDATE staging_legal_notes 
    SET is_valid = 1 
    WHERE validation_errors IS NULL
  `)
}

function calculateCheckDigit(code8: string): string {
  let sum = 0
  for (let i = 0; i < 8; i++) {
    sum += parseInt(code8[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return String((10 - (sum % 10)) % 10)
}

function validateCheckDigit(code8: string, checkDigit: string): boolean {
  return calculateCheckDigit(code8) === checkDigit
}

// Function to load validated data from staging to production
export async function loadValidatedData() {
  const db = getDb()
  
  console.log('Loading validated data from staging tables...')
  
  // Begin transaction
  await db.transaction(async (tx) => {
    // Load HS codes
    const validCodesCount = await tx.run(sql`
      INSERT INTO hs_codes_enhanced (
        id, code, code_2_digit, code_4_digit, code_6_digit, code_8_digit,
        check_digit, description, level, parent_code, section_code,
        tariff_rate, unit_of_measure, statistical_unit
      )
      SELECT 
        'hs_' || code as id,
        code, code_2_digit, code_4_digit, code_6_digit, code_8_digit,
        check_digit, description, level, parent_code, section_code,
        tariff_rate, unit_of_measure, statistical_unit
      FROM staging_hs_codes
      WHERE is_valid = 1
    `)
    
    console.log(`Loaded ${validCodesCount.changes} HS codes`)
    
    // Load legal notes
    const validNotesCount = await tx.run(sql`
      INSERT INTO legal_notes (
        id, source, hs_code, note_type, note_number, note_text,
        legal_reference, effective_date, expiry_date, priority,
        binding_countries, examples
      )
      SELECT 
        'note_' || substr(hex(randomblob(8)), 1, 16) as id,
        source, hs_code, note_type, note_number, note_text,
        legal_reference, effective_date, expiry_date, priority,
        binding_countries, examples
      FROM staging_legal_notes
      WHERE is_valid = 1
    `)
    
    console.log(`Loaded ${validNotesCount.changes} legal notes`)
  })
  
  console.log('Data loading completed successfully')
}