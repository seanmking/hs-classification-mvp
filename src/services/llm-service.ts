// LLM Service for intelligent HS classification
// This service integrates with Llama or similar LLM for natural language understanding

import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'database.db'))

export interface ClassificationResult {
  code: string
  description: string
  confidence: number
  level: 'heading' | 'subheading' | 'tariff'
  reasoning: string
  alternatives?: ClassificationResult[]
  legalNotes?: string[]
  similarProducts?: SimilarProduct[]
  uncertainties?: Uncertainty[]
}

export interface SimilarProduct {
  id: string
  name: string
  code: string
  similarity: number
}

export interface Uncertainty {
  id: string
  description: string
  impact: 'high' | 'medium' | 'low'
  suggestedClarification: string
}

export interface Question {
  id: string
  text: string
  type: 'single' | 'multiple' | 'text'
  topOptions: QuestionOption[]
  currentNumber: number
  totalQuestions: number
  isLast: boolean
}

export interface QuestionOption {
  value: string
  label: string
  recommended?: boolean
  confidence?: number
}

export interface InputAnalysis {
  missingSuggestions?: string[]
  potentialIssues?: string[]
  extractedFeatures?: {
    materials?: string[]
    purpose?: string
    dimensions?: any
    technicalSpecs?: string[]
  }
}

export class LLMService {
  private apiKey: string
  private apiUrl: string
  private confidenceThreshold: number = 0.85

  constructor(config?: { apiKey?: string; apiUrl?: string }) {
    // In production, these would come from environment variables
    this.apiKey = config?.apiKey || process.env.LLM_API_KEY || 'demo-key'
    this.apiUrl = config?.apiUrl || process.env.LLM_API_URL || '/api/llm'
  }

  // Main classification method
  async classify(input: string, context?: any): Promise<ClassificationResult> {
    try {
      // For MVP, we'll use a hybrid approach: LLM for understanding, DB for classification
      
      // Step 1: Extract features from natural language
      const features = await this.extractFeatures(input)
      
      // Step 2: Search database with extracted features
      const candidates = await this.searchDatabase(features)
      
      // Step 3: Rank and score candidates
      const ranked = await this.rankCandidates(candidates, features, input)
      
      // Step 4: Apply GRI rules
      const result = await this.applyGRIRules(ranked, features)
      
      // Step 5: Add supporting information
      const enhanced = await this.enhanceResult(result, input)
      
      return enhanced
    } catch (error) {
      console.error('Classification error:', error)
      // Fallback to basic keyword search
      return this.fallbackClassification(input)
    }
  }

  // Stream classification for better perceived performance
  async classifyStream(options: {
    input: string
    onPartial: (partial: Partial<ClassificationResult>) => void
  }): Promise<{ complete: () => Promise<ClassificationResult> }> {
    const { input, onPartial } = options
    
    // Start with skeleton
    onPartial({
      code: '████████',
      description: 'Analyzing product...',
      confidence: 0
    })
    
    // Simulate streaming updates
    setTimeout(() => {
      onPartial({
        code: '████████',
        description: 'Finding best matches...',
        confidence: 0.3
      })
    }, 500)
    
    // Return complete function
    return {
      complete: async () => {
        const result = await this.classify(input)
        return result
      }
    }
  }

  // Progressive questioning to reach confidence threshold
  async determineNextQuestion(
    input: string,
    answers: Record<string, any>,
    confidenceTarget: number = 0.85
  ): Promise<{ confident: boolean; classification?: ClassificationResult; nextQuestion?: Question }> {
    // Analyze current confidence
    const currentAnalysis = await this.analyzeWithAnswers(input, answers)
    
    if (currentAnalysis.confidence >= confidenceTarget) {
      return {
        confident: true,
        classification: currentAnalysis
      }
    }
    
    // Determine what information would most improve confidence
    const missingInfo = await this.identifyMissingInformation(currentAnalysis)
    
    if (!missingInfo || missingInfo.length === 0) {
      // Can't improve further
      return {
        confident: true,
        classification: currentAnalysis
      }
    }
    
    // Generate next question
    const nextQuestion = await this.generateQuestion(missingInfo[0], answers)
    
    return {
      confident: false,
      nextQuestion
    }
  }

  // Analyze input for smart hints and error prevention
  async analyzeInput(options: {
    text: string
    mode: 'preventive_guidance' | 'feature_extraction'
  }): Promise<InputAnalysis> {
    const { text, mode } = options
    
    if (mode === 'preventive_guidance') {
      // Suggest helpful additions
      const suggestions = await this.generateHelpfulSuggestions(text)
      
      // Identify potential issues
      const issues = await this.identifyPotentialIssues(text)
      
      return {
        missingSuggestions: suggestions,
        potentialIssues: issues
      }
    } else {
      // Extract structured features
      const features = await this.extractFeatures(text)
      
      return {
        extractedFeatures: features
      }
    }
  }

  // Private methods for implementation
  
  private async extractFeatures(input: string): Promise<any> {
    // In production, this would call the LLM API
    // For MVP, we'll use pattern matching and keyword extraction
    
    const features: any = {
      materials: [],
      purpose: '',
      characteristics: [],
      technicalSpecs: []
    }
    
    // Material detection
    const materialPatterns = [
      /\b(cotton|wool|silk|polyester|nylon|leather|plastic|metal|steel|iron|wood|paper|glass)\b/gi,
      /\b(gold|silver|copper|aluminum|rubber|ceramic|stone|concrete)\b/gi
    ]
    
    materialPatterns.forEach(pattern => {
      const matches = input.match(pattern)
      if (matches) {
        features.materials.push(...matches.map(m => m.toLowerCase()))
      }
    })
    
    // Purpose/use detection
    const purposePatterns = [
      /for\s+(\w+ing)/gi,
      /used\s+for\s+(\w+)/gi,
      /\b(kitchen|office|home|industrial|medical|sports|automotive)\b/gi
    ]
    
    purposePatterns.forEach(pattern => {
      const match = input.match(pattern)
      if (match) {
        features.purpose = match[0].toLowerCase()
      }
    })
    
    // Technical specifications
    const techPatterns = [
      /\d+\s*(mm|cm|m|kg|g|l|ml|inch|inches|lb|lbs)/gi,
      /\d+\s*(volt|v|watt|w|amp|a|hz)/gi
    ]
    
    techPatterns.forEach(pattern => {
      const matches = input.match(pattern)
      if (matches) {
        features.technicalSpecs.push(...matches)
      }
    })
    
    return features
  }

  private async searchDatabase(features: any): Promise<any[]> {
    // Search database based on extracted features
    const queries = []
    
    // Material-based search
    if (features.materials.length > 0) {
      features.materials.forEach((material: string) => {
        queries.push(
          db.prepare(`
            SELECT DISTINCT code, description, level
            FROM hs_codes_enhanced
            WHERE LOWER(description) LIKE ?
            AND level IN ('heading', 'subheading', 'tariff')
            LIMIT 20
          `).all(`%${material}%`)
        )
      })
    }
    
    // Purpose-based search
    if (features.purpose) {
      queries.push(
        db.prepare(`
          SELECT DISTINCT code, description, level
          FROM hs_codes_enhanced
          WHERE LOWER(description) LIKE ?
          AND level IN ('heading', 'subheading', 'tariff')
          LIMIT 20
        `).all(`%${features.purpose}%`)
      )
    }
    
    // Flatten and deduplicate results
    const allResults = queries.flat()
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.code, item])).values()
    )
    
    return uniqueResults
  }

  private async rankCandidates(candidates: any[], features: any, originalInput: string): Promise<any[]> {
    // Score each candidate based on relevance
    const scored = candidates.map(candidate => {
      let score = 0
      const description = candidate.description.toLowerCase()
      const input = originalInput.toLowerCase()
      
      // Material matches
      features.materials?.forEach((material: string) => {
        if (description.includes(material)) {
          score += 10
        }
      })
      
      // Purpose matches
      if (features.purpose && description.includes(features.purpose)) {
        score += 15
      }
      
      // Direct keyword matches
      const words = input.split(/\s+/)
      words.forEach(word => {
        if (word.length > 3 && description.includes(word)) {
          score += 5
        }
      })
      
      // Level preference (heading > subheading > tariff for initial classification)
      if (candidate.level === 'heading') score += 5
      else if (candidate.level === 'subheading') score += 3
      else if (candidate.level === 'tariff') score += 1
      
      return { ...candidate, score }
    })
    
    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score)
  }

  private async applyGRIRules(candidates: any[], features: any): Promise<ClassificationResult> {
    if (candidates.length === 0) {
      throw new Error('No candidates found')
    }
    
    const primary = candidates[0]
    const alternatives = candidates.slice(1, 4)
    
    // Calculate confidence based on score distribution
    const totalScore = candidates.reduce((sum, c) => sum + c.score, 0)
    const confidence = totalScore > 0 ? primary.score / totalScore : 0
    
    return {
      code: primary.code,
      description: primary.description,
      confidence: Math.min(confidence * 1.2, 0.99), // Boost confidence slightly, cap at 0.99
      level: primary.level,
      reasoning: this.generateReasoning(primary, features),
      alternatives: alternatives.map(alt => ({
        code: alt.code,
        description: alt.description,
        confidence: totalScore > 0 ? alt.score / totalScore : 0,
        level: alt.level,
        reasoning: this.generateReasoning(alt, features)
      }))
    }
  }

  private generateReasoning(candidate: any, features: any): string {
    const reasons = []
    
    if (features.materials?.length > 0) {
      const matchedMaterials = features.materials.filter((m: string) => 
        candidate.description.toLowerCase().includes(m)
      )
      if (matchedMaterials.length > 0) {
        reasons.push(`Material match: ${matchedMaterials.join(', ')}`)
      }
    }
    
    if (features.purpose && candidate.description.toLowerCase().includes(features.purpose)) {
      reasons.push(`Purpose match: ${features.purpose}`)
    }
    
    if (candidate.level === 'heading') {
      reasons.push('Broad category match at heading level')
    }
    
    return reasons.join('. ') || 'General classification based on product description'
  }

  private async enhanceResult(result: ClassificationResult, input: string): Promise<ClassificationResult> {
    // Add legal notes
    const legalNotes = await this.getLegalNotes(result.code)
    
    // Find similar products
    const similarProducts = await this.findSimilarProducts(result.code, input)
    
    // Identify uncertainties
    const uncertainties = this.identifyUncertainties(result, input)
    
    return {
      ...result,
      legalNotes,
      similarProducts,
      uncertainties
    }
  }

  private async getLegalNotes(code: string): Promise<string[]> {
    const notes = db.prepare(`
      SELECT note_text
      FROM legal_notes
      WHERE hs_code = ? OR hs_code = ?
      ORDER BY priority DESC
      LIMIT 5
    `).all(code.substring(0, 2), code.substring(0, 4))
    
    return notes.map(n => n.note_text)
  }

  private async findSimilarProducts(code: string, input: string): Promise<SimilarProduct[]> {
    // In production, this would use a vector database or similarity search
    // For MVP, we'll return mock data based on the code
    
    const similarProducts: Record<string, SimilarProduct[]> = {
      '8517': [
        { id: '1', name: 'iPhone 14', code: '8517', similarity: 0.95 },
        { id: '2', name: 'Samsung Galaxy S23', code: '8517', similarity: 0.93 },
        { id: '3', name: 'Google Pixel 7', code: '8517', similarity: 0.91 }
      ],
      '6105': [
        { id: '4', name: 'Polo shirt', code: '6105', similarity: 0.92 },
        { id: '5', name: 'Dress shirt', code: '6105', similarity: 0.88 },
        { id: '6', name: 'Tank top', code: '6109', similarity: 0.75 }
      ]
    }
    
    const chapterCode = code.substring(0, 4)
    return similarProducts[chapterCode] || []
  }

  private identifyUncertainties(result: ClassificationResult, input: string): Uncertainty[] {
    const uncertainties: Uncertainty[] = []
    
    if (result.confidence < 0.7) {
      uncertainties.push({
        id: '1',
        description: 'Product category is ambiguous',
        impact: 'high',
        suggestedClarification: 'Specify the primary function or use of this product'
      })
    }
    
    if (result.alternatives && result.alternatives.length > 2) {
      uncertainties.push({
        id: '2',
        description: 'Multiple similar classifications possible',
        impact: 'medium',
        suggestedClarification: 'Provide more details about materials or construction'
      })
    }
    
    return uncertainties
  }

  private async fallbackClassification(input: string): Promise<ClassificationResult> {
    // Basic keyword search fallback
    const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    
    const results = db.prepare(`
      SELECT code, description, level
      FROM hs_codes_enhanced
      WHERE ${words.map(() => 'LOWER(description) LIKE ?').join(' OR ')}
      AND level = 'heading'
      LIMIT 1
    `).get(...words.map(w => `%${w}%`))
    
    if (results) {
      return {
        code: results.code,
        description: results.description,
        confidence: 0.5,
        level: results.level,
        reasoning: 'Basic keyword match (fallback mode)'
      }
    }
    
    return {
      code: '9999',
      description: 'Unable to classify - please use manual selection',
      confidence: 0,
      level: 'heading',
      reasoning: 'No matches found'
    }
  }

  private async analyzeWithAnswers(input: string, answers: Record<string, any>): Promise<ClassificationResult> {
    // Re-classify with additional context from answers
    const enhancedInput = `${input} ${Object.values(answers).join(' ')}`
    return this.classify(enhancedInput, answers)
  }

  private async identifyMissingInformation(analysis: ClassificationResult): Promise<string[]> {
    const missing = []
    
    if (analysis.confidence < 0.6) {
      missing.push('primary_purpose')
      missing.push('material_composition')
    } else if (analysis.confidence < 0.8) {
      if (analysis.uncertainties?.some(u => u.description.includes('material'))) {
        missing.push('material_details')
      }
      if (analysis.uncertainties?.some(u => u.description.includes('function'))) {
        missing.push('specific_use')
      }
    }
    
    return missing
  }

  private async generateQuestion(missingInfo: string, previousAnswers: Record<string, any>): Promise<Question> {
    const questions: Record<string, Question> = {
      primary_purpose: {
        id: 'purpose',
        text: "What's the main purpose of this product?",
        type: 'single',
        topOptions: [
          { value: 'personal_use', label: 'Personal/household use', recommended: true, confidence: 0.8 },
          { value: 'commercial', label: 'Commercial/industrial use', confidence: 0.6 },
          { value: 'professional', label: 'Professional/office use', confidence: 0.5 }
        ],
        currentNumber: Object.keys(previousAnswers).length + 1,
        totalQuestions: 3,
        isLast: false
      },
      material_composition: {
        id: 'material',
        text: 'What is the primary material?',
        type: 'single',
        topOptions: [
          { value: 'textile', label: 'Textile/fabric', confidence: 0.7 },
          { value: 'metal', label: 'Metal', confidence: 0.6 },
          { value: 'plastic', label: 'Plastic/polymer', confidence: 0.6 }
        ],
        currentNumber: Object.keys(previousAnswers).length + 1,
        totalQuestions: 3,
        isLast: false
      },
      material_details: {
        id: 'material_detail',
        text: 'Can you specify the exact material?',
        type: 'single',
        topOptions: [
          { value: 'cotton', label: '100% Cotton', recommended: true, confidence: 0.8 },
          { value: 'cotton_blend', label: 'Cotton blend', confidence: 0.7 },
          { value: 'synthetic', label: 'Synthetic material', confidence: 0.5 }
        ],
        currentNumber: Object.keys(previousAnswers).length + 1,
        totalQuestions: 3,
        isLast: true
      }
    }
    
    return questions[missingInfo] || questions.primary_purpose
  }

  private async generateHelpfulSuggestions(text: string): Promise<string[]> {
    const suggestions = []
    const lowerText = text.toLowerCase()
    
    // Material suggestions
    if (!lowerText.match(/\b(cotton|wool|leather|plastic|metal|wood)\b/)) {
      suggestions.push('material (e.g., cotton, plastic)')
    }
    
    // Size/dimension suggestions
    if (!lowerText.match(/\d+\s*(mm|cm|m|inch|kg|g|l)/)) {
      suggestions.push('size or weight')
    }
    
    // Purpose suggestions
    if (!lowerText.includes('for') && !lowerText.includes('use')) {
      suggestions.push('intended use')
    }
    
    // Feature suggestions
    if (lowerText.includes('shirt') && !lowerText.match(/\b(printed|embroidered|plain)\b/)) {
      suggestions.push('design details')
    }
    
    return suggestions.slice(0, 3) // Max 3 suggestions
  }

  private async identifyPotentialIssues(text: string): Promise<string[]> {
    const issues = []
    
    // Too vague
    if (text.length < 20) {
      issues.push('Try adding more details for better accuracy')
    }
    
    // Conflicting terms
    if (text.includes('plastic') && text.includes('metal')) {
      issues.push('Specify which material is primary')
    }
    
    // Missing key info for certain products
    if (text.includes('clothing') && !text.match(/\b(men|women|children|unisex)\b/i)) {
      issues.push("Specify if it's for men's, women's, or children's")
    }
    
    return issues
  }
}

// Export singleton instance
export const llmService = new LLMService()