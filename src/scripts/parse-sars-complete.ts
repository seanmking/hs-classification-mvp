import * as fs from 'fs'
import * as pdf from 'pdf-parse'

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

export class CompleteSARSParser {
  private sections: ParsedSection[] = []
  private chapters: ParsedChapter[] = []
  private notes: ParsedNote[] = []
  private tariffCodes: ParsedTariffCode[] = []
  private currentSection: ParsedSection | null = null
  private currentChapter: ParsedChapter | null = null
  private lines: string[] = []
  private rawText: string = ''

  async parsePDF(filePath: string): Promise<ParseResult> {
    console.log(`📄 Complete SARS Tariff Book Parsing`)
    console.log(`📍 Source: ${filePath}`)
    
    const dataBuffer = fs.readFileSync(filePath)
    const data = await (pdf as any).default(dataBuffer)
    
    console.log(`📖 Total pages: ${data.numpages}`)
    console.log(`📝 Total characters: ${data.text.length}`)
    
    // Save for debugging
    this.rawText = data.text
    fs.writeFileSync('sars-complete-raw.txt', data.text)
    
    // Split into lines
    this.lines = data.text.split('\n')
    
    // Multi-pass parsing
    console.log('\n🔄 Pass 1: Extracting sections and chapters...')
    this.extractStructure()
    
    console.log('\n🔄 Pass 2: Extracting ALL legal notes...')
    this.extractAllLegalNotes()
    
    console.log('\n🔄 Pass 3: Extracting tariff codes...')
    this.extractTariffCodes()
    
    console.log(`\n📊 Complete Parsing Results:`)
    console.log(`  ✅ ${this.sections.length} sections`)
    console.log(`  ✅ ${this.chapters.length} chapters`)
    console.log(`  ${this.notes.length > 0 ? '✅' : '❌'} ${this.notes.length} legal notes`)
    console.log(`  ${this.tariffCodes.length > 0 ? '✅' : '❌'} ${this.tariffCodes.length} tariff codes`)
    
    // Save detailed results
    this.saveResults()
    
    return {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes
    }
  }

  private extractStructure() {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim()
      
      if (this.isSectionHeader(line)) {
        this.parseSection(i)
      }
      
      if (this.isChapterHeader(line)) {
        this.parseChapter(i)
      }
    }
    
    console.log(`  Found ${this.sections.length} sections and ${this.chapters.length} chapters`)
  }

  private extractAllLegalNotes() {
    console.log('  Scanning for all note patterns...')
    
    // Track what we're looking for
    let noteMarkers = {
      'NOTES:': 0,
      'NOTE:': 0,
      'ADDITIONAL NOTE:': 0,
      'This Chapter': 0,
      'This Section': 0,
      'does not cover': 0
    }
    
    // Scan entire document for notes
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim()
      
      // Check for note markers
      if (/^(NOTES?:|ADDITIONAL NOTES?:)\s*$/i.test(line)) {
        const marker = line
        noteMarkers[marker.replace(/\s*$/, '')] = (noteMarkers[marker.replace(/\s*$/, '')] || 0) + 1
        
        console.log(`  Found ${marker} at line ${i}`)
        this.extractNotesFromMarker(i)
      }
      
      // Check for inline notes (e.g., "This Chapter covers...")
      if (line.startsWith('This Chapter') || line.startsWith('This Section')) {
        const key = line.startsWith('This Chapter') ? 'This Chapter' : 'This Section'
        noteMarkers[key]++
        
        this.extractInlineNote(i)
      }
      
      // Check for exclusion language
      if (line.includes('does not cover') || line.includes('does not include')) {
        noteMarkers['does not cover']++
      }
    }
    
    console.log('  Note marker summary:', noteMarkers)
  }

  private extractNotesFromMarker(markerLine: number) {
    // Determine context
    const context = this.getContext(markerLine)
    if (!context) {
      console.log(`    Warning: No context found for note at line ${markerLine}`)
      return
    }
    
    console.log(`    Context: ${context.type} ${context.code}`)
    
    let i = markerLine + 1
    let noteNumber = 0
    
    // Look for numbered notes after the marker
    while (i < this.lines.length) {
      const line = this.lines[i].trim()
      
      // Stop conditions
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) break
      if (this.isTableStart(line)) break
      if (line.startsWith('Date:')) break
      
      // Check for note number (e.g., "1." or "1)")
      const numberMatch = line.match(/^(\d+)[.)]?\s*$/)
      if (numberMatch) {
        noteNumber = parseInt(numberMatch[1])
        
        // Get the note text (next non-empty lines)
        let noteText = ''
        let j = i + 1
        
        while (j < this.lines.length) {
          const textLine = this.lines[j].trim()
          
          // Stop if we hit another number or section
          if (/^(\d+)[.)]?\s*$/.test(textLine)) break
          if (this.isSectionHeader(textLine) || this.isChapterHeader(textLine)) break
          if (this.isTableStart(textLine)) break
          if (textLine.startsWith('Date:')) break
          
          // Add non-empty lines to note text
          if (textLine.length > 0) {
            noteText += (noteText ? ' ' : '') + textLine
          }
          
          j++
        }
        
        if (noteText) {
          const note: ParsedNote = {
            hsCode: context.code,
            noteType: this.determineNoteType(noteText),
            noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
            noteText: this.cleanText(noteText),
            ...(context.type === 'chapter' && { chapterCode: context.code }),
            ...(context.type === 'section' && { sectionCode: context.code })
          }
          
          this.notes.push(note)
          console.log(`    Added note ${noteNumber}: ${noteText.substring(0, 50)}...`)
        }
        
        i = j - 1
      }
      
      i++
    }
  }

  private extractInlineNote(startLine: number) {
    const context = this.getContext(startLine)
    if (!context) return
    
    // Collect the complete note text
    let noteText = this.lines[startLine].trim()
    let i = startLine + 1
    
    // Continue collecting lines until we hit a break
    while (i < this.lines.length) {
      const line = this.lines[i].trim()
      
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) break
      if (this.isTableStart(line)) break
      if (line.startsWith('Date:')) break
      if (line.length === 0) break
      
      noteText += ' ' + line
      i++
    }
    
    // Generate note number based on existing notes for this context
    const existingNotes = this.notes.filter(n => n.hsCode === context.code)
    const noteNumber = existingNotes.length + 1
    
    const note: ParsedNote = {
      hsCode: context.code,
      noteType: this.determineNoteType(noteText),
      noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
      noteText: this.cleanText(noteText),
      ...(context.type === 'chapter' && { chapterCode: context.code }),
      ...(context.type === 'section' && { sectionCode: context.code })
    }
    
    this.notes.push(note)
  }

  private extractTariffCodes() {
    let inTable = false
    let tariffCount = 0
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim()
      
      if (this.isTableStart(line)) {
        inTable = true
        continue
      }
      
      if (inTable && (this.isSectionHeader(line) || this.isChapterHeader(line))) {
        inTable = false
        continue
      }
      
      // Try to parse as tariff code
      const tariff = this.parseTariffLine(line)
      if (tariff) {
        this.tariffCodes.push(tariff)
        tariffCount++
        
        if (tariffCount % 100 === 0) {
          console.log(`  Processed ${tariffCount} tariff codes...`)
        }
      }
    }
    
    console.log(`  Total tariff codes extracted: ${tariffCount}`)
  }

  private parseTariffLine(line: string): ParsedTariffCode | null {
    // Pattern 1: Full 8-digit tariff with CD
    // Example: "0101.21.00 1 Pure-bred breeding animals u free free free free free free"
    const fullMatch = line.match(
      /^(\d{4}\.\d{2}\.\d{2})\s+(\d)\s+(.+?)\s+(u|kg|l|m²|m³|2u|ct|GVM|ml|g|cm³|pa|dz|GIL)\s+(free|Free|\d+%?|\d+c\/\w+)\s*(.*)$/
    )
    
    if (fullMatch) {
      const rates = (fullMatch[6] || '').trim().split(/\s+/)
      return {
        code: fullMatch[1].replace(/\./g, ''),
        cd: fullMatch[2],
        description: this.cleanText(fullMatch[3]),
        unit: fullMatch[4],
        generalRate: fullMatch[5].toLowerCase(),
        euRate: rates[0] || fullMatch[5].toLowerCase(),
        eftaRate: rates[1] || fullMatch[5].toLowerCase(),
        sadcRate: rates[2] || fullMatch[5].toLowerCase(),
        mercosurRate: rates[3] || fullMatch[5].toLowerCase(),
        afcftaRate: rates[4] || fullMatch[5].toLowerCase()
      }
    }
    
    // Pattern 2: Heading (01.01)
    const headingMatch = line.match(/^(\d{2}\.\d{2})\s+([A-Z].+?)(:|$)/)
    if (headingMatch && !this.isTableHeader(line)) {
      return {
        code: headingMatch[1].replace('.', ''),
        cd: '',
        description: this.cleanText(headingMatch[2]),
        unit: '',
        generalRate: ''
      }
    }
    
    // Pattern 3: Subheading (0101.21)
    const subheadingMatch = line.match(/^(\d{4}\.\d{2})\s+(\d)\s*-\s*-\s*(.+)$/)
    if (subheadingMatch) {
      return {
        code: subheadingMatch[1].replace(/\./g, ''),
        cd: subheadingMatch[2],
        description: this.cleanText(subheadingMatch[3]),
        unit: '',
        generalRate: ''
      }
    }
    
    return null
  }

  private getContext(lineNumber: number): { type: 'section' | 'chapter', code: string } | null {
    // Look backwards for the most recent section or chapter
    for (let i = lineNumber; i >= 0; i--) {
      const line = this.lines[i].trim()
      
      if (this.isChapterHeader(line)) {
        const match = line.match(/CHAPTER\s+(\d+)/)
        if (match) {
          return { type: 'chapter', code: match[1].padStart(2, '0') }
        }
      }
      
      if (this.isSectionHeader(line)) {
        const match = line.match(/SECTION\s+([IVX]+)/)
        if (match) {
          return { type: 'section', code: `S${this.romanToNumber(match[1])}` }
        }
      }
    }
    
    return null
  }

  private parseSection(lineNumber: number) {
    const line = this.lines[lineNumber].trim()
    const match = line.match(/SECTION\s+([IVX]+)/)
    
    if (match) {
      const romanNumeral = match[1]
      let description = ''
      
      // Get description from next lines
      let i = lineNumber + 1
      while (i < this.lines.length) {
        const descLine = this.lines[i].trim()
        if (this.isChapterHeader(descLine) || descLine.includes('NOTE')) break
        if (descLine.length > 2 && !descLine.includes('Date:')) {
          description += (description ? ' ' : '') + descLine
        }
        i++
      }
      
      const section: ParsedSection = {
        sectionCode: `S${this.romanToNumber(romanNumeral)}`,
        romanNumeral,
        description: this.cleanText(description),
        chapterRange: { from: 0, to: 0 }
      }
      
      this.currentSection = section
      this.sections.push(section)
    }
  }

  private parseChapter(lineNumber: number) {
    const line = this.lines[lineNumber].trim()
    const match = line.match(/CHAPTER\s+(\d+)/)
    
    if (match) {
      const chapterCode = match[1].padStart(2, '0')
      
      // Skip reserved chapter 77
      if (chapterCode === '77') return
      
      let description = ''
      
      // Get description from next lines
      let i = lineNumber + 1
      while (i < this.lines.length) {
        const descLine = this.lines[i].trim()
        if (descLine.includes('NOTE') || this.isTableStart(descLine)) break
        if (descLine.length > 2 && !descLine.includes('Date:')) {
          description += (description ? ' ' : '') + descLine
        }
        i++
      }
      
      const chapter: ParsedChapter = {
        chapterCode,
        description: this.cleanText(description),
        sectionCode: this.currentSection?.sectionCode || 'S0'
      }
      
      this.currentChapter = chapter
      this.chapters.push(chapter)
      
      // Update section range
      if (this.currentSection) {
        const num = parseInt(chapterCode)
        if (this.currentSection.chapterRange.from === 0) {
          this.currentSection.chapterRange.from = num
        }
        this.currentSection.chapterRange.to = num
      }
    }
  }

  private isSectionHeader(line: string): boolean {
    return /^SECTION\s+[IVX]+\s*$/i.test(line)
  }

  private isChapterHeader(line: string): boolean {
    return /^CHAPTER\s+\d+\s*$/i.test(line)
  }

  private isTableStart(line: string): boolean {
    return line.includes('Heading /') || 
           line.includes('Statistical') ||
           line.includes('Rate of Duty') ||
           line.includes('Subheading')
  }

  private isTableHeader(line: string): boolean {
    const headers = ['heading', 'subheading', 'statistical', 'rate', 'duty', 'general', 'eu', 'CD']
    return headers.some(h => line.toLowerCase().includes(h.toLowerCase()))
  }

  private romanToNumber(roman: string): number {
    const values: { [key: string]: number } = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100
    }
    
    let result = 0
    for (let i = 0; i < roman.length; i++) {
      const current = values[roman[i]]
      const next = values[roman[i + 1]]
      
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
      .replace(/^-+\s*/g, '')
      .replace(/Date:\s*\d{4}-\d{2}-\d{2}/g, '')
      .replace(/SCHEDULE\s+\d+.*/g, '')
      .trim()
  }

  private determineNoteType(text: string): ParsedNote['noteType'] {
    const lower = text.toLowerCase()
    
    if (lower.includes('does not cover') || lower.includes('does not include') || 
        lower.includes('excluding') || lower.includes('except')) {
      return 'exclusion'
    }
    
    if (lower.includes('includes') || lower.includes('covers') || 
        lower.includes('comprising')) {
      return 'inclusion'
    }
    
    if (lower.includes('means') || lower.includes('expression') || 
        lower.includes('defined as')) {
      return 'definition'
    }
    
    if (lower.includes('subheading')) {
      return 'subheading'
    }
    
    if (lower.includes('additional')) {
      return 'additional'
    }
    
    return 'scope'
  }

  private saveResults() {
    const results = {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes.slice(0, 100), // First 100 for review
      summary: {
        totalSections: this.sections.length,
        totalChapters: this.chapters.length,
        totalNotes: this.notes.length,
        totalTariffCodes: this.tariffCodes.length,
        notesByType: this.notes.reduce((acc, note) => {
          acc[note.noteType] = (acc[note.noteType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }
    
    fs.writeFileSync('sars-complete-results.json', JSON.stringify(results, null, 2))
    console.log('\n💾 Saved complete results to sars-complete-results.json')
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

// Run if called directly
if (require.main === module) {
  const parser = new CompleteSARSParser()
  parser.parsePDF('/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf')
    .then(result => {
      console.log('\n✅ Parsing complete!')
    })
    .catch(error => {
      console.error('❌ Error:', error)
    })
}