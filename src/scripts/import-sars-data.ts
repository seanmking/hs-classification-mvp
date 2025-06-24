import { SARSTariffParserV2 } from './parse-sars-tariff-v2'
import { getDb } from '@/lib/db/client'
import { 
  hsCodesEnhanced, 
  legalNotes, 
  hsCodeSections,
  sectionChapterMapping,
  exclusionMatrix,
  crossReferences 
} from '@/db/schema'
import { nanoid } from 'nanoid'
import { sql } from 'drizzle-orm'

interface ExclusionEntry {
  fromCode: string
  toCode: string
  noteReference: string
  exclusionType: 'chapter' | 'section' | 'heading'
}

interface CrossReference {
  fromCode: string
  toCode: string
  referenceType: 'see_also' | 'see' | 'compare'
  noteReference: string
}

async function importSARSData() {
  console.log('🚀 Starting SARS Tariff Book import...')
  console.log('📍 PDF Location: /Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf')
  
  const db = getDb()
  
  try {
    // Step 1: Create backup
    console.log('💾 Creating database backup...')
    await db.run(sql`VACUUM INTO 'database.backup.sars-import.db'`)
    
    // Step 2: Parse PDF
    const parser = new SARSTariffParserV2()
    const { sections, chapters, notes, tariffCodes } = await parser.parsePDF(
      '/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf'
    )
    
    console.log(`\n📊 Parsed Summary:`)
    console.log(`  - ${sections.length} sections`)
    console.log(`  - ${chapters.length} chapters`)
    console.log(`  - ${notes.length} legal notes`)
    console.log(`  - ${tariffCodes.length} tariff codes`)
    
    // Step 3: Clear existing SARS data
    console.log('\n🧹 Clearing existing SARS data...')
    await db.delete(hsCodesEnhanced).where(sql`1=1`)
    await db.delete(legalNotes).where(sql`source = 'SARS'`)
    await db.delete(hsCodeSections).where(sql`1=1`)
    await db.delete(sectionChapterMapping).where(sql`1=1`)
    
    // Step 4: Import sections
    console.log('\n📂 Importing sections...')
    for (const section of sections) {
      await db.insert(hsCodeSections).values({
        code: section.sectionCode,
        romanNumeral: section.romanNumeral,
        description: section.description,
        createdAt: new Date()
      }).onConflictDoNothing()
      
      // Create section-chapter mappings
      if (section.chapterRange.from > 0) {
        await db.insert(sectionChapterMapping).values({
          sectionCode: section.sectionCode,
          chapterCode: '', // Will be updated per chapter
          fromChapter: section.chapterRange.from,
          toChapter: section.chapterRange.to
        }).onConflictDoNothing()
      }
    }
    console.log(`  ✓ Imported ${sections.length} sections`)
    
    // Step 5: Import chapters as HS codes
    console.log('\n📚 Importing chapters...')
    for (const chapter of chapters) {
      await db.insert(hsCodesEnhanced).values({
        id: `hs_${chapter.chapterCode}`,
        code: chapter.chapterCode,
        code2Digit: chapter.chapterCode,
        description: chapter.description,
        level: 'chapter',
        sectionCode: chapter.sectionCode,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }
    console.log(`  ✓ Imported ${chapters.length} chapters`)
    
    // Step 6: Import legal notes
    console.log('\n📋 Importing legal notes...')
    const exclusions: ExclusionEntry[] = []
    const references: CrossReference[] = []
    
    for (const note of notes) {
      await db.insert(legalNotes).values({
        id: `note_${nanoid()}`,
        source: 'SARS',
        hsCode: note.hsCode,
        noteType: note.noteType,
        noteNumber: note.noteNumber,
        noteText: note.noteText,
        legalReference: `SARS Tariff Book - ${note.noteNumber}`,
        effectiveDate: new Date('2025-05-09'),
        bindingCountries: JSON.stringify(['ZA']),
        priority: note.noteType === 'exclusion' ? 90 : 
                 note.noteType === 'inclusion' ? 85 : 80,
        createdAt: new Date()
      }).onConflictDoNothing()
      
      // Extract exclusions and cross-references
      if (note.noteType === 'exclusion') {
        const extractedExclusions = extractExclusions(note)
        exclusions.push(...extractedExclusions)
      }
      
      const extractedReferences = extractCrossReferences(note)
      references.push(...extractedReferences)
    }
    console.log(`  ✓ Imported ${notes.length} legal notes`)
    console.log(`  ✓ Found ${exclusions.length} exclusions`)
    console.log(`  ✓ Found ${references.length} cross-references`)
    
    // Step 7: Build exclusion matrix
    if (exclusions.length > 0) {
      console.log('\n🚫 Building exclusion matrix...')
      for (const exclusion of exclusions) {
        await db.insert(exclusionMatrix).values({
          id: `excl_${nanoid()}`,
          fromHsCode: exclusion.fromCode,
          toHsCode: exclusion.toCode,
          exclusionType: exclusion.exclusionType,
          noteReference: exclusion.noteReference,
          createdAt: new Date()
        }).onConflictDoNothing()
      }
    }
    
    // Step 8: Build cross-reference index
    if (references.length > 0) {
      console.log('\n🔗 Building cross-reference index...')
      for (const ref of references) {
        await db.insert(crossReferences).values({
          id: `ref_${nanoid()}`,
          fromHsCode: ref.fromCode,
          toHsCode: ref.toCode,
          referenceType: ref.referenceType,
          noteReference: ref.noteReference,
          createdAt: new Date()
        }).onConflictDoNothing()
      }
    }
    
    // Step 9: Import tariff codes
    console.log('\n🏷️ Importing tariff codes...')
    let importedCodes = 0
    const batchSize = 100
    
    for (let i = 0; i < tariffCodes.length; i += batchSize) {
      const batch = tariffCodes.slice(i, i + batchSize)
      
      for (const code of batch) {
        // Determine level and parent code
        const level = determineLevel(code.code)
        const parentCode = getParentCode(code.code)
        
        // Find section code for this tariff code
        const chapterCode = code.code.substring(0, 2)
        const chapter = chapters.find(c => c.chapterCode === chapterCode)
        
        // Validate check digit for 8-digit codes
        if (code.code.length === 8 && code.cd) {
          const calculatedCd = parser.calculateCheckDigit(code.code)
          if (calculatedCd !== code.cd) {
            console.warn(`  ⚠️ Check digit mismatch for ${code.code}: expected ${calculatedCd}, got ${code.cd}`)
          }
        }
        
        await db.insert(hsCodesEnhanced).values({
          id: `hs_${code.code}`,
          code: code.code,
          code2Digit: code.code.substring(0, 2),
          code4Digit: code.code.substring(0, 4),
          code6Digit: code.code.length >= 6 ? code.code.substring(0, 6) : null,
          code8Digit: code.code.length === 8 ? code.code : null,
          checkDigit: code.cd || null,
          description: code.description,
          level,
          parentCode,
          sectionCode: chapter?.sectionCode || null,
          tariffRate: parseFloat(code.generalRate.replace('%', '')) || null,
          unitOfMeasure: code.unit || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing()
        
        importedCodes++
      }
      
      if (importedCodes % 1000 === 0) {
        console.log(`  ... imported ${importedCodes} codes`)
      }
    }
    console.log(`  ✓ Imported ${importedCodes} tariff codes`)
    
    // Step 10: Verify data integrity
    console.log('\n🔍 Verifying data integrity...')
    const counts = await db.all(sql`
      SELECT 
        (SELECT COUNT(*) FROM hs_code_sections) as sections,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'chapter') as chapters,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'heading') as headings,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'subheading') as subheadings,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'tariff') as tariff_items,
        (SELECT COUNT(*) FROM legal_notes WHERE source = 'SARS') as legal_notes,
        (SELECT COUNT(*) FROM exclusion_matrix) as exclusions,
        (SELECT COUNT(*) FROM cross_references) as cross_refs
    `)
    
    console.log('\n✅ Import Summary:')
    console.log(counts[0])
    
    // Step 11: Test check digit validation
    console.log('\n🧪 Testing check digit validation...')
    const sampleCodes = await db.select()
      .from(hsCodesEnhanced)
      .where(sql`code_8_digit IS NOT NULL AND check_digit IS NOT NULL`)
      .limit(5)
    
    for (const sample of sampleCodes) {
      if (sample.code8Digit && sample.checkDigit) {
        const calculated = parser.calculateCheckDigit(sample.code8Digit)
        console.log(`  ${sample.code8Digit} -> CD: ${sample.checkDigit} (calculated: ${calculated}) ${calculated === sample.checkDigit ? '✓' : '✗'}`)
      }
    }
    
    console.log('\n🎉 SARS data import complete!')
    
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    console.log('🔄 Restoring from backup...')
    // Restore from backup if something went wrong
    throw error
  }
}

function determineLevel(code: string): string {
  const cleanCode = code.replace(/\./g, '')
  
  if (cleanCode.length === 2) return 'chapter'
  if (cleanCode.length === 4) return 'heading'
  if (cleanCode.length === 6) return 'subheading'
  if (cleanCode.length === 8) return 'tariff'
  
  return 'unknown'
}

function getParentCode(code: string): string | null {
  const cleanCode = code.replace(/\./g, '')
  
  if (cleanCode.length === 2) return null // chapters have no parent
  if (cleanCode.length === 4) return cleanCode.substring(0, 2) // parent is chapter
  if (cleanCode.length === 6) return cleanCode.substring(0, 4) // parent is heading
  if (cleanCode.length === 8) return cleanCode.substring(0, 6) // parent is subheading
  
  return null
}

function extractExclusions(note: any): ExclusionEntry[] {
  const exclusions: ExclusionEntry[] = []
  const text = note.noteText.toLowerCase()
  
  // Pattern to find chapter references
  const chapterPattern = /chapter[s]?\s+(\d+)/gi
  const matches = text.matchAll(chapterPattern)
  
  for (const match of matches) {
    if (text.includes('does not cover') || text.includes('does not include') || 
        text.includes('except') || text.includes('excluding')) {
      exclusions.push({
        fromCode: note.chapterCode || note.sectionCode || note.hsCode,
        toCode: match[1].padStart(2, '0'),
        noteReference: note.noteNumber,
        exclusionType: note.chapterCode ? 'chapter' : 'section'
      })
    }
  }
  
  return exclusions
}

function extractCrossReferences(note: any): CrossReference[] {
  const references: CrossReference[] = []
  const text = note.noteText
  
  // Patterns for cross-references
  const seeAlsoPattern = /see also (?:heading|chapter)[s]?\s+(\d+\.?\d*)/gi
  const seePattern = /see (?:heading|chapter)[s]?\s+(\d+\.?\d*)/gi
  
  const seeAlsoMatches = text.matchAll(seeAlsoPattern)
  for (const match of seeAlsoMatches) {
    references.push({
      fromCode: note.hsCode,
      toCode: match[1].replace('.', ''),
      referenceType: 'see_also',
      noteReference: note.noteNumber
    })
  }
  
  const seeMatches = text.matchAll(seePattern)
  for (const match of seeMatches) {
    references.push({
      fromCode: note.hsCode,
      toCode: match[1].replace('.', ''),
      referenceType: 'see',
      noteReference: note.noteNumber
    })
  }
  
  return references
}

// Run if called directly
if (require.main === module) {
  importSARSData()
    .then(() => {
      console.log('✅ Import process completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Import process failed:', error)
      process.exit(1)
    })
}