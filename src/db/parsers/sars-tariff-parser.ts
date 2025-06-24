export interface SARSTariffEntry {
  code: string
  code8Digit: string
  checkDigit: string
  description: string
  tariffRate: number
  unitOfMeasure: string
  statisticalUnit?: string
}

export interface SARSLegalNote {
  chapterCode: string
  noteType: string
  noteNumber: string
  noteText: string
  examples?: string[]
}

export class SARSTariffParser {
  // Parse SARS 8-digit code structure
  parseCode(sarsCode: string): SARSTariffEntry {
    // SARS codes are typically formatted as XXXX.XX.XX
    const cleanCode = sarsCode.replace(/\./g, '')
    
    return {
      code: cleanCode,
      code8Digit: cleanCode.substring(0, 8),
      checkDigit: this.calculateCheckDigit(cleanCode.substring(0, 8)),
      description: '', // To be filled from tariff book
      tariffRate: 0, // To be filled from tariff book
      unitOfMeasure: 'u', // Default unit
    }
  }
  
  // Calculate SARS check digit using modulo 10 algorithm
  calculateCheckDigit(code8: string): string {
    // SARS uses a specific algorithm for check digits
    // Based on standard modulo 10 with alternating weights
    let sum = 0
    for (let i = 0; i < 8; i++) {
      sum += parseInt(code8[i]) * (i % 2 === 0 ? 1 : 3)
    }
    return String((10 - (sum % 10)) % 10)
  }
  
  // Validate SARS code with check digit
  validateCode(fullCode: string): boolean {
    if (fullCode.length !== 9) return false
    
    const code8 = fullCode.substring(0, 8)
    const providedCheckDigit = fullCode[8]
    const calculatedCheckDigit = this.calculateCheckDigit(code8)
    
    return providedCheckDigit === calculatedCheckDigit
  }
  
  // Parse section notes from text
  parseSectionNote(noteText: string, sectionCode: string): SARSLegalNote {
    // Extract note structure from SARS format
    const noteMatch = noteText.match(/Note\s*(\d+)\.?\s*(.+)/s) || 
                     noteText.match(/NOTES?:?\s*(.+)/s)
    
    return {
      chapterCode: sectionCode,
      noteType: this.determineNoteType(noteText),
      noteNumber: noteMatch ? `Section ${sectionCode} Note ${noteMatch[1]}` : `Section ${sectionCode} Note`,
      noteText: noteMatch ? (noteMatch[2] || noteMatch[1]).trim() : noteText.trim(),
      examples: this.extractExamples(noteText)
    }
  }
  
  // Parse chapter notes from text
  parseChapterNote(noteText: string, chapterCode: string): SARSLegalNote {
    // Handle various note formats
    const noteNumberMatch = noteText.match(/Note\s*(\d+)\.?\s*/i)
    const additionalNoteMatch = noteText.match(/ADDITIONAL NOTE:?\s*(.+)/si)
    const subheadingNoteMatch = noteText.match(/SUBHEADING NOTES?:?\s*(.+)/si)
    
    let noteNumber = ''
    let noteType = 'scope'
    let cleanedText = noteText
    
    if (noteNumberMatch) {
      noteNumber = `Chapter ${chapterCode} Note ${noteNumberMatch[1]}`
      cleanedText = noteText.substring(noteNumberMatch[0].length).trim()
    } else if (additionalNoteMatch) {
      noteNumber = `Chapter ${chapterCode} Additional Note`
      noteType = 'additional'
      cleanedText = additionalNoteMatch[1].trim()
    } else if (subheadingNoteMatch) {
      noteNumber = `Chapter ${chapterCode} Subheading Note`
      noteType = 'subheading'
      cleanedText = subheadingNoteMatch[1].trim()
    } else {
      noteNumber = `Chapter ${chapterCode} Note`
    }
    
    return {
      chapterCode: chapterCode,
      noteType: noteType === 'scope' ? this.determineNoteType(cleanedText) : noteType,
      noteNumber: noteNumber,
      noteText: this.parseNoteContent(cleanedText),
      examples: this.extractExamples(cleanedText)
    }
  }
  
  // Parse note content, handling sub-items
  private parseNoteContent(text: string): string {
    // Clean up the text while preserving structure
    let cleaned = text.trim()
    
    // Handle sub-items (a), (b), (c) etc.
    cleaned = cleaned.replace(/\n\s*\(([a-z])\)\s*/g, '\n($1) ')
    
    // Handle numbered sub-items
    cleaned = cleaned.replace(/\n\s*(\d+)\.\s*/g, '\n$1. ')
    
    // Remove excessive whitespace while preserving paragraph breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
    cleaned = cleaned.replace(/[ \t]+/g, ' ')
    
    return cleaned
  }
  
  private determineNoteType(text: string): string {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('does not cover') || 
        lowerText.includes('does not include') ||
        lowerText.includes('excludes') ||
        lowerText.includes('excluding')) {
      return 'exclusion'
    }
    
    if (lowerText.includes('includes') || 
        lowerText.includes('covers') ||
        lowerText.includes('comprising')) {
      return 'inclusion'
    }
    
    if (lowerText.includes('means') || 
        lowerText.includes('defined as') ||
        lowerText.includes('expression') ||
        lowerText.includes('term')) {
      return 'definition'
    }
    
    if (lowerText.includes('classified') ||
        lowerText.includes('to be classified') ||
        lowerText.includes('classification')) {
      return 'classification'
    }
    
    if (lowerText.includes('for the purposes of') ||
        lowerText.includes('in this chapter') ||
        lowerText.includes('in this section')) {
      return 'scope'
    }
    
    return 'scope' // Default type
  }
  
  private extractExamples(text: string): string[] {
    const examples: string[] = []
    
    // Extract examples from "e.g." patterns
    const egMatches = text.matchAll(/e\.g\.,?\s*([^.;]+)/gi)
    for (const match of egMatches) {
      examples.push(match[1].trim())
    }
    
    // Extract examples from "for example" patterns
    const exampleMatches = text.matchAll(/for example,?\s*([^.;]+)/gi)
    for (const match of exampleMatches) {
      examples.push(match[1].trim())
    }
    
    // Extract examples from parentheses that look like examples
    const parenMatches = text.matchAll(/\(([^)]+)\)/g)
    for (const match of parenMatches) {
      const content = match[1]
      // Check if it looks like an example (contains specific items)
      if (content.includes(',') || content.includes('such as')) {
        examples.push(content.trim())
      }
    }
    
    return [...new Set(examples)] // Remove duplicates
  }
  
  // Parse tariff rate from string (handles various formats)
  parseTariffRate(rateString: string): number {
    // Remove percentage sign and trim
    const cleaned = rateString.replace('%', '').trim()
    
    // Handle "Free" or "0" rates
    if (cleaned.toLowerCase() === 'free' || cleaned === '0') {
      return 0
    }
    
    // Parse numeric value
    const rate = parseFloat(cleaned)
    return isNaN(rate) ? 0 : rate
  }
  
  // Parse unit of measure
  parseUnitOfMeasure(unitString: string): string {
    const unitMap: { [key: string]: string } = {
      'kilogram': 'kg',
      'kilograms': 'kg',
      'kg': 'kg',
      'litre': 'l',
      'litres': 'l',
      'liter': 'l',
      'liters': 'l',
      'l': 'l',
      'unit': 'u',
      'units': 'u',
      'u': 'u',
      'metre': 'm',
      'metres': 'm',
      'meter': 'm',
      'meters': 'm',
      'm': 'm',
      'square metre': 'm2',
      'square metres': 'm2',
      'm2': 'm2',
      'cubic metre': 'm3',
      'cubic metres': 'm3',
      'm3': 'm3',
      'dozen': 'doz',
      'doz': 'doz',
      'pair': 'pr',
      'pairs': 'pr',
      'pr': 'pr',
    }
    
    const lower = unitString.toLowerCase().trim()
    return unitMap[lower] || 'u' // Default to unit
  }
}