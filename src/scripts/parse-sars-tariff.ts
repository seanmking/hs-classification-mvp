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
  sadc?: string
}

interface ParseResult {
  sections: ParsedSection[]
  chapters: ParsedChapter[]
  notes: ParsedNote[]
  tariffCodes: ParsedTariffCode[]
}

export class SARSTariffParser {
  private sections: ParsedSection[] = []
  private chapters: ParsedChapter[] = []
  private notes: ParsedNote[] = []
  private tariffCodes: ParsedTariffCode[] = []

  async parsePDF(filePath: string): Promise<ParseResult> {
    console.log(`📄 Parsing SARS Tariff Book from: ${filePath}`)
    
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)
    
    console.log(`📖 Total pages: ${data.numpages}`)
    console.log(`📝 Starting text extraction...`)
    
    // Split text into lines for processing
    const lines = data.text.split('\n').map(line => line.trim()).filter(line => line)
    
    // Process the PDF content
    this.extractSections(lines)
    this.extractChapters(lines)
    this.extractLegalNotes(lines)
    this.extractTariffCodes(lines)
    
    return {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes
    }
  }

  private extractSections(lines: string[]) {
    console.log('🗂️ Extracting sections...')
    
    // Pattern for sections: "SECTION I" or "Section I" followed by description
    const sectionPattern = /^(SECTION|Section)\s+([IVX]+)\s*[-–]\s*(.+)$/
    const sectionRangePattern = /\(Chapter[s]?\s+(\d+)\s*[-–]\s*(\d+)\)/
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const sectionMatch = line.match(sectionPattern)
      
      if (sectionMatch) {
        const romanNumeral = sectionMatch[2]
        let description = sectionMatch[3]
        
        // Look for chapter range in description or next lines
        let chapterRange = { from: 0, to: 0 }
        const rangeMatch = description.match(sectionRangePattern)
        
        if (rangeMatch) {
          chapterRange.from = parseInt(rangeMatch[1])
          chapterRange.to = parseInt(rangeMatch[2])
          description = description.replace(sectionRangePattern, '').trim()
        } else {
          // Check next few lines for chapter range
          for (let j = 1; j <= 3 && i + j < lines.length; j++) {
            const nextLine = lines[i + j]
            const nextRangeMatch = nextLine.match(sectionRangePattern)
            if (nextRangeMatch) {
              chapterRange.from = parseInt(nextRangeMatch[1])
              chapterRange.to = parseInt(nextRangeMatch[2])
              break
            }
          }
        }
        
        const sectionCode = `S${this.romanToNumber(romanNumeral)}`
        
        this.sections.push({
          sectionCode,
          romanNumeral,
          description: this.cleanDescription(description),
          chapterRange
        })
        
        console.log(`  ✓ Section ${romanNumeral}: ${description.substring(0, 50)}...`)
      }
    }
    
    console.log(`  📊 Found ${this.sections.length} sections`)
  }

  private extractChapters(lines: string[]) {
    console.log('📚 Extracting chapters...')
    
    // Pattern for chapters: "CHAPTER 84" or "Chapter 84" followed by description
    const chapterPattern = /^(CHAPTER|Chapter)\s+(\d+)\s*[-–]?\s*(.*)$/
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const chapterMatch = line.match(chapterPattern)
      
      if (chapterMatch) {
        const chapterCode = chapterMatch[2].padStart(2, '0')
        let description = chapterMatch[3]
        
        // Skip chapter 77 (reserved)
        if (chapterCode === '77') continue
        
        // If description is empty or too short, check next line
        if (!description || description.length < 10) {
          if (i + 1 < lines.length) {
            description = lines[i + 1]
          }
        }
        
        // Find which section this chapter belongs to
        const chapterNum = parseInt(chapterCode)
        const section = this.sections.find(s => 
          chapterNum >= s.chapterRange.from && chapterNum <= s.chapterRange.to
        )
        
        this.chapters.push({
          chapterCode,
          description: this.cleanDescription(description),
          sectionCode: section?.sectionCode || 'S0'
        })
        
        console.log(`  ✓ Chapter ${chapterCode}: ${description.substring(0, 50)}...`)
      }
    }
    
    console.log(`  📊 Found ${this.chapters.length} chapters`)
  }

  private extractLegalNotes(lines: string[]) {
    console.log('📋 Extracting legal notes...')
    
    // Patterns for different note contexts
    const sectionNotePattern = /^(Section|SECTION)\s+([IVX]+)\s+Note[s]?\s*[:.]?$/i
    const chapterNotePattern = /^(Chapter|CHAPTER)\s+(\d+)\s+Note[s]?\s*[:.]?$/i
    const noteStartPattern = /^(\d+)[.]\s+(.+)$/
    const subheadingNotePattern = /^Subheading\s+Note[s]?\s*[:.]?$/i
    
    let currentContext: { type: 'section' | 'chapter' | 'subheading', code: string } | null = null
    let currentNote: ParsedNote | null = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for section note context
      const sectionMatch = line.match(sectionNotePattern)
      if (sectionMatch) {
        currentContext = { 
          type: 'section', 
          code: `S${this.romanToNumber(sectionMatch[2])}` 
        }
        continue
      }
      
      // Check for chapter note context
      const chapterMatch = line.match(chapterNotePattern)
      if (chapterMatch) {
        currentContext = { 
          type: 'chapter', 
          code: chapterMatch[2].padStart(2, '0') 
        }
        continue
      }
      
      // Check for subheading note context
      if (subheadingNotePattern.test(line)) {
        currentContext = { type: 'subheading', code: 'subheading' }
        continue
      }
      
      // Extract numbered notes
      const noteMatch = line.match(noteStartPattern)
      if (noteMatch && currentContext) {
        // Save previous note if exists
        if (currentNote) {
          this.notes.push(currentNote)
        }
        
        const noteNumber = noteMatch[1]
        const noteText = noteMatch[2]
        const noteType = this.determineNoteType(noteText)
        
        currentNote = {
          hsCode: currentContext.code,
          noteType,
          noteNumber: `${currentContext.type === 'section' ? 'Section' : 'Chapter'} ${currentContext.code} Note ${noteNumber}`,
          noteText: noteText,
          ...(currentContext.type === 'chapter' && { chapterCode: currentContext.code }),
          ...(currentContext.type === 'section' && { sectionCode: currentContext.code })
        }
      } else if (currentNote && !noteMatch && line.length > 0) {
        // Continue building current note text
        currentNote.noteText += ' ' + line
      }
    }
    
    // Don't forget the last note
    if (currentNote) {
      this.notes.push(currentNote)
    }
    
    console.log(`  📊 Found ${this.notes.length} legal notes`)
  }

  private extractTariffCodes(lines: string[]) {
    console.log('🏷️ Extracting tariff codes...')
    
    // Pattern for tariff codes with check digit
    // Format: 0101.21.00 1 Description Unit Rate
    const tariffPattern = /^(\d{4}\.\d{2}\.\d{2})\s+(\d)\s+(.+?)\s+(kg|u|l|m²|m³|2u|ct|GVM|\d+[a-z]+)\s+(Free|\d+%?|\d+c\/[a-z]+)(.*)$/
    const headingPattern = /^(\d{4})\s+(.+)$/
    const subheadingPattern = /^(\d{4}\.\d{2})\s+(.+)$/
    
    for (const line of lines) {
      // Try to match full tariff code (8-digit + check digit)
      const tariffMatch = line.match(tariffPattern)
      if (tariffMatch) {
        const code = tariffMatch[1].replace(/\./g, '')
        const cd = tariffMatch[2]
        const description = tariffMatch[3].trim()
        const unit = tariffMatch[4]
        const generalRate = tariffMatch[5]
        
        // Extract additional rates if present
        const additionalRates = tariffMatch[6]?.trim() || ''
        
        this.tariffCodes.push({
          code,
          cd,
          description: this.cleanDescription(description),
          unit,
          generalRate,
          ...(additionalRates.includes('EU:') && { euRate: this.extractRate(additionalRates, 'EU:') }),
          ...(additionalRates.includes('SADC:') && { sadc: this.extractRate(additionalRates, 'SADC:') })
        })
      } else {
        // Try to match heading (4-digit)
        const headingMatch = line.match(headingPattern)
        if (headingMatch && !line.includes('Chapter')) {
          const code = headingMatch[1]
          const description = headingMatch[2].trim()
          
          // Only add if it looks like a valid heading
          if (this.isValidHeading(code, description)) {
            this.tariffCodes.push({
              code,
              cd: '',
              description: this.cleanDescription(description),
              unit: '',
              generalRate: ''
            })
          }
        }
      }
    }
    
    console.log(`  📊 Found ${this.tariffCodes.length} tariff codes`)
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

  private isValidHeading(code: string, description: string): boolean {
    // Check if it's a 4-digit code and has a reasonable description
    return /^\d{4}$/.test(code) && 
           description.length > 10 && 
           !description.includes('page') &&
           !description.includes('continued')
  }

  private extractRate(text: string, prefix: string): string {
    const regex = new RegExp(`${prefix}\\s*([^\\s,]+)`)
    const match = text.match(regex)
    return match ? match[1] : ''
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