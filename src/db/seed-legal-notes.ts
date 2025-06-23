import { withTransaction } from '@/lib/db/client'
import { hsCodes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export interface LegalNote {
  id: string
  source: 'WCO' | 'SARS' | 'BTI' | 'Court'
  hsCode: string
  noteType: 'exclusion' | 'inclusion' | 'definition' | 'scope' | 'classification'
  text: string
  legalReference: string
  effectiveDate: Date
  expiryDate?: Date
  examples: string[]
  bindingForCountries: string[]
  priority: number
}

// Major Section and Chapter Legal Notes
const SECTION_CHAPTER_NOTES: Partial<LegalNote>[] = [
  // Section I - Live Animals and Animal Products
  {
    source: 'WCO',
    hsCode: 'S1',
    noteType: 'scope',
    text: 'This Section covers all live animals except fish and crustaceans, molluscs and other aquatic invertebrates of heading 03.01, 03.06 or 03.07',
    legalReference: 'Section I Note 1',
    examples: ['Mammals', 'Birds', 'Reptiles', 'Insects'],
    bindingForCountries: ['*'],
    priority: 100
  },
  
  // Chapter 1 - Live animals
  {
    source: 'WCO',
    hsCode: '01',
    noteType: 'exclusion',
    text: 'This Chapter does not cover: (a) Fish and crustaceans, molluscs and other aquatic invertebrates, of heading 03.01, 03.06 or 03.07; (b) Cultures of micro-organisms and other products of heading 30.02; (c) Animals forming part of circuses, menageries or other similar travelling animal shows (heading 95.08)',
    legalReference: 'Chapter 1 Note 1',
    examples: ['Live fish are in Chapter 3', 'Circus animals are in Chapter 95'],
    bindingForCountries: ['*'],
    priority: 90
  },
  
  // Chapter 84 - Machinery
  {
    source: 'WCO',
    hsCode: '84',
    noteType: 'exclusion',
    text: 'This Chapter does not cover: (a) Millstones, grindstones or other articles of Chapter 68; (b) Machinery or appliances (for example, pumps) of ceramic material and ceramic parts of machinery or appliances of any material (Chapter 69)',
    legalReference: 'Chapter 84 Note 1',
    examples: ['Ceramic pumps are excluded', 'Stone grinding wheels are in Chapter 68'],
    bindingForCountries: ['*'],
    priority: 90
  },
  {
    source: 'WCO',
    hsCode: '84',
    noteType: 'definition',
    text: 'Subject to Note 2 to this Chapter and Note 3 to Section XVI, a machine or appliance which answers to a description in one or more of the headings 84.01 to 84.24, or heading 84.86 and at the same time to a description in one or more of the headings 84.25 to 84.80 is to be classified under the appropriate heading of the former group and not the latter',
    legalReference: 'Chapter 84 Note 3',
    examples: ['A pump that could be 8413 or 8479 goes to 8413'],
    bindingForCountries: ['*'],
    priority: 85
  },
  
  // Chapter 85 - Electrical machinery
  {
    source: 'WCO',
    hsCode: '85',
    noteType: 'exclusion',
    text: 'This Chapter does not cover: (a) Electrically warmed blankets, bed pads, foot-muffs or the like; electrically warmed clothing, footwear or ear pads or other electrically warmed articles worn on or about the person',
    legalReference: 'Chapter 85 Note 1(a)',
    examples: ['Electric blankets are textile products', 'Heated clothing is classified by material'],
    bindingForCountries: ['*'],
    priority: 90
  },
  
  // Section XVI - Machinery and Electrical
  {
    source: 'WCO',
    hsCode: 'S16',
    noteType: 'classification',
    text: 'Unless the context otherwise requires, composite machines consisting of two or more machines fitted together to form a whole and other machines designed for the purpose of performing two or more complementary or alternative functions are to be classified as if consisting only of that component or as being that machine which performs the principal function',
    legalReference: 'Section XVI Note 3',
    examples: ['Multi-function printer classified by principal function', 'Combined harvester-thresher by main purpose'],
    bindingForCountries: ['*'],
    priority: 95
  },
  
  // Chapter 39 - Plastics
  {
    source: 'WCO',
    hsCode: '39',
    noteType: 'definition',
    text: 'Throughout the Nomenclature the expression "plastics" means those materials of headings 39.01 to 39.14 which are or have been capable, either at the moment of polymerisation or at some subsequent stage, of being formed under external influence',
    legalReference: 'Chapter 39 Note 1',
    examples: ['Thermoplastics', 'Thermosetting plastics', 'Not rubber or cellulose'],
    bindingForCountries: ['*'],
    priority: 90
  },
  
  // Chapter 61 - Knitted apparel
  {
    source: 'WCO',
    hsCode: '61',
    noteType: 'scope',
    text: 'This Chapter applies only to made up knitted or crocheted articles',
    legalReference: 'Chapter 61 Note 1',
    examples: ['Knitted shirts', 'Crocheted dresses', 'Not knitted fabric in the piece'],
    bindingForCountries: ['*'],
    priority: 90
  },
  {
    source: 'WCO',
    hsCode: '61',
    noteType: 'classification',
    text: 'Garments which cannot be identified as either men\'s or boys\' garments or as women\'s or girls\' garments are to be classified in the headings covering women\'s or girls\' garments',
    legalReference: 'Chapter 61 Note 9',
    examples: ['Unisex t-shirts go to women\'s classification'],
    bindingForCountries: ['*'],
    priority: 85
  },
  
  // Chapter 95 - Toys and games
  {
    source: 'WCO',
    hsCode: '95',
    noteType: 'exclusion',
    text: 'This Chapter does not cover: (a) Christmas tree candles (heading 34.06); (b) Fireworks or other pyrotechnic articles of heading 36.04',
    legalReference: 'Chapter 95 Note 1',
    examples: ['Candles are always in Chapter 34', 'Fireworks never in toys chapter'],
    bindingForCountries: ['*'],
    priority: 90
  }
]

// Specific heading notes
const HEADING_NOTES: Partial<LegalNote>[] = [
  // Heading 8471 - Computers
  {
    source: 'WCO',
    hsCode: '8471',
    noteType: 'definition',
    text: 'For the purposes of heading 84.71, the expression "automatic data processing machines" means machines capable of: (1) Storing the processing program or programs and at least the data immediately necessary for the execution of the program; (2) Being freely programmed in accordance with the requirements of the user',
    legalReference: 'Chapter 84 Note 5(A)',
    examples: ['Desktop computers', 'Laptops', 'Servers', 'Not calculators'],
    bindingForCountries: ['*'],
    priority: 80
  },
  
  // Heading 8517 - Telephone sets
  {
    source: 'WCO',
    hsCode: '8517',
    noteType: 'inclusion',
    text: 'Heading 85.17 includes smartphones and other phones for cellular networks',
    legalReference: 'Explanatory Note to 8517',
    examples: ['iPhones', 'Android phones', 'Feature phones'],
    bindingForCountries: ['*'],
    priority: 80
  },
  
  // Heading 9503 - Toys
  {
    source: 'WCO',
    hsCode: '9503',
    noteType: 'scope',
    text: 'This heading includes toys of all kinds whether designed for the amusement of children or adults',
    legalReference: 'Explanatory Note to 9503',
    examples: ['Dolls', 'Model trains', 'Building blocks', 'Video game consoles'],
    bindingForCountries: ['*'],
    priority: 80
  }
]

// Country-specific notes (e.g., SARS for South Africa)
const COUNTRY_SPECIFIC_NOTES: Partial<LegalNote>[] = [
  {
    source: 'SARS',
    hsCode: '2208',
    noteType: 'classification',
    text: 'For South African purposes, traditional African beer (umqombothi) is classified under 2203, not 2208',
    legalReference: 'SARS Practice Note 7',
    examples: ['Umqombothi', 'Sorghum beer'],
    bindingForCountries: ['ZA'],
    priority: 70
  },
  {
    source: 'SARS',
    hsCode: '8703',
    noteType: 'definition',
    text: 'In South Africa, "bakkies" (pickup trucks) with a payload not exceeding 1000kg are classified as motor cars under 8703, not goods vehicles under 8704',
    legalReference: 'SARS Ruling 123',
    examples: ['Toyota Hilux single cab', 'Ford Ranger'],
    bindingForCountries: ['ZA'],
    priority: 70
  }
]

// BTI (Binding Tariff Information) examples
const BTI_NOTES: Partial<LegalNote>[] = [
  {
    source: 'BTI',
    hsCode: '8471',
    noteType: 'classification',
    text: 'Tablet computers with detachable keyboards are classified as portable automatic data processing machines under 8471.30',
    legalReference: 'BTI Reference EU/2019/1234',
    examples: ['Microsoft Surface Pro', 'iPad Pro with keyboard'],
    bindingForCountries: ['EU', 'GB'],
    priority: 75
  },
  {
    source: 'BTI',
    hsCode: '9503',
    noteType: 'exclusion',
    text: 'Fidget spinners are not considered toys and are classified under 9506 as articles for funfair amusements',
    legalReference: 'BTI Reference EU/2017/5678',
    examples: ['Fidget spinners', 'Stress balls'],
    bindingForCountries: ['EU'],
    priority: 75
  }
]

// Court precedent notes
const COURT_PRECEDENT_NOTES: Partial<LegalNote>[] = [
  {
    source: 'Court',
    hsCode: '8509',
    noteType: 'classification',
    text: 'Electric toothbrushes are electromechanical domestic appliances with self-contained motor under 8509, not brushes under 9603',
    legalReference: 'WCO Classification Opinion 8509.80/1',
    examples: ['Oral-B electric toothbrush', 'Philips Sonicare'],
    bindingForCountries: ['*'],
    priority: 85
  }
]

async function seedLegalNotes(): Promise<void> {
  console.log('Starting legal notes seeding process...')
  
  try {
    await withTransaction(async (tx) => {
      let totalInserted = 0
      
      // Combine all notes
      const allNotes: Partial<LegalNote>[] = [
        ...SECTION_CHAPTER_NOTES,
        ...HEADING_NOTES,
        ...COUNTRY_SPECIFIC_NOTES,
        ...BTI_NOTES,
        ...COURT_PRECEDENT_NOTES
      ]
      
      console.log(`Processing ${allNotes.length} legal notes...`)
      
      for (let i = 0; i < allNotes.length; i++) {
        const note = allNotes[i]
        
        // Check if HS code exists
        const [hsCode] = await tx.select()
          .from(hsCodes)
          .where(eq(hsCodes.code, note.hsCode!))
          .limit(1)
          .execute()
        
        if (!hsCode) {
          console.warn(`HS code ${note.hsCode} not found, skipping legal note`)
          continue
        }
        
        // Create complete legal note
        const legalNote: LegalNote = {
          id: `note_${nanoid()}`,
          source: note.source!,
          hsCode: note.hsCode!,
          noteType: note.noteType!,
          text: note.text!,
          legalReference: note.legalReference!,
          effectiveDate: note.effectiveDate || new Date('2022-01-01'),
          expiryDate: note.expiryDate,
          examples: note.examples || [],
          bindingForCountries: note.bindingForCountries || ['*'],
          priority: note.priority || 50
        }
        
        // Update HS code with legal note
        const existingNotes = hsCode.notes ? JSON.parse(hsCode.notes) : []
        const existingExclusions = hsCode.exclusions ? JSON.parse(hsCode.exclusions) : []
        
        if (legalNote.noteType === 'exclusion') {
          existingExclusions.push({
            id: legalNote.id,
            text: legalNote.text,
            reference: legalNote.legalReference,
            examples: legalNote.examples
          })
        } else {
          existingNotes.push({
            id: legalNote.id,
            type: legalNote.noteType,
            text: legalNote.text,
            reference: legalNote.legalReference,
            source: legalNote.source,
            priority: legalNote.priority,
            examples: legalNote.examples,
            bindingCountries: legalNote.bindingForCountries
          })
        }
        
        await tx.update(hsCodes)
          .set({
            notes: JSON.stringify(existingNotes),
            exclusions: JSON.stringify(existingExclusions)
          })
          .where(eq(hsCodes.code, note.hsCode!))
          .execute()
        
        totalInserted++
        
        // Progress logging
        if ((i + 1) % 10 === 0) {
          console.log(`Progress: ${i + 1}/${allNotes.length} notes processed`)
        }
      }
      
      console.log(`\n✅ Successfully seeded ${totalInserted} legal notes`)
    })
    
  } catch (error) {
    console.error('❌ Error seeding legal notes:', error)
    throw error
  }
}

// Additional function to add temporal notes
export async function addTemporalLegalNote(note: Omit<LegalNote, 'id'>): Promise<void> {
  const legalNote: LegalNote = {
    ...note,
    id: `note_${nanoid()}`
  }
  
  await withTransaction(async (tx) => {
    const [hsCode] = await tx.select()
      .from(hsCodes)
      .where(eq(hsCodes.code, note.hsCode))
      .limit(1)
      .execute()
    
    if (!hsCode) {
      throw new Error(`HS code ${note.hsCode} not found`)
    }
    
    const existingNotes = hsCode.notes ? JSON.parse(hsCode.notes) : []
    existingNotes.push({
      id: legalNote.id,
      type: legalNote.noteType,
      text: legalNote.text,
      reference: legalNote.legalReference,
      source: legalNote.source,
      priority: legalNote.priority,
      effectiveDate: legalNote.effectiveDate,
      expiryDate: legalNote.expiryDate,
      bindingCountries: legalNote.bindingForCountries
    })
    
    await tx.update(hsCodes)
      .set({ notes: JSON.stringify(existingNotes) })
      .where(eq(hsCodes.code, note.hsCode))
      .execute()
  })
}

// Function to get active legal notes for a specific date
export async function getActiveLegalNotes(
  hsCode: string, 
  date: Date = new Date(),
  country: string = '*'
): Promise<LegalNote[]> {
  const db = await import('@/lib/db/client').then(m => m.getDb())
  
  const [code] = await db.select()
    .from(hsCodes)
    .where(eq(hsCodes.code, hsCode))
    .limit(1)
    .execute()
  
  if (!code || !code.notes) return []
  
  const allNotes = JSON.parse(code.notes)
  
  return allNotes.filter((note: any) => {
    // Check temporal validity
    const effectiveDate = new Date(note.effectiveDate || '2022-01-01')
    const expiryDate = note.expiryDate ? new Date(note.expiryDate) : null
    
    if (date < effectiveDate) return false
    if (expiryDate && date > expiryDate) return false
    
    // Check country binding
    if (note.bindingCountries) {
      if (!note.bindingCountries.includes('*') && !note.bindingCountries.includes(country)) {
        return false
      }
    }
    
    return true
  })
}

// Run if called directly
if (require.main === module) {
  seedLegalNotes()
    .then(() => {
      console.log('✅ Legal notes seeding completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Legal notes seeding failed:', error)
      process.exit(1)
    })
}

export { seedLegalNotes }