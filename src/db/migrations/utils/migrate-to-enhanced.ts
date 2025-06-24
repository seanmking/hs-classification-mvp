import { getDb } from '@/lib/db/client'
import { hsCodes, hsCodesEnhanced, legalNotes, sectionChapterMapping } from '@/db/schema'
import { nanoid } from 'nanoid'
import { sql } from 'drizzle-orm'

// Function to migrate existing hs_codes to hs_codes_enhanced
export async function migrateHSCodes() {
  console.log('Migrating HS codes to enhanced structure...')
  
  const db = getDb()
  
  // First, check if old hs_codes table has data
  const oldCodes = await db.select().from(hsCodes).limit(1)
  
  if (oldCodes.length === 0) {
    console.log('No existing HS codes to migrate')
    return
  }
  
  // Migrate data with enhanced structure
  const existingCodes = await db.select().from(hsCodes).all()
  
  for (const code of existingCodes) {
    // Ensure level is valid (tariff items of 8 digits are called 'tariff' in new schema)
    let validLevel = code.level
    if (code.code.length === 8 && code.level === 'tariff') {
      validLevel = 'tariff'
    } else if (!['chapter', 'heading', 'subheading', 'tariff'].includes(code.level)) {
      console.warn(`Invalid level '${code.level}' for code ${code.code}, skipping...`)
      continue
    }
    
    const enhancedCode = {
      id: `hs_${code.code}`,
      code: code.code,
      code2Digit: code.code.length >= 2 ? code.code.substring(0, 2) : null,
      code4Digit: code.code.length >= 4 ? code.code.substring(0, 4) : null,
      code6Digit: code.code.length >= 6 ? code.code.substring(0, 6) : null,
      code8Digit: code.code.length === 8 ? code.code : null,
      checkDigit: null, // Will be calculated for SARS codes
      description: code.description,
      level: validLevel,
      parentCode: code.parentCode,
      sectionCode: determineSectionCode(code.code), // Determine section based on chapter
      tariffRate: null,
      unitOfMeasure: null,
      statisticalUnit: null,
    }
    
    try {
      await db.insert(hsCodesEnhanced).values(enhancedCode)
    } catch (error: any) {
      console.error(`Failed to migrate code ${code.code}: ${error.message}`)
    }
  }
  
  // Migrate any legal notes from JSON to proper table
  await migrateLegalNotesFromJSON()
}

// Function to determine section code based on chapter
function determineSectionCode(code: string): string | null {
  if (code.length < 2) return null
  
  const chapter = parseInt(code.substring(0, 2))
  
  // Map chapters to sections based on HS structure
  const sectionMapping: { [key: string]: string } = {
    '1-5': 'S1',     // Live Animals; Animal Products
    '6-14': 'S2',    // Vegetable Products
    '15': 'S3',      // Animal or Vegetable Fats and Oils
    '16-24': 'S4',   // Prepared Foodstuffs
    '25-27': 'S5',   // Mineral Products
    '28-38': 'S6',   // Chemical Products
    '39-40': 'S7',   // Plastics and Rubber
    '41-43': 'S8',   // Raw Hides and Skins, Leather
    '44-46': 'S9',   // Wood and Articles of Wood
    '47-49': 'S10',  // Pulp of Wood, Paper
    '50-63': 'S11',  // Textiles
    '64-67': 'S12',  // Footwear, Headgear
    '68-70': 'S13',  // Articles of Stone, Ceramic, Glass
    '71': 'S14',     // Pearls, Precious Stones, Metals
    '72-83': 'S15',  // Base Metals
    '84-85': 'S16',  // Machinery and Electrical Equipment
    '86-89': 'S17',  // Vehicles, Aircraft, Vessels
    '90-92': 'S18',  // Optical, Medical Instruments
    '93': 'S19',     // Arms and Ammunition
    '94-96': 'S20',  // Miscellaneous Manufactured Articles
    '97-98': 'S21',  // Works of Art
  }
  
  for (const [range, section] of Object.entries(sectionMapping)) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number)
      if (chapter >= start && chapter <= end) {
        return section
      }
    } else {
      if (chapter === Number(range)) {
        return section
      }
    }
  }
  
  return null
}

// Function to extract legal notes from JSON columns
async function migrateLegalNotesFromJSON() {
  console.log('Extracting legal notes from JSON columns...')
  
  const db = getDb()
  const codesWithNotes = await db.select()
    .from(hsCodes)
    .where(sql`notes IS NOT NULL OR exclusions IS NOT NULL`)
    .all()
  
  for (const code of codesWithNotes) {
    // Parse notes
    if (code.notes) {
      try {
        const notes = JSON.parse(code.notes)
        if (Array.isArray(notes)) {
          for (const note of notes) {
            await db.insert(legalNotes).values({
              id: `note_${nanoid()}`,
              source: note.source || 'WCO',
              hsCode: code.code,
              noteType: note.type || 'scope',
              noteNumber: note.number || null,
              noteText: note.text || note.content || note.toString(),
              legalReference: note.reference || `${code.code} Note`,
              effectiveDate: new Date('2024-01-01'),
              expiryDate: null,
              priority: note.priority || 50,
              bindingCountries: JSON.stringify(note.bindingCountries || ['*']),
              examples: note.examples ? JSON.stringify(note.examples) : null
            })
          }
        }
      } catch (e) {
        console.error(`Failed to parse notes for ${code.code}:`, e)
      }
    }
    
    // Parse exclusions
    if (code.exclusions) {
      try {
        const exclusions = JSON.parse(code.exclusions)
        if (Array.isArray(exclusions)) {
          for (const exclusion of exclusions) {
            await db.insert(legalNotes).values({
              id: `note_${nanoid()}`,
              source: 'WCO',
              hsCode: code.code,
              noteType: 'exclusion',
              noteNumber: exclusion.number || null,
              noteText: exclusion.text || exclusion.content || exclusion.toString(),
              legalReference: exclusion.reference || `${code.code} Exclusion`,
              effectiveDate: new Date('2024-01-01'),
              expiryDate: null,
              priority: 90, // Exclusions have high priority
              bindingCountries: '["*"]',
              examples: exclusion.examples ? JSON.stringify(exclusion.examples) : null
            })
          }
        }
      } catch (e) {
        console.error(`Failed to parse exclusions for ${code.code}:`, e)
      }
    }
  }
  
  console.log('Legal notes migration completed')
}

// Helper function to create section-chapter mappings
export async function createSectionChapterMappings() {
  const db = getDb()
  
  const mappings = [
    { section: 'S1', chapters: [1, 2, 3, 4, 5] },
    { section: 'S2', chapters: [6, 7, 8, 9, 10, 11, 12, 13, 14] },
    { section: 'S3', chapters: [15] },
    { section: 'S4', chapters: [16, 17, 18, 19, 20, 21, 22, 23, 24] },
    { section: 'S5', chapters: [25, 26, 27] },
    { section: 'S6', chapters: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38] },
    { section: 'S7', chapters: [39, 40] },
    { section: 'S8', chapters: [41, 42, 43] },
    { section: 'S9', chapters: [44, 45, 46] },
    { section: 'S10', chapters: [47, 48, 49] },
    { section: 'S11', chapters: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63] },
    { section: 'S12', chapters: [64, 65, 66, 67] },
    { section: 'S13', chapters: [68, 69, 70] },
    { section: 'S14', chapters: [71] },
    { section: 'S15', chapters: [72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83] },
    { section: 'S16', chapters: [84, 85] },
    { section: 'S17', chapters: [86, 87, 88, 89] },
    { section: 'S18', chapters: [90, 91, 92] },
    { section: 'S19', chapters: [93] },
    { section: 'S20', chapters: [94, 95, 96] },
    { section: 'S21', chapters: [97, 98] },
  ]
  
  for (const mapping of mappings) {
    for (const chapter of mapping.chapters) {
      const chapterCode = chapter.toString().padStart(2, '0')
      
      // Check if chapter exists in enhanced codes
      const chapterExists = await db.select()
        .from(hsCodesEnhanced)
        .where(sql`code = ${chapterCode} AND level = 'chapter'`)
        .limit(1)
      
      if (chapterExists.length > 0) {
        await db.insert(sectionChapterMapping).values({
          sectionCode: mapping.section,
          chapterCode: chapterCode,
          fromChapter: chapter,
          toChapter: chapter,
        }).onConflictDoNothing()
      }
    }
  }
  
  console.log('Section-chapter mappings created')
}