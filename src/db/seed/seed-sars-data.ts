import { getDb } from '@/lib/db/client'
import { SARSTariffParser } from '@/db/parsers/sars-tariff-parser'
import { validateStagingData, loadValidatedData } from './validate-staging-data'
import { sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// This script will be used to load SARS Tariff Book data
// It requires the SARS Tariff Book PDF to be parsed first

export async function seedSARSData() {
  console.log('========================================')
  console.log('SARS Data Seeding Process')
  console.log('========================================')
  
  const db = getDb()
  const parser = new SARSTariffParser()
  
  try {
    // Clear staging tables
    console.log('\n🧹 Clearing staging tables...')
    await db.run(sql`DELETE FROM staging_hs_codes`)
    await db.run(sql`DELETE FROM staging_legal_notes`)
    await db.run(sql`DELETE FROM staging_validation_errors`)
    
    // TODO: Load SARS data from parsed PDF
    console.log('\n📄 Loading SARS data...')
    console.log('⚠️  Note: SARS Tariff Book PDF parsing not yet implemented')
    console.log('   This script is a placeholder for when PDF data is available')
    
    // Example of how data would be loaded:
    await loadExampleSARSData(db, parser)
    
    // Validate staging data
    console.log('\n🔍 Validating staging data...')
    const validation = await validateStagingData()
    
    console.log('\n📊 Validation Results:')
    console.log(`   - Total HS Codes: ${validation.totalCodes}`)
    console.log(`   - Valid HS Codes: ${validation.validCodes}`)
    console.log(`   - Invalid HS Codes: ${validation.totalCodes - validation.validCodes}`)
    console.log(`   - Total Legal Notes: ${validation.totalNotes}`)
    console.log(`   - Valid Legal Notes: ${validation.validNotes}`)
    console.log(`   - Invalid Legal Notes: ${validation.totalNotes - validation.validNotes}`)
    
    if (validation.invalidCodes.length > 0) {
      console.log('\n❌ Sample Invalid Codes:')
      validation.invalidCodes.forEach(code => {
        console.log(`   - ${code.code}: ${code.validation_errors}`)
      })
    }
    
    if (validation.invalidNotes.length > 0) {
      console.log('\n❌ Sample Invalid Notes:')
      validation.invalidNotes.forEach(note => {
        console.log(`   - ${note.hs_code} (${note.note_type}): ${note.validation_errors}`)
      })
    }
    
    // Load validated data if validation passed
    if (validation.validCodes > 0 || validation.validNotes > 0) {
      console.log('\n📥 Loading validated data into production tables...')
      await loadValidatedData()
      console.log('✅ Data loading completed')
    } else {
      console.log('\n⚠️  No valid data to load')
    }
    
  } catch (error) {
    console.error('\n❌ SARS data seeding failed:', error)
    throw error
  }
}

// Example function showing how SARS data would be loaded
async function loadExampleSARSData(db: any, parser: SARSTariffParser) {
  console.log('   Loading example SARS data for demonstration...')
  
  // Example SARS 8-digit codes
  const exampleCodes = [
    {
      code: '01012100',
      description: 'Pure-bred breeding horses',
      level: 'tariff',
      parentCode: '010121',
      sectionCode: 'S1',
      tariffRate: 0,
      unitOfMeasure: 'u'
    },
    {
      code: '01012900',
      description: 'Horses, other than pure-bred breeding animals',
      level: 'tariff',
      parentCode: '010129',
      sectionCode: 'S1',
      tariffRate: 0,
      unitOfMeasure: 'u'
    }
  ]
  
  // Insert example codes into staging
  for (const code of exampleCodes) {
    const checkDigit = parser.calculateCheckDigit(code.code)
    
    await db.run(sql`
      INSERT INTO staging_hs_codes (
        code, code_2_digit, code_4_digit, code_6_digit, code_8_digit,
        check_digit, description, level, parent_code, section_code,
        tariff_rate, unit_of_measure
      ) VALUES (
        ${code.code},
        ${code.code.substring(0, 2)},
        ${code.code.substring(0, 4)},
        ${code.code.substring(0, 6)},
        ${code.code},
        ${checkDigit},
        ${code.description},
        ${code.level},
        ${code.parentCode},
        ${code.sectionCode},
        ${code.tariffRate},
        ${code.unitOfMeasure}
      )
    `)
  }
  
  // Example SARS legal notes
  const exampleNote = parser.parseSectionNote(
    'Any reference in this Section to a particular genus or species of an animal, except where the context otherwise requires, includes a reference to the young of that genus or species.',
    'S1'
  )
  
  await db.run(sql`
    INSERT INTO staging_legal_notes (
      source, hs_code, note_type, note_number, note_text,
      legal_reference, effective_date, priority, binding_countries
    ) VALUES (
      'SARS',
      ${exampleNote.chapterCode},
      ${exampleNote.noteType},
      ${exampleNote.noteNumber},
      ${exampleNote.noteText},
      'SARS Tariff Book 2025',
      '2025-05-09',
      100,
      '["ZA"]'
    )
  `)
  
  console.log('   Example data loaded')
}

// Run if called directly
if (require.main === module) {
  seedSARSData()
    .then(() => {
      console.log('\n✅ SARS data seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ SARS data seeding failed:', error)
      process.exit(1)
    })
}