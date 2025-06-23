// TODO: Implement HS code lookup and validation
// This would typically load from a database or JSON file

export interface HSCode {
  code: string
  description: string
  level: 'chapter' | 'heading' | 'subheading' | 'tariff'
  parentCode?: string
  notes?: string[]
  exclusions?: string[]
}

export interface HSChapter {
  chapter: string
  description: string
  sectionNotes?: string[]
  chapterNotes?: string[]
}

// Mock data structure - in production, this would be loaded from database
export const HS_CHAPTERS: Record<string, HSChapter> = {
  '84': {
    chapter: '84',
    description: 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof',
    chapterNotes: [
      'This chapter does not cover machinery or appliances of heading 84.01 to 84.24',
      'Subject to certain exceptions, machines with multiple functions are classified according to principal function'
    ]
  },
  '85': {
    chapter: '85',
    description: 'Electrical machinery and equipment and parts thereof',
    chapterNotes: [
      'This chapter does not cover electrical parts of machinery of Chapter 84',
      'Heading 85.01 to 85.04 cover electrical motors and generators'
    ]
  },
  // Add more chapters as needed
}

export const HS_CODES: Record<string, HSCode> = {
  '8471': {
    code: '8471',
    description: 'Automatic data-processing machines and units thereof',
    level: 'heading',
    notes: [
      'This heading covers automatic data-processing machines',
      'Includes digital and analog computers'
    ]
  },
  '8471.30': {
    code: '8471.30',
    description: 'Portable automatic data-processing machines, weighing not more than 10 kg',
    level: 'subheading',
    parentCode: '8471'
  },
  '8471.30.00': {
    code: '8471.30.00',
    description: 'Laptops, notebooks and similar portable computers',
    level: 'tariff',
    parentCode: '8471.30'
  },
  // Add more codes as needed
}

export class HSCodeService {
  /**
   * Search for HS codes matching a query
   */
  static searchCodes(query: string): HSCode[] {
    const lowerQuery = query.toLowerCase()
    return Object.values(HS_CODES).filter(code => 
      code.description.toLowerCase().includes(lowerQuery) ||
      code.code.includes(query)
    )
  }
  
  /**
   * Get a specific HS code
   */
  static getCode(code: string): HSCode | null {
    return HS_CODES[code] || null
  }
  
  /**
   * Get all child codes for a parent code
   */
  static getChildCodes(parentCode: string): HSCode[] {
    return Object.values(HS_CODES).filter(code => code.parentCode === parentCode)
  }
  
  /**
   * Validate if a code exists
   */
  static isValidCode(code: string): boolean {
    return code in HS_CODES
  }
  
  /**
   * Get the chapter for a code
   */
  static getChapter(code: string): HSChapter | null {
    const chapterNum = code.substring(0, 2)
    return HS_CHAPTERS[chapterNum] || null
  }
  
  /**
   * Format a code for display
   */
  static formatCode(code: string): string {
    if (code.length === 4) {
      return `${code.substring(0, 2)}.${code.substring(2)}`
    } else if (code.length === 6) {
      return `${code.substring(0, 4)}.${code.substring(4)}`
    } else if (code.length === 8) {
      return `${code.substring(0, 4)}.${code.substring(4, 6)}.${code.substring(6)}`
    }
    return code
  }
  
  /**
   * Get all applicable notes for a code (chapter notes, section notes, etc.)
   */
  static getApplicableNotes(code: string): string[] {
    const notes: string[] = []
    
    // Get chapter notes
    const chapter = this.getChapter(code)
    if (chapter?.chapterNotes) {
      notes.push(...chapter.chapterNotes)
    }
    
    // Get heading/subheading specific notes
    const hsCode = this.getCode(code)
    if (hsCode?.notes) {
      notes.push(...hsCode.notes)
    }
    
    return notes
  }
  
  /**
   * Compare two codes for specificity (for GRI 3a)
   */
  static compareSpecificity(code1: string, code2: string): number {
    const hsCode1 = this.getCode(code1)
    const hsCode2 = this.getCode(code2)
    
    if (!hsCode1 || !hsCode2) return 0
    
    // Longer codes are more specific
    if (code1.length !== code2.length) {
      return code1.length > code2.length ? 1 : -1
    }
    
    // At same level, compare description specificity
    // This is simplified - real implementation would use NLP
    const desc1Length = hsCode1.description.length
    const desc2Length = hsCode2.description.length
    
    return desc1Length > desc2Length ? 1 : desc1Length < desc2Length ? -1 : 0
  }
}