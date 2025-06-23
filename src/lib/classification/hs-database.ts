import { getDb } from '@/lib/db/client'
import { hsCodes, type HSCode } from '@/db/schema'
import { eq, like, and, or, sql, inArray } from 'drizzle-orm'

interface Note {
  source: string // Which level the note comes from (section, chapter, heading, etc.)
  text: string
  type: 'inclusion' | 'exclusion' | 'general'
}

interface HSCodeWithHierarchy extends HSCode {
  hierarchy: string[] // Array of parent codes
  applicableNotes: Note[]
}

interface SearchOptions {
  excludeExclusions?: boolean
  limit?: number
  includeHierarchy?: boolean
}

export class HSCodeDatabase {
  private cache: Map<string, HSCode>
  private exclusionIndex: Map<string, string[]>
  private hierarchyCache: Map<string, string[]>
  private cacheHits: number = 0
  private cacheMisses: number = 0

  constructor() {
    this.cache = new Map()
    this.exclusionIndex = new Map()
    this.hierarchyCache = new Map()
    this.initializeCache()
  }

  private async initializeCache(): Promise<void> {
    console.log('Initializing HS code cache...')
    
    try {
      const db = getDb()
      // Load frequently accessed codes (chapters and major headings)
      const frequentCodes = await db.select()
        .from(hsCodes)
        .where(or(
          eq(hsCodes.level, 'chapter'),
          eq(hsCodes.level, 'section')
        ))
        .execute()
      
      frequentCodes.forEach(code => {
        this.cache.set(code.code, code)
        
        // Build exclusion index
        if (code.exclusions) {
          const exclusions = JSON.parse(code.exclusions)
          if (Array.isArray(exclusions) && exclusions.length > 0) {
            this.exclusionIndex.set(code.code, exclusions)
          }
        }
      })
      
      console.log(`Cache initialized with ${this.cache.size} codes`)
    } catch (error) {
      console.error('Failed to initialize cache:', error)
    }
  }

  private getCached(code: string): HSCode | null {
    const cached = this.cache.get(code)
    if (cached) {
      this.cacheHits++
      return cached
    }
    this.cacheMisses++
    return null
  }

  private setCached(code: string, data: HSCode): void {
    // Limit cache size to prevent memory issues
    if (this.cache.size > 1000) {
      // Remove oldest entries (simple FIFO)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(code, data)
  }

  async getByCode(code: string): Promise<HSCode | null> {
    // Check cache first
    const cached = this.getCached(code)
    if (cached) {
      return cached
    }

    // Fetch from database
    const db = getDb()
    const result = await db.select()
      .from(hsCodes)
      .where(eq(hsCodes.code, code))
      .limit(1)
      .execute()

    if (result.length > 0) {
      this.setCached(code, result[0])
      return result[0]
    }

    return null
  }

  async getHierarchy(code: string): Promise<string[]> {
    // Check hierarchy cache
    if (this.hierarchyCache.has(code)) {
      return this.hierarchyCache.get(code)!
    }

    const hierarchy: string[] = []
    let currentCode = code

    while (currentCode) {
      const hsCode = await this.getByCode(currentCode)
      if (!hsCode) break
      
      hierarchy.unshift(currentCode)
      currentCode = hsCode.parentCode || ''
    }

    // Cache the hierarchy
    this.hierarchyCache.set(code, hierarchy)
    return hierarchy
  }

  async getApplicableNotes(hsCode: string): Promise<Note[]> {
    const hierarchy = await this.getHierarchy(hsCode)
    const notes: Note[] = []

    // Collect notes from all levels in the hierarchy
    for (const code of hierarchy) {
      const hsCodeData = await this.getByCode(code)
      if (!hsCodeData) continue

      // Parse notes
      if (hsCodeData.notes) {
        try {
          const parsedNotes = JSON.parse(hsCodeData.notes)
          if (Array.isArray(parsedNotes)) {
            parsedNotes.forEach(noteText => {
              notes.push({
                source: `${hsCodeData.level} ${code}`,
                text: noteText,
                type: 'general'
              })
            })
          }
        } catch (error) {
          console.error(`Failed to parse notes for ${code}:`, error)
        }
      }

      // Parse exclusions
      if (hsCodeData.exclusions) {
        try {
          const parsedExclusions = JSON.parse(hsCodeData.exclusions)
          if (Array.isArray(parsedExclusions)) {
            parsedExclusions.forEach(exclusionText => {
              notes.push({
                source: `${hsCodeData.level} ${code}`,
                text: exclusionText,
                type: 'exclusion'
              })
            })
          }
        } catch (error) {
          console.error(`Failed to parse exclusions for ${code}:`, error)
        }
      }
    }

    return notes
  }

  private async checkExclusions(code: string, searchTerm: string): Promise<boolean> {
    const notes = await this.getApplicableNotes(code)
    const exclusions = notes.filter(note => note.type === 'exclusion')
    
    // Check if the search term matches any exclusion
    for (const exclusion of exclusions) {
      if (exclusion.text.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true // This code is excluded for this search term
      }
    }
    
    return false
  }

  async searchByKeyword(
    keyword: string, 
    options: SearchOptions = {}
  ): Promise<HSCodeWithHierarchy[]> {
    const { 
      excludeExclusions = true, 
      limit = 50,
      includeHierarchy = true 
    } = options

    // Search in database
    const db = getDb()
    const searchPattern = `%${keyword}%`
    const results = await db.select()
      .from(hsCodes)
      .where(like(hsCodes.description, searchPattern))
      .limit(limit)
      .execute()

    // Filter by exclusions if requested
    let filteredResults = results
    if (excludeExclusions) {
      const filtered: HSCode[] = []
      
      for (const result of results) {
        const isExcluded = await this.checkExclusions(result.code, keyword)
        if (!isExcluded) {
          filtered.push(result)
        }
      }
      
      filteredResults = filtered
    }

    // Add hierarchy and notes if requested
    if (includeHierarchy) {
      const enhancedResults: HSCodeWithHierarchy[] = []
      
      for (const result of filteredResults) {
        const hierarchy = await this.getHierarchy(result.code)
        const applicableNotes = await this.getApplicableNotes(result.code)
        
        enhancedResults.push({
          ...result,
          hierarchy,
          applicableNotes
        })
      }
      
      return enhancedResults
    }

    // Return basic results with empty hierarchy and notes
    return filteredResults.map(result => ({
      ...result,
      hierarchy: [],
      applicableNotes: []
    }))
  }

  async getSimilarCodes(code: string, limit: number = 10): Promise<HSCode[]> {
    const targetCode = await this.getByCode(code)
    if (!targetCode) return []

    // Find codes with similar descriptions or in the same chapter/heading
    const parentCode = targetCode.parentCode || code.substring(0, 2)
    
    const db = getDb()
    const similar = await db.select()
      .from(hsCodes)
      .where(and(
        like(hsCodes.code, `${parentCode}%`),
        sql`${hsCodes.code} != ${code}`
      ))
      .limit(limit)
      .execute()

    return similar
  }

  async validateClassification(
    productDescription: string, 
    proposedCode: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = []
    
    // Get the proposed HS code
    const hsCode = await this.getByCode(proposedCode)
    if (!hsCode) {
      return { valid: false, issues: ['Invalid HS code'] }
    }

    // Check exclusions
    const notes = await this.getApplicableNotes(proposedCode)
    const exclusions = notes.filter(note => note.type === 'exclusion')
    
    for (const exclusion of exclusions) {
      // Simple keyword matching - in production, use NLP
      const keywords = exclusion.text.toLowerCase().split(' ')
      const descLower = productDescription.toLowerCase()
      
      if (keywords.some(keyword => descLower.includes(keyword))) {
        issues.push(`Product may be excluded by: ${exclusion.text} (from ${exclusion.source})`)
      }
    }

    // Check if the product description matches the HS code description
    const codeKeywords = hsCode.description.toLowerCase().split(' ')
      .filter(word => word.length > 3) // Filter out small words
    
    const matchingKeywords = codeKeywords.filter(keyword => 
      productDescription.toLowerCase().includes(keyword)
    )
    
    if (matchingKeywords.length === 0) {
      issues.push('Product description does not match any keywords from the HS code description')
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  async getChildren(parentCode: string): Promise<HSCode[]> {
    const db = getDb()
    return await db.select()
      .from(hsCodes)
      .where(eq(hsCodes.parentCode, parentCode))
      .execute()
  }

  async getChapterCodes(): Promise<HSCode[]> {
    const db = getDb()
    return await db.select()
      .from(hsCodes)
      .where(eq(hsCodes.level, 'chapter'))
      .execute()
  }

  async getSectionCodes(): Promise<HSCode[]> {
    const db = getDb()
    return await db.select()
      .from(hsCodes)
      .where(eq(hsCodes.level, 'section'))
      .execute()
  }

  getCacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  clearCache(): void {
    this.cache.clear()
    this.exclusionIndex.clear()
    this.hierarchyCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
    console.log('Cache cleared')
  }
}

// Export a singleton instance
export const hsDatabase = new HSCodeDatabase()