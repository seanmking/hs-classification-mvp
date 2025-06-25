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
  noteType: 'exclusion' | 'inclusion' | 'definition' | 'scope' | 'subheading' | 'additional'
  noteNumber: string
  noteText: string
  chapterCode?: string
  sectionCode?: string
}

interface ParsedTariffCode {
  code: string
  cd: string
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

export class SARSTariffComprehensiveParser {
  private sections: ParsedSection[] = []
  private chapters: ParsedChapter[] = []
  private notes: ParsedNote[] = []
  private tariffCodes: ParsedTariffCode[] = []
  private currentSection: ParsedSection | null = null
  private currentChapter: ParsedChapter | null = null
  private debugMode = true

  async parsePDF(filePath: string): Promise<ParseResult> {
    console.log(`📄 Comprehensive Parsing of SARS Tariff Book`)
    console.log(`📍 Source: ${filePath}`)
    
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)
    
    console.log(`📖 Total pages: ${data.numpages}`)
    console.log(`📝 Total characters: ${data.text.length}`)
    
    // Save raw text for debugging
    if (this.debugMode) {
      fs.writeFileSync('sars-raw-text.txt', data.text)
      console.log('💾 Saved raw text to sars-raw-text.txt for analysis')
    }
    
    // Split text into lines
    const lines = data.text.split('\n').map(line => line.trim()).filter(line => line)
    
    // Multi-pass parsing with detailed logging
    console.log('\n🔍 Pass 1: Analyzing document structure...')
    this.analyzeDocumentStructure(lines)
    
    console.log('\n🔍 Pass 2: Extracting sections and chapters...')
    this.extractStructure(lines)
    
    console.log('\n🔍 Pass 3: Deep scan for ALL legal notes...')
    this.deepScanForNotes(lines)
    
    console.log('\n🔍 Pass 4: Extracting ALL tariff codes...')
    this.comprehensiveTariffExtraction(lines)
    
    // If still no notes found, try alternative patterns
    if (this.notes.length === 0) {
      console.log('\n🔍 Pass 5: Alternative note extraction patterns...')
      this.alternativeNoteExtraction(lines)
    }
    
    console.log(`\n📊 Comprehensive Parsing Results:`)
    console.log(`  ✅ ${this.sections.length} sections`)
    console.log(`  ✅ ${this.chapters.length} chapters`)
    console.log(`  ${this.notes.length > 0 ? '✅' : '❌'} ${this.notes.length} legal notes`)
    console.log(`  ${this.tariffCodes.length > 0 ? '✅' : '❌'} ${this.tariffCodes.length} tariff codes`)
    
    // Save detailed results for debugging
    if (this.debugMode) {
      this.saveDebugOutput()
    }
    
    return {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes
    }
  }

  private analyzeDocumentStructure(lines: string[]) {
    // Look for patterns in the document
    const patterns = {
      notes: 0,
      tariffCodes: 0,
      sections: 0,
      chapters: 0
    }
    
    for (const line of lines) {
      if (/^NOTES?:/i.test(line)) patterns.notes++
      if (/^\d+\.\s+/.test(line)) patterns.notes++
      if (/^\d{2}\.\d{2}/.test(line)) patterns.tariffCodes++
      if (/^SECTION\s+[IVX]+/i.test(line)) patterns.sections++
      if (/^CHAPTER\s+\d+/i.test(line)) patterns.chapters++
    }
    
    console.log('📊 Document structure analysis:')
    console.log(`  - Lines with "NOTES:": ${patterns.notes}`)
    console.log(`  - Lines starting with number: ${patterns.notes}`)
    console.log(`  - Potential tariff codes: ${patterns.tariffCodes}`)
    console.log(`  - Section markers: ${patterns.sections}`)
    console.log(`  - Chapter markers: ${patterns.chapters}`)
  }

  private extractStructure(lines: string[]) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (this.isSectionHeader(line)) {
        this.parseSection(lines, i)
      }
      
      if (this.isChapterHeader(line)) {
        this.parseChapter(lines, i)
      }
    }
  }

  private deepScanForNotes(lines: string[]) {
    console.log('🔍 Deep scanning for notes with multiple patterns...')
    
    // Pattern 1: Look for NOTES: followed by content
    for (let i = 0; i < lines.length; i++) {
      if (/^NOTES?:\s*$/i.test(lines[i])) {
        console.log(`  Found NOTES marker at line ${i}: "${lines[i]}"`)
        this.extractNotesFromMarker(lines, i)
      }
    }
    
    // Pattern 2: Look for numbered lists that might be notes
    for (let i = 0; i < lines.length; i++) {
      if (/^(\d+)\.\s+[A-Z]/.test(lines[i]) && i > 0) {
        // Check if previous lines contain note context
        const context = this.getContext(lines, i, 5)
        if (context.toLowerCase().includes('note') || 
            context.includes('exclude') || 
            context.includes('include')) {
          console.log(`  Found potential note at line ${i}: "${lines[i].substring(0, 50)}..."`)
          this.extractNumberedNote(lines, i)
        }
      }
    }
    
    // Pattern 3: Look for specific note indicators
    const noteIndicators = [
      'This Chapter covers',
      'This Chapter does not cover',
      'This Section covers',
      'This Section does not cover',
      'For the purposes of',
      'In this Chapter',
      'In this Section',
      'The following are to be classified',
      'excluded from this Chapter',
      'included in this Chapter'
    ]
    
    for (let i = 0; i < lines.length; i++) {
      for (const indicator of noteIndicators) {
        if (lines[i].includes(indicator)) {
          console.log(`  Found note indicator "${indicator}" at line ${i}`)
          this.extractNoteFromIndicator(lines, i, indicator)
        }
      }
    }
  }

  private extractNotesFromMarker(lines: string[], markerIndex: number) {
    // Determine context
    const context = this.getCurrentContext(lines, markerIndex)
    console.log(`    Context: ${context.type} ${context.code}`)
    
    let noteCount = 0
    let i = markerIndex + 1
    
    while (i < lines.length) {
      const line = lines[i]
      
      // Stop if we hit a new section/chapter
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) break
      
      // Stop if we hit a tariff table
      if (this.isTariffTableStart(line)) break
      
      // Check for numbered note
      const noteMatch = line.match(/^(\d+)\.\s+(.+)$/)
      if (noteMatch) {
        const noteNumber = noteMatch[1]
        let noteText = noteMatch[2]
        
        // Collect multi-line note text
        let j = i + 1
        while (j < lines.length && 
               !(/^\d+\.\s+/.test(lines[j])) &&
               !this.isSectionHeader(lines[j]) &&
               !this.isChapterHeader(lines[j]) &&
               !this.isTariffTableStart(lines[j])) {
          if (lines[j].length > 2) {
            noteText += ' ' + lines[j]
          }
          j++
        }
        
        this.notes.push({
          hsCode: context.code,
          noteType: this.determineNoteType(noteText),
          noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
          noteText: this.cleanText(noteText),
          ...(context.type === 'chapter' && { chapterCode: context.code }),
          ...(context.type === 'section' && { sectionCode: context.code })
        })
        
        noteCount++
        i = j - 1 // Continue from where we left off
      }
      
      i++
    }
    
    console.log(`    Extracted ${noteCount} notes from this section`)
  }

  private extractNumberedNote(lines: string[], startIndex: number) {
    const context = this.getCurrentContext(lines, startIndex)
    const noteMatch = lines[startIndex].match(/^(\d+)\.\s+(.+)$/)
    
    if (noteMatch && context.code) {
      const noteNumber = noteMatch[1]
      let noteText = noteMatch[2]
      
      // Collect multi-line text
      let i = startIndex + 1
      while (i < lines.length && !(/^\d+\.\s+/.test(lines[i]))) {
        if (lines[i].length > 2) {
          noteText += ' ' + lines[i]
        }
        i++
      }
      
      this.notes.push({
        hsCode: context.code,
        noteType: this.determineNoteType(noteText),
        noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
        noteText: this.cleanText(noteText),
        ...(context.type === 'chapter' && { chapterCode: context.code }),
        ...(context.type === 'section' && { sectionCode: context.code })
      })
    }
  }

  private extractNoteFromIndicator(lines: string[], startIndex: number, indicator: string) {
    const context = this.getCurrentContext(lines, startIndex)
    if (!context.code) return
    
    let noteText = lines[startIndex]
    
    // Collect multi-line text
    let i = startIndex + 1
    while (i < lines.length && 
           !this.isSectionHeader(lines[i]) &&
           !this.isChapterHeader(lines[i]) &&
           !this.isTariffTableStart(lines[i]) &&
           lines[i].length > 0) {
      noteText += ' ' + lines[i]
      i++
    }
    
    // Generate a note number based on existing notes
    const existingNotes = this.notes.filter(n => n.hsCode === context.code)
    const noteNumber = existingNotes.length + 1
    
    this.notes.push({
      hsCode: context.code,
      noteType: this.determineNoteType(noteText),
      noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
      noteText: this.cleanText(noteText),
      ...(context.type === 'chapter' && { chapterCode: context.code }),
      ...(context.type === 'section' && { sectionCode: context.code })
    })
  }

  private alternativeNoteExtraction(lines: string[]) {
    console.log('🔍 Trying alternative extraction methods...')
    
    // Method 1: Extract any line that looks like a legal statement
    const legalPatterns = [
      /does not (cover|include)/i,
      /shall be classified/i,
      /for the purposes? of/i,
      /means any/i,
      /includes?/i,
      /excludes?/i,
      /except/i,
      /other than/i,
      /provided that/i
    ]
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      for (const pattern of legalPatterns) {
        if (pattern.test(line)) {
          const context = this.getCurrentContext(lines, i)
          if (context.code) {
            // Check if we already have this as a note
            const isDuplicate = this.notes.some(n => 
              n.noteText.includes(line.substring(0, 50))
            )
            
            if (!isDuplicate) {
              console.log(`  Found legal statement: "${line.substring(0, 50)}..."`)
              
              // Collect full statement
              let fullText = line
              let j = i + 1
              while (j < lines.length && !this.isNewStatement(lines[j])) {
                if (lines[j].length > 2) {
                  fullText += ' ' + lines[j]
                }
                j++
              }
              
              const existingNotes = this.notes.filter(n => n.hsCode === context.code)
              const noteNumber = existingNotes.length + 1
              
              this.notes.push({
                hsCode: context.code,
                noteType: this.determineNoteType(fullText),
                noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
                noteText: this.cleanText(fullText),
                ...(context.type === 'chapter' && { chapterCode: context.code }),
                ...(context.type === 'section' && { sectionCode: context.code })
              })
            }
            break
          }
        }
      }
    }
  }

  private comprehensiveTariffExtraction(lines: string[]) {
    console.log('🔍 Comprehensive tariff code extraction...')
    
    let tariffCount = 0
    let inTariffSection = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if we're entering a tariff section
      if (this.isTariffTableStart(line)) {
        inTariffSection = true
        console.log(`  Entering tariff section at line ${i}`)
        continue
      }
      
      // Check if we're leaving a tariff section
      if (inTariffSection && (this.isChapterHeader(line) || this.isSectionHeader(line))) {
        inTariffSection = false
        console.log(`  Leaving tariff section at line ${i}`)
        continue
      }
      
      // Try multiple patterns for tariff codes
      const patterns = [
        // Full tariff with CD: "0101.21.00 1 Description unit rate..."
        /^(\d{4}\.\d{2}\.\d{2})\s+(\d)\s+(.+?)\s+(u|kg|l|m²|m³|2u|ct|GVM|ml|g|cm³|pa|dz|GIL|\d+[a-z]+)\s+(.+)$/,
        // Heading: "01.01 Description"
        /^(\d{2}\.\d{2})\s+([A-Z].+)$/,
        // Subheading: "0101.2 - Description"
        /^(\d{4}\.\d{1,2})\s+(-\s*)?(.+)$/,
        // Alternative format without dots
        /^(\d{8})\s+(\d)\s+(.+?)\s+(u|kg|l|m²|m³|2u|ct|GVM|ml|g|cm³|pa|dz|GIL|\d+[a-z]+)\s+(.+)$/
      ]
      
      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          tariffCount++
          this.processTariffMatch(match, pattern)
          break
        }
      }
    }
    
    console.log(`  Extracted ${tariffCount} tariff codes`)
  }

  private processTariffMatch(match: RegExpMatchArray, pattern: RegExp) {
    // Process based on pattern type
    if (match.length >= 6) {
      // Full tariff code with rates
      const code = match[1].replace(/\./g, '')
      const cd = match[2] || ''
      const description = this.cleanText(match[3])
      const unit = match[4]
      const ratesString = match[5]
      
      // Parse rates
      const rates = this.parseRates(ratesString)
      
      this.tariffCodes.push({
        code,
        cd,
        description,
        unit,
        generalRate: rates.general || 'free',
        euRate: rates.eu,
        eftaRate: rates.efta,
        sadcRate: rates.sadc,
        mercosurRate: rates.mercosur,
        afcftaRate: rates.afcfta
      })
    } else if (match.length >= 3) {
      // Heading or subheading
      const code = match[1].replace(/\./g, '')
      const description = this.cleanText(match[match.length - 1])
      
      this.tariffCodes.push({
        code,
        cd: '',
        description,
        unit: '',
        generalRate: ''
      })
    }
  }

  private parseRates(ratesString: string): any {
    const rates = ratesString.trim().split(/\s+/)
    return {
      general: rates[0] || 'free',
      eu: rates[1],
      efta: rates[2],
      sadc: rates[3],
      mercosur: rates[4],
      afcfta: rates[5]
    }
  }

  private getCurrentContext(lines: string[], currentIndex: number): { type: 'section' | 'chapter' | null, code: string } {
    // Look backwards to find the current section/chapter
    for (let i = currentIndex; i >= 0; i--) {
      if (this.isChapterHeader(lines[i])) {
        const match = lines[i].match(/CHAPTER\s+(\d+)/)
        if (match) {
          return { type: 'chapter', code: match[1].padStart(2, '0') }
        }
      }
      if (this.isSectionHeader(lines[i])) {
        const match = lines[i].match(/SECTION\s+([IVX]+)/)
        if (match) {
          return { type: 'section', code: `S${this.romanToNumber(match[1])}` }
        }
      }
    }
    return { type: null, code: '' }
  }

  private getContext(lines: string[], index: number, range: number): string {
    const start = Math.max(0, index - range)
    const end = Math.min(lines.length - 1, index + range)
    return lines.slice(start, end + 1).join(' ')
  }

  private isNewStatement(line: string): boolean {
    return /^[A-Z]/.test(line) && 
           (line.includes('.') || line.includes(':')) &&
           line.length > 20
  }

  private isSectionHeader(line: string): boolean {
    return /^SECTION\s+[IVX]+\s*$/i.test(line)
  }

  private isChapterHeader(line: string): boolean {
    return /^CHAPTER\s+\d+\s*$/i.test(line)
  }

  private isTariffTableStart(line: string): boolean {
    return line.includes('Heading /') || 
           line.includes('Statistical') ||
           line.includes('Rate of Duty') ||
           line.includes('Subheading') ||
           line.includes('General')
  }

  private parseSection(lines: string[], startIndex: number) {
    const sectionLine = lines[startIndex]
    const match = sectionLine.match(/SECTION\s+([IVX]+)\s*$/)
    
    if (match) {
      const romanNumeral = match[1]
      let description = ''
      
      if (startIndex + 1 < lines.length) {
        description = lines[startIndex + 1]
        
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
        description: this.cleanText(description),
        chapterRange: { from: 0, to: 0 }
      }
      
      this.sections.push(this.currentSection)
    }
  }

  private parseChapter(lines: string[], startIndex: number) {
    const chapterLine = lines[startIndex]
    const match = chapterLine.match(/CHAPTER\s+(\d+)\s*$/)
    
    if (match) {
      const chapterCode = match[1].padStart(2, '0')
      
      if (chapterCode === '77') return
      
      let description = ''
      if (startIndex + 1 < lines.length) {
        description = lines[startIndex + 1]
        
        let j = startIndex + 2
        while (j < lines.length && !lines[j].includes('NOTE') && !this.isTariffTableStart(lines[j])) {
          if (lines[j].length > 2 && !lines[j].includes('Date:')) {
            description += ' ' + lines[j]
          }
          j++
        }
      }
      
      this.currentChapter = {
        chapterCode,
        description: this.cleanText(description),
        sectionCode: this.currentSection?.sectionCode || 'S0'
      }
      
      this.chapters.push(this.currentChapter)
      
      if (this.currentSection) {
        const chapterNum = parseInt(chapterCode)
        if (this.currentSection.chapterRange.from === 0) {
          this.currentSection.chapterRange.from = chapterNum
        }
        this.currentSection.chapterRange.to = chapterNum
      }
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

  private cleanText(text: string): string {
    return text
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
    
    if (lowerText.includes('additional')) {
      return 'additional'
    }
    
    return 'scope'
  }

  private saveDebugOutput() {
    const debugData = {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes.slice(0, 100) // First 100 for review
    }
    
    fs.writeFileSync('sars-parse-debug.json', JSON.stringify(debugData, null, 2))
    console.log('💾 Saved debug output to sars-parse-debug.json')
  }

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