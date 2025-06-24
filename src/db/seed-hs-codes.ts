import { withTransaction } from '@/lib/db/client'
import { hsCodes, type NewHSCode } from '@/db/schema'
import Papa from 'papaparse'
import { sql } from 'drizzle-orm'

interface HSCodeCSVRow {
  HS2: string
  HS4: string
  HS6: string
  description: string
}

interface SectionCSVRow {
  id: string
  description: string
  from_chapter: string
  to_chapter: string
}

const HARMONIZED_SYSTEM_URL = 'https://raw.githubusercontent.com/datasets/harmonized-system/main/data/harmonized-system.csv'
const SECTIONS_URL = 'https://raw.githubusercontent.com/datasets/harmonized-system/main/data/sections.csv'

// Common legal notes for major chapters
const CHAPTER_LEGAL_NOTES: Record<string, string[]> = {
  '01': [
    'This Chapter covers only live animals',
    'Animals imported for exhibitions, shows, or competitions may have special classification',
    'Endangered species require CITES permits'
  ],
  '02': [
    'Meat and edible meat offal must be fresh, chilled, or frozen',
    'Prepared or preserved meat is classified in Chapter 16',
    'Inedible animal products are generally in Chapter 05'
  ],
  '03': [
    'Fish may be live, fresh, chilled, frozen, dried, salted or in brine',
    'Prepared or preserved fish is classified in Chapter 16',
    'Ornamental fish have specific subheadings'
  ],
  '84': [
    'Machines with multiple functions are classified by principal function',
    'Parts are generally classified with the machines they are designed for',
    'Computers and units thereof are in heading 84.71'
  ],
  '85': [
    'Electrical machinery includes both generators and motors',
    'Electronic integrated circuits are in heading 85.42',
    'Parts are classified according to their suitability for use'
  ]
}

async function fetchCSV(url: string): Promise<any[]> {
  console.log(`Fetching CSV from: ${url}`)
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const csvText = await response.text()
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          console.log(`Parsed ${results.data.length} rows from CSV`)
          resolve(results.data)
        },
        error: (error: Papa.ParseError) => {
          reject(new Error(`CSV parsing error: ${error.message}`))
        }
      })
    })
  } catch (error) {
    console.error(`Failed to fetch CSV from ${url}:`, error)
    throw error
  }
}

function validateHSCodeCSV(data: any[]): data is HSCodeCSVRow[] {
  if (!data || data.length === 0) {
    console.error('CSV data is empty')
    return false
  }
  
  const requiredFields = ['description']
  const hasRequiredFields = requiredFields.every(field => 
    field in data[0]
  )
  
  if (!hasRequiredFields) {
    console.error('CSV missing required fields:', requiredFields)
    return false
  }
  
  // Check if we have at least one HS code field
  const hasHSCode = ['HS2', 'HS4', 'HS6'].some(field => field in data[0])
  if (!hasHSCode) {
    console.error('CSV missing HS code fields (HS2, HS4, or HS6)')
    return false
  }
  
  console.log('CSV validation passed')
  return true
}

function validateSectionCSV(data: any[]): boolean {
  if (!data || data.length === 0) {
    console.error('Section CSV data is empty')
    return false
  }
  
  // Check for actual fields in the CSV
  const actualFields = Object.keys(data[0])
  console.log('Section CSV fields:', actualFields)
  
  // Check if we have section and name fields
  const hasRequiredFields = ['section', 'name'].every(field => 
    actualFields.includes(field)
  )
  
  if (!hasRequiredFields) {
    console.error('Section CSV missing required fields')
    return false
  }
  
  console.log('Section CSV validation passed')
  return true
}


function getParentCode(code: string): string | undefined {
  const len = code.length
  if (len === 2) return undefined // Chapters have no parent
  if (len === 4) return code.substring(0, 2) // Heading parent is chapter
  if (len === 6) return code.substring(0, 4) // Subheading parent is heading
  return code.substring(0, 6) // Tariff parent is subheading
}

function transformHSCodeRow(row: HSCodeCSVRow): NewHSCode[] {
  const codes: NewHSCode[] = []
  
  // Process each HS level present in the row
  if (row.HS2 && row.HS2.trim()) {
    const code = row.HS2.trim()
    codes.push({
      code,
      description: row.description,
      level: 'chapter',
      parentCode: undefined,
      notes: JSON.stringify(CHAPTER_LEGAL_NOTES[code] || []),
      exclusions: JSON.stringify([])
    })
  }
  
  if (row.HS4 && row.HS4.trim()) {
    const code = row.HS4.trim()
    codes.push({
      code,
      description: row.description,
      level: 'heading',
      parentCode: getParentCode(code),
      notes: JSON.stringify([]),
      exclusions: JSON.stringify([])
    })
  }
  
  if (row.HS6 && row.HS6.trim()) {
    const code = row.HS6.trim()
    codes.push({
      code,
      description: row.description,
      level: 'subheading',
      parentCode: getParentCode(code),
      notes: JSON.stringify([]),
      exclusions: JSON.stringify([])
    })
  }
  
  return codes
}

function transformSectionRow(row: any): NewHSCode {
  return {
    code: `S${row.section}`,
    description: row.name,
    level: 'section' as const,
    parentCode: undefined,
    notes: JSON.stringify([]),
    exclusions: JSON.stringify([])
  }
}

async function seedHSCodes(): Promise<void> {
  console.log('Starting HS code seeding process...')
  
  try {
    
    // Start a transaction
    await withTransaction(async (tx) => {
      // Clear existing HS codes
      console.log('Clearing existing HS codes...')
      await tx.delete(hsCodes).execute()
      
      // Fetch and validate section data
      console.log('\n--- Processing Sections ---')
      const sectionData = await fetchCSV(SECTIONS_URL)
      
      if (!validateSectionCSV(sectionData)) {
        throw new Error('Section CSV validation failed')
      }
      
      // Process sections
      const sectionRecords = sectionData.map(transformSectionRow)
      console.log(`Inserting ${sectionRecords.length} sections...`)
      
      for (let i = 0; i < sectionRecords.length; i++) {
        await tx.insert(hsCodes).values(sectionRecords[i])
        
        if ((i + 1) % 10 === 0) {
          console.log(`Progress: ${i + 1}/${sectionRecords.length} sections inserted`)
        }
      }
      
      // Fetch and validate HS code data
      console.log('\n--- Processing HS Codes ---')
      const hsCodeData = await fetchCSV(HARMONIZED_SYSTEM_URL)
      
      if (!validateHSCodeCSV(hsCodeData)) {
        throw new Error('HS code CSV validation failed')
      }
      
      // Process HS codes
      let totalProcessed = 0
      const totalRows = hsCodeData.length
      
      for (let i = 0; i < totalRows; i++) {
        const row = hsCodeData[i]
        const hsCodeRecords = transformHSCodeRow(row)
        
        // Insert each HS code level
        for (const record of hsCodeRecords) {
          await tx.insert(hsCodes).values(record)
          totalProcessed++
        }
        
        // Progress logging every 100 rows
        if ((i + 1) % 100 === 0) {
          console.log(`Progress: ${i + 1}/${totalRows} rows processed (${totalProcessed} codes inserted)`)
        }
      }
      
      console.log(`\n✅ Successfully seeded ${totalProcessed} HS codes and ${sectionRecords.length} sections`)
      
      // Verify the data
      const countResult = await tx.select({ count: sql<number>`count(*)` })
        .from(hsCodes)
        .execute()
      
      console.log(`Total records in database: ${countResult[0].count}`)
    })
    
  } catch (error) {
    console.error('❌ Error seeding HS codes:', error)
    throw error
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedHSCodes()
    .then(() => {
      console.log('✅ HS code seeding completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ HS code seeding failed:', error)
      process.exit(1)
    })
}

export { seedHSCodes }