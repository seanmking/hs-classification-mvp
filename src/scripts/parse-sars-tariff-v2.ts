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

export class SARSTariffParserV2 {
  private sections: ParsedSection[] = []
  private chapters: ParsedChapter[] = []
  private notes: ParsedNote[] = []
  private tariffCodes: ParsedTariffCode[] = []
  private currentSection: ParsedSection | null = null
  private currentChapter: ParsedChapter | null = null

  async parsePDF(filePath: string): Promise<ParseResult> {
    console.log(`📄 Parsing SARS Tariff Book from: ${filePath}`)
    
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)
    
    console.log(`📖 Total pages: ${data.numpages}`)
    console.log(`📝 Starting text extraction...`)
    
    // Split text into lines for processing
    const lines = data.text.split('\n').map(line => line.trim()).filter(line => line)
    
    // Process line by line
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
      
      // Check for notes
      if (this.isNoteStart(line, lines[i-1])) {
        this.parseNote(lines, i)
      }
      
      // Check for tariff codes
      if (this.isTariffCode(line)) {
        this.parseTariffCode(line)
      }
    }
    
    console.log(`\n📊 Parsing Summary:`)
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

  private isSectionHeader(line: string): boolean {
    return line.startsWith('SECTION ') && 
           /SECTION\s+[IVX]+\s*$/.test(line)
  }

  private isChapterHeader(line: string): boolean {
    return line.startsWith('CHAPTER ') && 
           /CHAPTER\s+\d+\s*$/.test(line)
  }

  private isNoteStart(line: string, prevLine?: string): boolean {
    // Check if previous line contains "NOTE:" or "NOTES:"
    const hasNoteHeader = prevLine && /^NOTES?:\s*$/i.test(prevLine)
    // Check if line starts with number and period
    const isNumberedNote = /^\d+\.\s+/.test(line)
    return hasNoteHeader && isNumberedNote
  }

  private isTariffCode(line: string): boolean {
    // Match patterns like "01.01" or "0101.21" with CD
    return /^\d{2}\.\d{2}/.test(line) || 
           /^\d{4}\.\d{2}\s+\d/.test(line)
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
          if (lines[j].length > 2) {
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
        chapterRange: { from: 0, to: 0 } // Will be updated later
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
        while (j < lines.length && !lines[j].includes('NOTE') && !this.isTariffCode(lines[j])) {
          if (lines[j].length > 2 && !lines[j].includes('Date:')) {
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

  private parseNote(lines: string[], startIndex: number) {
    const line = lines[startIndex]
    const match = line.match(/^(\d+)\.\s+(.+)$/)
    
    if (match) {
      const noteNumber = match[1]
      let noteText = match[2]
      
      // Continue reading note text until we hit another note or section
      let j = startIndex + 1
      while (j < lines.length && 
             !this.isNoteStart(lines[j], lines[j-1]) && 
             !this.isSectionHeader(lines[j]) && 
             !this.isChapterHeader(lines[j]) &&
             !this.isTariffCode(lines[j])) {
        if (lines[j].length > 2 && !lines[j].includes('Date:')) {
          noteText += ' ' + lines[j]
        }
        j++
      }
      
      // Determine context (section or chapter)
      const hsCode = this.currentChapter?.chapterCode || this.currentSection?.sectionCode || 'general'
      const noteType = this.determineNoteType(noteText)
      
      this.notes.push({
        hsCode,
        noteType,
        noteNumber: `${this.currentChapter ? 'Chapter' : 'Section'} ${hsCode} Note ${noteNumber}`,
        noteText: this.cleanDescription(noteText),
        ...(this.currentChapter && { chapterCode: this.currentChapter.chapterCode }),
        ...(this.currentSection && { sectionCode: this.currentSection.sectionCode })
      })
    }
  }

  private parseTariffCode(line: string) {
    // Parse main heading (e.g., "01.01")
    const headingMatch = line.match(/^(\d{2}\.\d{2})\s+(.+)/)
    if (headingMatch) {
      const code = headingMatch[1].replace('.', '')
      const description = headingMatch[2]
      
      // Skip if it's followed by subheadings indicator
      if (!description.includes(':')) {
        this.tariffCodes.push({
          code,
          cd: '',
          description: this.cleanDescription(description),
          unit: '',
          generalRate: ''
        })
      }
      return
    }
    
    // Parse subheading/tariff line (e.g., "0101.21 1 - - Pure-bred...")
    // Format: code CD description unit rates...
    const tariffMatch = line.match(/^(\d{4}\.\d{2})\s+(\d)\s+(.+?)\s+(u|kg|l|m²|m³|2u|ct|GVM|ml|g|\d+[a-z]+)\s+(free|Free|\d+%?|\d+c\/[a-z]+)(.*)$/)
    if (tariffMatch) {
      const code = tariffMatch[1].replace(/\./g, '')
      const cd = tariffMatch[2]
      const description = tariffMatch[3]
      const unit = tariffMatch[4]
      const generalRate = tariffMatch[5]
      const otherRates = tariffMatch[6] || ''
      
      // Parse other rates
      const rates = otherRates.trim().split(/\s+/)
      
      this.tariffCodes.push({
        code,
        cd,
        description: this.cleanDescription(description),
        unit,
        generalRate: generalRate.toLowerCase(),
        euRate: rates[0] || generalRate.toLowerCase(),
        eftaRate: rates[1] || generalRate.toLowerCase(),
        sadcRate: rates[2] || generalRate.toLowerCase(),
        mercosurRate: rates[3] || generalRate.toLowerCase(),
        afcftaRate: rates[4] || generalRate.toLowerCase()
      })
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
      .replace(/\s*-\s*$/g, '') // Remove trailing dashes
      .replace(/^\s*-\s*/g, '') // Remove leading dashes
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