import fs from 'fs'
import pdf from 'pdf-parse'

interface ParsedSection {
  sectionCode: string
  romanNumeral: string
  description: string
  chapterRange: { from: number; to: number }
}

interface ParsedChapter {
  chapterCode: string
  description: string
  sectionCode: string
}

interface ParsedNote {
  hsCode: string
  noteType: 'exclusion' | 'inclusion' | 'definition' | 'scope' | 'subheading'
  noteNumber: string
  noteText: string
  chapterCode?: string
  sectionCode?: string
}

interface ParsedTariffCode {
  code: string
  cd: string // check digit
  description: string
  unit: string
  generalRate: string
  euRate?: string
  eftaRate?: string
  sadcRate?: string
  mercosurRate?: string
  afcftaRate?: string
}

interface ParseResult {
  sections: ParsedSection[]
  chapters: ParsedChapter[]
  notes: ParsedNote[]
  tariffCodes: ParsedTariffCode[]
}

export class SARSTariffParserEnhanced {
  private sections: ParsedSection[] = []
  private chapters: ParsedChapter[] = []
  private notes: ParsedNote[] = []
  private tariffCodes: ParsedTariffCode[] = []
  private currentSection: ParsedSection | null = null
  private currentChapter: ParsedChapter | null = null

  async parsePDF(filePath: string): Promise<ParseResult> {
    console.log(`📄 Enhanced Parsing of SARS Tariff Book from: ${filePath}`)
    
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)
    
    console.log(`📖 Total pages: ${data.numpages}`)
    console.log(`📝 Starting enhanced text extraction...`)
    
    // Split text into lines for processing
    const lines = data.text.split('\n').map(line => line.trim()).filter(line => line)
    
    // Multi-pass parsing for better accuracy
    console.log('\n🔄 Pass 1: Extracting structure...')
    this.extractStructure(lines)
    
    console.log('\n🔄 Pass 2: Extracting notes...')
    this.extractAllNotes(lines)
    
    console.log('\n🔄 Pass 3: Extracting tariff codes...')
    this.extractAllTariffCodes(lines)
    
    console.log(`\n📊 Enhanced Parsing Summary:`)
    console.log(`  - ${this.sections.length} sections`)
    console.log(`  - ${this.chapters.length} chapters`)
    console.log(`  - ${this.notes.length} legal notes`)
    console.log(`  - ${this.tariffCodes.length} tariff codes`)
    
    return {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes
    }
  }

  private extractStructure(lines: string[]) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for section
      if (this.isSectionHeader(line)) {
        this.parseSection(lines, i)
      }
      
      // Check for chapter
      if (this.isChapterHeader(line)) {
        this.parseChapter(lines, i)
      }
    }
  }

  private extractAllNotes(lines: string[]) {
    let inNotesSection = false
    let currentNoteContext: { type: 'section' | 'chapter', code: string } | null = null
    let currentNote: ParsedNote | null = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const prevLine = i > 0 ? lines[i-1] : ''
      
      // Check for NOTES: or NOTE: header
      if (/^NOTES?:\s*$/i.test(line)) {
        inNotesSection = true
        
        // Determine context by looking backwards
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          if (this.isChapterHeader(lines[j])) {
            const chapterMatch = lines[j].match(/CHAPTER\s+(\d+)/)
            if (chapterMatch) {
              currentNoteContext = { 
                type: 'chapter', 
                code: chapterMatch[1].padStart(2, '0') 
              }
              break
            }
          } else if (this.isSectionHeader(lines[j])) {
            const sectionMatch = lines[j].match(/SECTION\s+([IVX]+)/)
            if (sectionMatch) {
              currentNoteContext = { 
                type: 'section', 
                code: `S${this.romanToNumber(sectionMatch[1])}` 
              }
              break
            }
          }
        }
        continue
      }
      
      // If we're in a notes section, look for numbered notes
      if (inNotesSection && currentNoteContext) {
        // Check if this starts a new numbered note
        const noteMatch = line.match(/^(\d+)\.\s+(.+)$/)
        if (noteMatch) {
          // Save previous note if exists
          if (currentNote) {
            this.notes.push(currentNote)
          }
          
          const noteNumber = noteMatch[1]
          const noteText = noteMatch[2]
          
          currentNote = {
            hsCode: currentNoteContext.code,
            noteType: this.determineNoteType(noteText),
            noteNumber: `${currentNoteContext.type === 'chapter' ? 'Chapter' : 'Section'} ${currentNoteContext.code} Note ${noteNumber}`,
            noteText: noteText,
            ...(currentNoteContext.type === 'chapter' && { chapterCode: currentNoteContext.code }),
            ...(currentNoteContext.type === 'section' && { sectionCode: currentNoteContext.code })
          }
        } else if (currentNote && line.length > 2) {
          // Continue building current note
          // Check if we've hit a new section/chapter
          if (!this.isSectionHeader(line) && !this.isChapterHeader(line) && 
              !this.isTariffTableStart(line)) {
            currentNote.noteText += ' ' + line
          } else {
            // End of notes section
            this.notes.push(currentNote)
            currentNote = null
            inNotesSection = false
            currentNoteContext = null
          }
        }
      }
      
      // Check for end of notes section
      if (inNotesSection && (this.isTariffTableStart(line) || this.isChapterHeader(line))) {
        if (currentNote) {
          this.notes.push(currentNote)
          currentNote = null
        }
        inNotesSection = false
        currentNoteContext = null
      }
    }
    
    // Don't forget the last note
    if (currentNote) {
      this.notes.push(currentNote)
    }
  }

  private extractAllTariffCodes(lines: string[]) {
    let inTariffTable = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if we're entering a tariff table
      if (this.isTariffTableStart(line)) {
        inTariffTable = true
        continue
      }
      
      // Check if we're leaving a tariff table
      if (inTariffTable && (this.isChapterHeader(line) || this.isSectionHeader(line))) {
        inTariffTable = false
        continue
      }
      
      // Parse tariff codes
      if (inTariffTable || this.looksLikeTariffCode(line)) {
        this.parseTariffLine(line)
      }
    }
  }

  private isTariffTableStart(line: string): boolean {
    return line.includes('Heading /') || 
           line.includes('Statistical') ||
           line.includes('Rate of Duty') ||
           line.includes('Subheading')
  }

  private looksLikeTariffCode(line: string): boolean {
    // Match patterns that look like tariff codes
    return /^\d{2}\.\d{2}/.test(line) || // Heading (01.01)
           /^\d{4}\.\d{2}/.test(line) || // Subheading (0101.21)
           /^\d{4}\.\d{2}\.\d{2}/.test(line) // Full tariff (0101.21.00)
  }

  private parseTariffLine(line: string) {
    // Remove extra spaces and normalize
    const normalizedLine = line.replace(/\s+/g, ' ').trim()
    
    // Pattern 1: Full tariff item with check digit
    // Example: "0101.21.00 1 Pure-bred breeding animals u free free free free free free"
    const fullTariffMatch = normalizedLine.match(
      /^(\d{4}\.\d{2}\.\d{2})\s+(\d)\s+(-\s*-\s*)?(.+?)\s+(u|kg|l|m²|m³|2u|ct|GVM|ml|g|cm³|pa|dz|GIL|\d+[a-z]+)\s+(free|Free|\d+%?|\d+c\/[a-z]+)(.*)$/
    )
    
    if (fullTariffMatch) {
      const code = fullTariffMatch[1].replace(/\./g, '')
      const cd = fullTariffMatch[2]
      const description = this.cleanDescription(fullTariffMatch[4])
      const unit = fullTariffMatch[5]
      const generalRate = fullTariffMatch[6].toLowerCase()
      const otherRatesStr = fullTariffMatch[7] || ''
      
      // Parse other rates
      const otherRates = otherRatesStr.trim().split(/\s+/).filter(r => r)
      
      this.tariffCodes.push({
        code,
        cd,
        description,
        unit,
        generalRate,
        euRate: otherRates[0] || generalRate,
        eftaRate: otherRates[1] || generalRate,
        sadcRate: otherRates[2] || generalRate,
        mercosurRate: otherRates[3] || generalRate,
        afcftaRate: otherRates[4] || generalRate
      })
      return
    }
    
    // Pattern 2: Heading (4-digit)
    // Example: "01.01 Live horses, asses, mules and hinnies:"
    const headingMatch = normalizedLine.match(/^(\d{2}\.\d{2})\s+(.+?)(:|\s*$)/)
    if (headingMatch && !normalizedLine.includes('CD')) {
      const code = headingMatch[1].replace('.', '')
      const description = this.cleanDescription(headingMatch[2])
      
      // Only add if it's a valid heading description
      if (description.length > 10 && !this.isTableHeader(description)) {
        this.tariffCodes.push({
          code,
          cd: '',
          description,
          unit: '',
          generalRate: ''
        })
      }
      return
    }
    
    // Pattern 3: Subheading (6-digit) 
    // Example: "0101.2 - Horses:"
    const subheadingMatch = normalizedLine.match(/^(\d{4}\.\d{1,2})\s+(-\s*)?(.+?)(:|\s*$)/)
    if (subheadingMatch) {
      let code = subheadingMatch[1].replace('.', '')
      // Pad to 6 digits if needed
      if (code.length === 5) code += '0'
      
      const description = this.cleanDescription(subheadingMatch[3])
      
      if (description.length > 5 && !this.isTableHeader(description)) {
        this.tariffCodes.push({
          code,
          cd: '',
          description,
          unit: '',
          generalRate: ''
        })
      }
    }
  }

  private isSectionHeader(line: string): boolean {
    return line.startsWith('SECTION ') && 
           /SECTION\s+[IVX]+\s*$/.test(line)
  }

  private isChapterHeader(line: string): boolean {
    return line.startsWith('CHAPTER ') && 
           /CHAPTER\s+\d+\s*$/.test(line)
  }

  private isTableHeader(text: string): boolean {
    const headers = ['heading', 'subheading', 'statistical', 'rate', 'duty', 'general', 'eu']
    return headers.some(h => text.toLowerCase().includes(h))
  }

  private parseSection(lines: string[], startIndex: number) {
    const sectionLine = lines[startIndex]
    const match = sectionLine.match(/SECTION\s+([IVX]+)\s*$/)
    
    if (match) {
      const romanNumeral = match[1]
      
      // Look for description on next line
      let description = ''
      if (startIndex + 1 < lines.length) {
        description = lines[startIndex + 1]
        
        // Sometimes description continues on multiple lines
        let j = startIndex + 2
        while (j < lines.length && !this.isChapterHeader(lines[j]) && !lines[j].includes('NOTE')) {
          if (lines[j].length > 2 && !lines[j].includes('Date:')) {
            description += ' ' + lines[j]
          }
          j++
        }
      }
      
      const sectionCode = `S${this.romanToNumber(romanNumeral)}`
      
      this.currentSection = {
        sectionCode,
        romanNumeral,
        description: this.cleanDescription(description),
        chapterRange: { from: 0, to: 0 }
      }
      
      this.sections.push(this.currentSection)
      console.log(`  ✓ Section ${romanNumeral}: ${description.substring(0, 50)}...`)
    }
  }

  private parseChapter(lines: string[], startIndex: number) {
    const chapterLine = lines[startIndex]
    const match = chapterLine.match(/CHAPTER\s+(\d+)\s*$/)
    
    if (match) {
      const chapterCode = match[1].padStart(2, '0')
      
      // Skip chapter 77 (reserved)
      if (chapterCode === '77') return
      
      // Look for description on next line
      let description = ''
      if (startIndex + 1 < lines.length) {
        description = lines[startIndex + 1]
        
        // Sometimes description continues on multiple lines
        let j = startIndex + 2
        while (j < lines.length && !lines[j].includes('NOTE') && !this.isTariffTableStart(lines[j])) {
          if (lines[j].length > 2 && !lines[j].includes('Date:') && !lines[j].includes('SCHEDULE')) {
            description += ' ' + lines[j]
          }
          j++
        }
      }
      
      this.currentChapter = {
        chapterCode,
        description: this.cleanDescription(description),
        sectionCode: this.currentSection?.sectionCode || 'S0'
      }
      
      this.chapters.push(this.currentChapter)
      
      // Update section chapter range
      if (this.currentSection) {
        const chapterNum = parseInt(chapterCode)
        if (this.currentSection.chapterRange.from === 0) {
          this.currentSection.chapterRange.from = chapterNum
        }
        this.currentSection.chapterRange.to = chapterNum
      }
      
      console.log(`  ✓ Chapter ${chapterCode}: ${description.substring(0, 50)}...`)
    }
  }

  private romanToNumber(roman: string): number {
    const romanNumerals: { [key: string]: number } = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100
    }
    
    let result = 0
    for (let i = 0; i < roman.length; i++) {
      const current = romanNumerals[roman[i]]
      const next = romanNumerals[roman[i + 1]]
      
      if (next && current < next) {
        result -= current
      } else {
        result += current
      }
    }
    
    return result
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/\s+/g, ' ')
      .replace(/["""]/g, '"')
      .replace(/[''']/g, "'")
      .replace(/\s*-\s*$/g, '')
      .replace(/^\s*-+\s*/g, '')
      .replace(/Date:\s*\d{4}-\d{2}-\d{2}/g, '')
      .replace(/SCHEDULE\s+\d+.*/g, '')
      .replace(/Customs.*Tariff/g, '')
      .trim()
  }

  private determineNoteType(text: string): ParsedNote['noteType'] {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('does not cover') || lowerText.includes('does not include') || 
        lowerText.includes('excluding') || lowerText.includes('except')) {
      return 'exclusion'
    }
    
    if (lowerText.includes('includes') || lowerText.includes('covers') || 
        lowerText.includes('comprising')) {
      return 'inclusion'
    }
    
    if (lowerText.includes('means') || lowerText.includes('expression') || 
        lowerText.includes('defined as')) {
      return 'definition'
    }
    
    if (lowerText.includes('subheading')) {
      return 'subheading'
    }
    
    return 'scope'
  }

  // Calculate check digit using modulo 10
  calculateCheckDigit(code8: string): string {
    if (code8.length !== 8) {
      throw new Error(`Code must be 8 digits, got ${code8.length}`)
    }
    
    let sum = 0
    for (let i = 0; i < 8; i++) {
      sum += parseInt(code8[i]) * (i % 2 === 0 ? 1 : 3)
    }
    
    return String((10 - (sum % 10)) % 10)
  }
}