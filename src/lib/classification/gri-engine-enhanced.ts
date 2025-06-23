import { z } from 'zod'
import { GRIRule, GRIDecision, GRIContext, GRI_RULES } from './gri-engine'
import { hsDatabase } from './hs-database'
import type { Material } from '@/db/schema'

// Enhanced context with pre-classification and analysis data
export interface EnhancedGRIContext extends GRIContext {
  preClassificationComplete: boolean
  productAnalysisComplete: boolean
  legalNotes: string[]
  exclusions: string[]
  confidenceThreshold: number
  preClassificationData?: PreClassificationResult
  productAnalysisData?: ProductAnalysisResult
  suggestedHeadings?: string[]
  validationErrors: string[]
}

// Pre-classification result schema
export interface PreClassificationResult {
  productCategory: string
  materialComposition: Material[]
  intendedUse: string
  technicalSpecifications: Record<string, any>
  suggestedSections: string[]
  timestamp: Date
  confidence: number
}

// Product analysis result schema
export interface ProductAnalysisResult {
  primaryFunction: string
  secondaryFunctions: string[]
  essentialCharacter: string
  compositeAnalysis?: CompositeAnalysis
  packagingConsiderations?: PackagingAnalysis
  timestamp: Date
  confidence: number
}

export interface CompositeAnalysis {
  materials: Array<{
    name: string
    percentage: number
    role: 'structural' | 'functional' | 'aesthetic' | 'protective'
  }>
  dominantMaterial: string
  classificationMethod: 'weight' | 'value' | 'volume' | 'surface_area'
}

export interface PackagingAnalysis {
  hasPackaging: boolean
  packagingType: string
  isReusable: boolean
  isSpeciallyFitted: boolean
  givesEssentialCharacter: boolean
}

// Validation schemas
const preClassificationSchema = z.object({
  productDescription: z.string().min(10),
  materials: z.array(z.object({
    name: z.string(),
    percentage: z.number().min(0).max(100)
  })).optional(),
  intendedUse: z.string().optional(),
  technicalSpecs: z.record(z.any()).optional()
})

const productAnalysisSchema = z.object({
  primaryFunction: z.string(),
  secondaryFunctions: z.array(z.string()).optional(),
  compositeInfo: z.object({
    materials: z.array(z.object({
      name: z.string(),
      percentage: z.number(),
      role: z.enum(['structural', 'functional', 'aesthetic', 'protective'])
    }))
  }).optional()
})

// Enhanced GRI Rules with new steps
const ENHANCED_GRI_RULES: Record<string, GRIRule> = {
  ...GRI_RULES,
  'pre_classification': {
    id: 'pre_classification',
    name: 'Pre-Classification Analysis',
    description: 'Initial analysis to extract product attributes and suggest possible classifications',
    order: 0,
    requiredInputs: ['product_description'],
    decisionCriteria: [
      'What is the product category?',
      'What materials compose the product?',
      'What is the intended use?',
      'What are the key technical specifications?'
    ],
    nextSteps: [
      { condition: 'complete', nextRule: 'analyze_product' }
    ]
  },
  'analyze_product': {
    id: 'analyze_product',
    name: 'Detailed Product Analysis',
    description: 'Deep analysis of product characteristics before GRI rule application',
    order: 0.5,
    requiredInputs: ['pre_classification_data'],
    decisionCriteria: [
      'What is the primary function?',
      'What are the secondary functions?',
      'What gives the product its essential character?',
      'Are there composite or packaging considerations?'
    ],
    nextSteps: [
      { condition: 'complete', nextRule: 'gri_1' }
    ]
  }
}

export class EnhancedGRIEngine {
  private context: EnhancedGRIContext
  private currentRuleId: string
  private requiredDecisions: Map<string, Set<string>>
  
  constructor(initialContext: Partial<EnhancedGRIContext>) {
    // Ensure we start with pre_classification
    this.currentRuleId = 'pre_classification'
    
    this.context = {
      productDescription: initialContext.productDescription || '',
      currentRule: 'pre_classification',
      decisions: [],
      preClassificationComplete: false,
      productAnalysisComplete: false,
      legalNotes: [],
      exclusions: [],
      confidenceThreshold: 0.7,
      validationErrors: [],
      ...initialContext
    }
    
    // Initialize required decisions tracking
    this.requiredDecisions = new Map()
    this.initializeRequiredDecisions()
  }
  
  private initializeRequiredDecisions(): void {
    // Define required decisions for each step
    this.requiredDecisions.set('pre_classification', new Set([
      'product_category',
      'material_composition',
      'intended_use',
      'technical_specifications'
    ]))
    
    this.requiredDecisions.set('analyze_product', new Set([
      'primary_function',
      'essential_character',
      'composite_analysis'
    ]))
    
    // Add requirements for standard GRI rules
    Object.values(GRI_RULES).forEach(rule => {
      this.requiredDecisions.set(rule.id, new Set(rule.requiredInputs))
    })
  }
  
  getCurrentRule(): GRIRule {
    return ENHANCED_GRI_RULES[this.currentRuleId] || GRI_RULES[this.currentRuleId]
  }
  
  canTransition(from: string, to: string): boolean {
    // Validate mandatory workflow
    if (from === 'start' && to !== 'pre_classification') {
      this.context.validationErrors.push('Must start with pre_classification')
      return false
    }
    
    if (from === 'pre_classification' && to !== 'analyze_product') {
      this.context.validationErrors.push('Must complete analyze_product after pre_classification')
      return false
    }
    
    if (from === 'analyze_product' && to !== 'gri_1') {
      this.context.validationErrors.push('Must proceed to GRI 1 after product analysis')
      return false
    }
    
    // Check if all required decisions have been made
    const requiredForCurrent = this.requiredDecisions.get(from)
    if (requiredForCurrent) {
      const madeDecisions = new Set(
        this.context.decisions
          .filter(d => d.ruleId === from)
          .map(d => d.metadata?.decisionType)
      )
      
      for (const required of requiredForCurrent) {
        if (!madeDecisions.has(required)) {
          this.context.validationErrors.push(
            `Missing required decision: ${required} for rule ${from}`
          )
          return false
        }
      }
    }
    
    return true
  }
  
  async performPreClassification(data: any): Promise<PreClassificationResult> {
    // Validate input
    const validation = preClassificationSchema.safeParse(data)
    if (!validation.success) {
      throw new Error(`Invalid pre-classification data: ${validation.error.message}`)
    }
    
    // Analyze product and suggest sections
    const suggestedSections: string[] = []
    const keywords = data.productDescription.toLowerCase().split(' ')
    
    // Search for matching HS codes
    const searchResults = await hsDatabase.searchByKeyword(
      data.productDescription,
      { limit: 10, excludeExclusions: true }
    )
    
    // Extract unique sections from results
    const sections = new Set<string>()
    for (const result of searchResults) {
      if (result.hierarchy.length > 0) {
        const sectionCode = result.hierarchy[0]
        if (sectionCode.startsWith('S')) {
          sections.add(sectionCode)
        }
      }
    }
    
    suggestedSections.push(...Array.from(sections))
    
    const result: PreClassificationResult = {
      productCategory: this.determineProductCategory(data.productDescription),
      materialComposition: data.materials || [],
      intendedUse: data.intendedUse || 'Not specified',
      technicalSpecifications: data.technicalSpecs || {},
      suggestedSections,
      timestamp: new Date(),
      confidence: this.calculateConfidence(data)
    }
    
    // Record the decision
    this.recordDecision({
      ruleId: 'pre_classification',
      question: 'Pre-classification analysis',
      answer: JSON.stringify(result, null, 2),
      reasoning: 'Initial product analysis completed',
      confidence: result.confidence,
      metadata: { decisionType: 'pre_classification_complete', result }
    })
    
    this.context.preClassificationComplete = true
    this.context.preClassificationData = result
    this.context.suggestedHeadings = searchResults.map(r => r.code)
    
    return result
  }
  
  async performProductAnalysis(): Promise<ProductAnalysisResult> {
    if (!this.context.preClassificationComplete) {
      throw new Error('Pre-classification must be completed before product analysis')
    }
    
    const preData = this.context.preClassificationData!
    
    // Analyze composite materials if present
    let compositeAnalysis: CompositeAnalysis | undefined
    if (preData.materialComposition.length > 1) {
      compositeAnalysis = this.analyzeComposite(preData.materialComposition)
    }
    
    // Determine essential character
    const essentialCharacter = this.determineEssentialCharacter(
      preData,
      compositeAnalysis
    )
    
    const result: ProductAnalysisResult = {
      primaryFunction: this.extractPrimaryFunction(preData),
      secondaryFunctions: this.extractSecondaryFunctions(preData),
      essentialCharacter,
      compositeAnalysis,
      packagingConsiderations: this.analyzePackaging(preData),
      timestamp: new Date(),
      confidence: this.calculateAnalysisConfidence(preData)
    }
    
    // Record the decision
    this.recordDecision({
      ruleId: 'analyze_product',
      question: 'Product analysis',
      answer: JSON.stringify(result, null, 2),
      reasoning: 'Detailed product analysis completed',
      confidence: result.confidence,
      metadata: { decisionType: 'product_analysis_complete', result }
    })
    
    this.context.productAnalysisComplete = true
    this.context.productAnalysisData = result
    
    return result
  }
  
  private determineProductCategory(description: string): string {
    // Simple keyword-based categorization
    const desc = description.toLowerCase()
    
    if (desc.includes('machine') || desc.includes('equipment')) {
      return 'Machinery and Equipment'
    } else if (desc.includes('textile') || desc.includes('fabric')) {
      return 'Textiles'
    } else if (desc.includes('chemical') || desc.includes('compound')) {
      return 'Chemicals'
    } else if (desc.includes('food') || desc.includes('edible')) {
      return 'Food Products'
    } else if (desc.includes('electronic') || desc.includes('electrical')) {
      return 'Electronics'
    }
    
    return 'General Merchandise'
  }
  
  private calculateConfidence(data: any): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence based on data completeness
    if (data.materials && data.materials.length > 0) confidence += 0.1
    if (data.intendedUse) confidence += 0.1
    if (data.technicalSpecs && Object.keys(data.technicalSpecs).length > 0) confidence += 0.1
    if (data.productDescription.length > 50) confidence += 0.1
    
    return Math.min(confidence, 0.95)
  }
  
  private analyzeComposite(materials: Material[]): CompositeAnalysis {
    // Sort materials by percentage
    const sorted = [...materials].sort((a, b) => b.percentage - a.percentage)
    
    return {
      materials: sorted.map(m => ({
        name: m.name,
        percentage: m.percentage,
        role: this.determineMaterialRole(m)
      })),
      dominantMaterial: sorted[0].name,
      classificationMethod: 'weight' // Default to weight-based
    }
  }
  
  private determineMaterialRole(material: Material): 'structural' | 'functional' | 'aesthetic' | 'protective' {
    const name = material.name.toLowerCase()
    
    if (name.includes('steel') || name.includes('aluminum') || name.includes('frame')) {
      return 'structural'
    } else if (name.includes('circuit') || name.includes('motor') || name.includes('processor')) {
      return 'functional'
    } else if (name.includes('paint') || name.includes('coating') || name.includes('finish')) {
      return 'aesthetic'
    } else if (name.includes('case') || name.includes('cover') || name.includes('shield')) {
      return 'protective'
    }
    
    return 'functional' // Default
  }
  
  private determineEssentialCharacter(
    preData: PreClassificationResult,
    compositeAnalysis?: CompositeAnalysis
  ): string {
    if (compositeAnalysis && compositeAnalysis.dominantMaterial) {
      const dominant = compositeAnalysis.materials.find(
        m => m.name === compositeAnalysis.dominantMaterial
      )
      if (dominant && dominant.percentage > 50) {
        return `${dominant.name} (${dominant.percentage}% by ${compositeAnalysis.classificationMethod})`
      }
    }
    
    return preData.intendedUse || 'Primary function'
  }
  
  private extractPrimaryFunction(preData: PreClassificationResult): string {
    // Extract from intended use or description
    return preData.intendedUse || 'Function to be determined'
  }
  
  private extractSecondaryFunctions(preData: PreClassificationResult): string[] {
    // Placeholder - would use NLP in production
    return []
  }
  
  private analyzePackaging(preData: PreClassificationResult): PackagingAnalysis | undefined {
    const desc = preData.productDescription.toLowerCase()
    
    if (desc.includes('with case') || desc.includes('in box') || desc.includes('packaged')) {
      return {
        hasPackaging: true,
        packagingType: 'Standard packaging',
        isReusable: desc.includes('reusable') || desc.includes('carrying case'),
        isSpeciallyFitted: desc.includes('fitted') || desc.includes('custom'),
        givesEssentialCharacter: false
      }
    }
    
    return undefined
  }
  
  private calculateAnalysisConfidence(preData: PreClassificationResult): number {
    let confidence = preData.confidence
    
    // Adjust based on analysis completeness
    if (preData.materialComposition.length > 0) confidence += 0.05
    if (preData.technicalSpecifications && Object.keys(preData.technicalSpecifications).length > 3) {
      confidence += 0.05
    }
    
    return Math.min(confidence, 0.95)
  }
  
  recordDecision(decision: Omit<GRIDecision, 'timestamp'>): void {
    this.context.decisions.push({
      ...decision,
      timestamp: new Date()
    })
  }
  
  async moveToNextRule(condition: string): Promise<void> {
    const currentRule = this.getCurrentRule()
    const nextStep = currentRule.nextSteps.find(step => step.condition === condition)
    
    if (!nextStep || !nextStep.nextRule) {
      throw new Error(`No valid next rule for condition: ${condition}`)
    }
    
    // Validate the transition
    if (!this.canTransition(this.currentRuleId, nextStep.nextRule)) {
      throw new Error(
        `Invalid transition from ${this.currentRuleId} to ${nextStep.nextRule}. ` +
        `Errors: ${this.context.validationErrors.join(', ')}`
      )
    }
    
    this.currentRuleId = nextStep.nextRule
    this.context.currentRule = nextStep.nextRule
    
    // Clear validation errors for next transition
    this.context.validationErrors = []
  }
  
  needsExpertReview(): boolean {
    // Check if any decisions have low confidence
    const lowConfidenceDecisions = this.context.decisions.filter(
      d => d.confidence < this.context.confidenceThreshold
    )
    
    // Also check overall classification confidence
    const overallConfidence = this.getOverallConfidence()
    
    return lowConfidenceDecisions.length > 0 || overallConfidence < this.context.confidenceThreshold
  }
  
  getOverallConfidence(): number {
    if (this.context.decisions.length === 0) return 0
    
    const totalConfidence = this.context.decisions.reduce(
      (sum, decision) => sum + decision.confidence,
      0
    )
    
    return totalConfidence / this.context.decisions.length
  }
  
  getValidationErrors(): string[] {
    return [...this.context.validationErrors]
  }
  
  exportContext(): EnhancedGRIContext {
    return { ...this.context }
  }
  
  // Start classification - enforces pre_classification as first step
  startClassification(): void {
    if (this.currentRuleId !== 'pre_classification') {
      this.currentRuleId = 'pre_classification'
      this.context.currentRule = 'pre_classification'
    }
  }
}