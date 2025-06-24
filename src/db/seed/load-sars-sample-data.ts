import { getDb } from '@/lib/db/client'
import { hsCodesEnhanced, legalNotes, sectionChapterMapping } from '@/db/schema'
import { SARSTariffParser } from '@/db/parsers/sars-tariff-parser'
import { nanoid } from 'nanoid'
import { sql } from 'drizzle-orm'

// Sample SARS data based on the tariff book structure
const SAMPLE_CHAPTERS = [
  { code: '01', description: 'Live animals', sectionCode: 'S1' },
  { code: '02', description: 'Meat and edible meat offal', sectionCode: 'S1' },
  { code: '03', description: 'Fish and crustaceans, molluscs and other aquatic invertebrates', sectionCode: 'S1' },
  { code: '04', description: 'Dairy produce; birds\' eggs; natural honey; edible products of animal origin, not elsewhere specified or included', sectionCode: 'S1' },
  { code: '84', description: 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof', sectionCode: 'S16' },
  { code: '85', description: 'Electrical machinery and equipment and parts thereof; sound recorders and reproducers, television image and sound recorders and reproducers, and parts and accessories of such articles', sectionCode: 'S16' }
]

const SAMPLE_HEADINGS = [
  { code: '0101', description: 'Live horses, asses, mules and hinnies', parentCode: '01' },
  { code: '0102', description: 'Live bovine animals', parentCode: '01' },
  { code: '8471', description: 'Automatic data-processing machines and units thereof; magnetic or optical readers, machines for transcribing data onto data media in coded form and machines for processing such data, not elsewhere specified or included', parentCode: '84' },
  { code: '8517', description: 'Telephone sets, including telephones for cellular networks or for other wireless networks; other apparatus for the transmission or reception of voice, images or other data', parentCode: '85' }
]

const SAMPLE_SUBHEADINGS = [
  { code: '010121', description: 'Pure-bred breeding animals', parentCode: '0101' },
  { code: '010129', description: 'Other', parentCode: '0101' },
  { code: '847130', description: 'Portable automatic data-processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display', parentCode: '8471' },
  { code: '851712', description: 'Telephones for cellular networks or for other wireless networks', parentCode: '8517' }
]

const SAMPLE_TARIFF_ITEMS = [
  { code: '01012100', description: 'Pure-bred breeding horses', parentCode: '010121', tariffRate: 0, unit: 'u' },
  { code: '01012900', description: 'Horses, other than pure-bred breeding animals', parentCode: '010129', tariffRate: 0, unit: 'u' },
  { code: '84713000', description: 'Portable automatic data-processing machines, weighing not more than 10 kg', parentCode: '847130', tariffRate: 0, unit: 'u' },
  { code: '85171200', description: 'Telephones for cellular networks or for other wireless networks', parentCode: '851712', tariffRate: 0, unit: 'u' }
]

const SAMPLE_LEGAL_NOTES = [
  {
    hsCode: 'S1',
    noteType: 'scope',
    noteNumber: 'Section I Note 1',
    noteText: 'Any reference in this Section to a particular genus or species of an animal, except where the context otherwise requires, includes a reference to the young of that genus or species.',
    source: 'SARS'
  },
  {
    hsCode: '01',
    noteType: 'exclusion',
    noteNumber: 'Chapter 1 Note 1',
    noteText: 'This Chapter covers all live animals except:\n(a) Fish and crustaceans, molluscs and other aquatic invertebrates, of heading 03.01, 03.06, 03.07 or 03.08;\n(b) Cultures of micro-organisms and other products of heading 30.02; and\n(c) Animals of heading 95.08.',
    source: 'SARS'
  },
  {
    hsCode: '84',
    noteType: 'definition',
    noteNumber: 'Chapter 84 Note 5',
    noteText: 'For the purposes of heading 84.71, the expression "automatic data-processing machines" means machines capable of:\n(a) Storing the processing program or programs and at least the data immediately necessary for the execution of the program;\n(b) Being freely programmed in accordance with the requirements of the user;\n(c) Performing arithmetical computations specified by the user; and\n(d) Executing, without human intervention, a processing program which requires them to modify their execution, by logical decision during the processing run.',
    source: 'SARS'
  }
]

export async function loadSARSSampleData() {
  console.log('Loading SARS sample data...')
  
  const db = getDb()
  const parser = new SARSTariffParser()
  
  try {
    // Start transaction
    await db.transaction(async (tx) => {
      // Load chapters
      console.log('Loading chapters...')
      for (const chapter of SAMPLE_CHAPTERS) {
        await tx.insert(hsCodesEnhanced).values({
          id: `hs_${chapter.code}`,
          code: chapter.code,
          code2Digit: chapter.code,
          description: chapter.description,
          level: 'chapter',
          sectionCode: chapter.sectionCode
        }).onConflictDoNothing()
        
        // Create section-chapter mapping
        await tx.insert(sectionChapterMapping).values({
          sectionCode: chapter.sectionCode,
          chapterCode: chapter.code,
          fromChapter: parseInt(chapter.code),
          toChapter: parseInt(chapter.code)
        }).onConflictDoNothing()
      }
      
      // Load headings
      console.log('Loading headings...')
      for (const heading of SAMPLE_HEADINGS) {
        await tx.insert(hsCodesEnhanced).values({
          id: `hs_${heading.code}`,
          code: heading.code,
          code2Digit: heading.code.substring(0, 2),
          code4Digit: heading.code,
          description: heading.description,
          level: 'heading',
          parentCode: heading.parentCode,
          sectionCode: SAMPLE_CHAPTERS.find(c => c.code === heading.parentCode)?.sectionCode
        }).onConflictDoNothing()
      }
      
      // Load subheadings
      console.log('Loading subheadings...')
      for (const subheading of SAMPLE_SUBHEADINGS) {
        await tx.insert(hsCodesEnhanced).values({
          id: `hs_${subheading.code}`,
          code: subheading.code,
          code2Digit: subheading.code.substring(0, 2),
          code4Digit: subheading.code.substring(0, 4),
          code6Digit: subheading.code,
          description: subheading.description,
          level: 'subheading',
          parentCode: subheading.parentCode,
          sectionCode: SAMPLE_CHAPTERS.find(c => c.code === subheading.code.substring(0, 2))?.sectionCode
        }).onConflictDoNothing()
      }
      
      // Load tariff items with check digits
      console.log('Loading tariff items...')
      for (const item of SAMPLE_TARIFF_ITEMS) {
        const checkDigit = parser.calculateCheckDigit(item.code)
        
        await tx.insert(hsCodesEnhanced).values({
          id: `hs_${item.code}`,
          code: item.code,
          code2Digit: item.code.substring(0, 2),
          code4Digit: item.code.substring(0, 4),
          code6Digit: item.code.substring(0, 6),
          code8Digit: item.code,
          checkDigit: checkDigit,
          description: item.description,
          level: 'tariff',
          parentCode: item.parentCode,
          sectionCode: SAMPLE_CHAPTERS.find(c => c.code === item.code.substring(0, 2))?.sectionCode,
          tariffRate: item.tariffRate,
          unitOfMeasure: item.unit
        }).onConflictDoNothing()
      }
      
      // Load legal notes
      console.log('Loading legal notes...')
      for (const note of SAMPLE_LEGAL_NOTES) {
        await tx.insert(legalNotes).values({
          id: `note_${nanoid()}`,
          source: note.source,
          hsCode: note.hsCode,
          noteType: note.noteType,
          noteNumber: note.noteNumber,
          noteText: note.noteText,
          legalReference: `SARS Tariff Book 2025 - ${note.noteNumber}`,
          effectiveDate: new Date('2025-05-09'),
          priority: note.noteType === 'exclusion' ? 90 : 50,
          bindingCountries: JSON.stringify(['ZA'])
        }).onConflictDoNothing()
      }
      
      console.log('Sample data loaded successfully!')
    })
    
    // Verify data
    const counts = await db.all(sql`
      SELECT 
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'chapter') as chapters,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'heading') as headings,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'subheading') as subheadings,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'tariff') as tariff_items,
        (SELECT COUNT(*) FROM legal_notes) as legal_notes,
        (SELECT COUNT(*) FROM section_chapter_mapping) as mappings
    `)
    
    console.log('\nData verification:')
    console.log(counts[0])
    
    // Test check digit validation
    console.log('\nCheck digit validation test:')
    for (const item of SAMPLE_TARIFF_ITEMS) {
      const checkDigit = parser.calculateCheckDigit(item.code)
      console.log(`${item.code} -> Check digit: ${checkDigit}`)
    }
    
    return true
  } catch (error) {
    console.error('Error loading SARS sample data:', error)
    return false
  }
}

// Run if called directly
if (require.main === module) {
  loadSARSSampleData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}