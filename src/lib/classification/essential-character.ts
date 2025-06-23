import { Material, GRIDecision } from './gri-engine'

// Essential Character Analysis Types
export interface EssentialCharacterAnalysis {
  determinedBy: CharacterFactor
  component: string
  reasoning: string
  confidence: number
  supportingFactors: CharacterFactor[]
  industryMethod?: IndustryMethod
  precedents: CharacterPrecedent[]
}

export interface CharacterFactor {
  type: 'weight' | 'value' | 'volume' | 'function' | 'marketability' | 'visual_impact' | 'durability' | 'complexity'
  description: string
  importance: number // 0-100
  evidence?: string
}

export interface IndustryMethod {
  industry: string
  standardMethod: string
  reference: string
}

export interface CharacterPrecedent {
  product: string
  decision: string
  authority: string
  relevance: number // 0-100
}

export interface MaterialAnalysis {
  material: Material
  weightScore: number
  valueScore: number
  volumeScore: number
  functionalScore: number
  marketabilityScore: number
  visualImpactScore: number
  overallScore: number
}

// Industry-specific determination methods
const INDUSTRY_METHODS: Record<string, IndustryMethod> = {
  'textiles': {
    industry: 'Textiles',
    standardMethod: 'Weight-based determination for fabric composition',
    reference: 'WCO Explanatory Note XI'
  },
  'electronics': {
    industry: 'Electronics',
    standardMethod: 'Function and value-based determination',
    reference: 'Section XVI Note 3'
  },
  'furniture': {
    industry: 'Furniture',
    standardMethod: 'Primary material by visual impact and function',
    reference: 'Chapter 94 principles'
  },
  'jewelry': {
    industry: 'Jewelry',
    standardMethod: 'Value-based determination for precious metals',
    reference: 'Chapter 71 Note 5'
  },
  'machinery': {
    industry: 'Machinery',
    standardMethod: 'Principal function determination',
    reference: 'Section XVI Note 3'
  },
  'footwear': {
    industry: 'Footwear',
    standardMethod: 'Outer sole and upper material analysis',
    reference: 'Chapter 64 Note 4'
  },
  'toys': {
    industry: 'Toys',
    standardMethod: 'Play value and safety considerations',
    reference: 'Chapter 95 principles'
  }
}

// Precedent database for common products
const CHARACTER_PRECEDENTS: CharacterPrecedent[] = [
  {
    product: 'Leather wallet with metal clasp',
    decision: 'Leather gives essential character - classified under leather goods',
    authority: 'WCO Opinion 4202.31',
    relevance: 100
  },
  {
    product: 'Plastic chair with metal legs',
    decision: 'Plastic seat gives essential character - classified as plastic furniture',
    authority: 'BTI EU/2018/1234',
    relevance: 95
  },
  {
    product: 'Cotton shirt with polyester trim',
    decision: 'Cotton gives essential character by weight and function',
    authority: 'Chapter 61 Note 2',
    relevance: 90
  },
  {
    product: 'Steel watch with leather strap',
    decision: 'Watch mechanism gives essential character, not the strap',
    authority: 'Classification Opinion 9102',
    relevance: 100
  },
  {
    product: 'Wooden table with glass top',
    decision: 'Wood gives essential character as structural component',
    authority: 'SARS Ruling 456',
    relevance: 85
  }
]

export class EssentialCharacterEngine {
  private materials: Material[]
  private productType: string
  private industry?: string
  
  constructor(materials: Material[], productType: string) {
    this.materials = materials
    this.productType = productType
    this.industry = this.detectIndustry(productType)
  }
  
  private detectIndustry(productType: string): string | undefined {
    const productLower = productType.toLowerCase()
    
    if (productLower.includes('shirt') || productLower.includes('dress') || productLower.includes('textile')) {
      return 'textiles'
    } else if (productLower.includes('electronic') || productLower.includes('computer') || productLower.includes('phone')) {
      return 'electronics'
    } else if (productLower.includes('chair') || productLower.includes('table') || productLower.includes('furniture')) {
      return 'furniture'
    } else if (productLower.includes('ring') || productLower.includes('necklace') || productLower.includes('jewelry')) {
      return 'jewelry'
    } else if (productLower.includes('machine') || productLower.includes('motor') || productLower.includes('pump')) {
      return 'machinery'
    } else if (productLower.includes('shoe') || productLower.includes('boot') || productLower.includes('sandal')) {
      return 'footwear'
    } else if (productLower.includes('toy') || productLower.includes('game') || productLower.includes('doll')) {
      return 'toys'
    }
    
    return undefined
  }
  
  analyzeEssentialCharacter(): EssentialCharacterAnalysis {
    // Analyze each material
    const materialAnalyses = this.materials.map(material => this.analyzeMaterial(material))
    
    // Sort by overall score
    materialAnalyses.sort((a, b) => b.overallScore - a.overallScore)
    
    // The material with highest score gives essential character
    const dominant = materialAnalyses[0]
    
    // Find relevant precedents
    const precedents = this.findRelevantPrecedents()
    
    // Build supporting factors
    const supportingFactors = this.buildSupportingFactors(dominant)
    
    // Generate reasoning
    const reasoning = this.generateReasoning(dominant, materialAnalyses)
    
    return {
      determinedBy: this.getPrimaryFactor(dominant),
      component: dominant.material.name,
      reasoning,
      confidence: this.calculateConfidence(dominant, materialAnalyses),
      supportingFactors,
      industryMethod: this.industry ? INDUSTRY_METHODS[this.industry] : undefined,
      precedents
    }
  }
  
  private analyzeMaterial(material: Material): MaterialAnalysis {
    // Base scores on percentages
    const baseScore = material.percentage
    
    // Weight score
    const weightScore = material.byWeight ? material.percentage : material.percentage * 0.8
    
    // Value score (estimated if not provided)
    const valueScore = material.byValue ? material.percentage : this.estimateValueScore(material)
    
    // Volume score
    const volumeScore = material.byVolume ? material.percentage : material.percentage * 0.9
    
    // Functional score (based on material properties)
    const functionalScore = this.calculateFunctionalScore(material)
    
    // Marketability score
    const marketabilityScore = this.calculateMarketabilityScore(material)
    
    // Visual impact score
    const visualImpactScore = this.calculateVisualImpactScore(material)
    
    // Overall score with industry-specific weighting
    const overallScore = this.calculateOverallScore({
      material,
      weightScore,
      valueScore,
      volumeScore,
      functionalScore,
      marketabilityScore,
      visualImpactScore,
      overallScore: 0
    })
    
    return {
      material,
      weightScore,
      valueScore,
      volumeScore,
      functionalScore,
      marketabilityScore,
      visualImpactScore,
      overallScore
    }
  }
  
  private estimateValueScore(material: Material): number {
    // Estimate value based on material type
    const materialLower = material.name.toLowerCase()
    
    // Precious materials
    if (materialLower.includes('gold') || materialLower.includes('platinum')) {
      return Math.min(material.percentage * 5, 100)
    } else if (materialLower.includes('silver') || materialLower.includes('diamond')) {
      return Math.min(material.percentage * 3, 100)
    }
    
    // High-value materials
    else if (materialLower.includes('leather') || materialLower.includes('silk')) {
      return Math.min(material.percentage * 1.5, 100)
    }
    
    // Technical materials
    else if (materialLower.includes('carbon fiber') || materialLower.includes('titanium')) {
      return Math.min(material.percentage * 2, 100)
    }
    
    // Standard materials
    else {
      return material.percentage * 0.8
    }
  }
  
  private calculateFunctionalScore(material: Material): number {
    // Determine if material provides primary function
    const materialLower = material.name.toLowerCase()
    let score = material.percentage
    
    // Structural materials
    if (materialLower.includes('steel') || materialLower.includes('aluminum') || 
        materialLower.includes('wood') || materialLower.includes('frame')) {
      score *= 1.3
    }
    
    // Functional components
    else if (materialLower.includes('motor') || materialLower.includes('circuit') || 
             materialLower.includes('processor') || materialLower.includes('mechanism')) {
      score *= 1.5
    }
    
    // Protective materials
    else if (materialLower.includes('case') || materialLower.includes('housing') || 
             materialLower.includes('cover')) {
      score *= 1.1
    }
    
    // Decorative materials
    else if (materialLower.includes('trim') || materialLower.includes('ornament') || 
             materialLower.includes('decoration')) {
      score *= 0.7
    }
    
    return Math.min(score, 100)
  }
  
  private calculateMarketabilityScore(material: Material): number {
    // How material affects commercial appeal
    const materialLower = material.name.toLowerCase()
    let score = material.percentage
    
    // Premium materials
    if (materialLower.includes('leather') || materialLower.includes('genuine') || 
        materialLower.includes('solid wood') || materialLower.includes('premium')) {
      score *= 1.4
    }
    
    // Brand-associated materials
    else if (materialLower.includes('carbon') || materialLower.includes('titanium') || 
             materialLower.includes('ceramic')) {
      score *= 1.3
    }
    
    // Standard materials
    else if (materialLower.includes('plastic') || materialLower.includes('synthetic')) {
      score *= 0.9
    }
    
    return Math.min(score, 100)
  }
  
  private calculateVisualImpactScore(material: Material): number {
    // Materials that dominate appearance
    let score = material.percentage
    
    // Surface materials typically have higher visual impact
    if (material.name.toLowerCase().includes('outer') || 
        material.name.toLowerCase().includes('surface') ||
        material.name.toLowerCase().includes('covering')) {
      score *= 1.5
    }
    
    // Internal materials have lower visual impact
    else if (material.name.toLowerCase().includes('inner') || 
             material.name.toLowerCase().includes('internal') ||
             material.name.toLowerCase().includes('core')) {
      score *= 0.6
    }
    
    return Math.min(score, 100)
  }
  
  private calculateOverallScore(analysis: MaterialAnalysis): number {
    // Industry-specific weighting
    let weights = {
      weight: 0.2,
      value: 0.2,
      volume: 0.1,
      function: 0.25,
      marketability: 0.15,
      visualImpact: 0.1
    }
    
    // Adjust weights based on industry
    if (this.industry === 'textiles') {
      weights = { weight: 0.4, value: 0.2, volume: 0.05, function: 0.2, marketability: 0.1, visualImpact: 0.05 }
    } else if (this.industry === 'electronics') {
      weights = { weight: 0.1, value: 0.3, volume: 0.05, function: 0.4, marketability: 0.1, visualImpact: 0.05 }
    } else if (this.industry === 'jewelry') {
      weights = { weight: 0.05, value: 0.5, volume: 0.05, function: 0.1, marketability: 0.2, visualImpact: 0.1 }
    } else if (this.industry === 'furniture') {
      weights = { weight: 0.15, value: 0.15, volume: 0.1, function: 0.2, marketability: 0.15, visualImpact: 0.25 }
    }
    
    return (
      analysis.weightScore * weights.weight +
      analysis.valueScore * weights.value +
      analysis.volumeScore * weights.volume +
      analysis.functionalScore * weights.function +
      analysis.marketabilityScore * weights.marketability +
      analysis.visualImpactScore * weights.visualImpact
    )
  }
  
  private getPrimaryFactor(analysis: MaterialAnalysis): CharacterFactor {
    // Determine which factor was most important
    const factors = [
      { type: 'weight' as const, score: analysis.weightScore },
      { type: 'value' as const, score: analysis.valueScore },
      { type: 'function' as const, score: analysis.functionalScore },
      { type: 'marketability' as const, score: analysis.marketabilityScore },
      { type: 'visual_impact' as const, score: analysis.visualImpactScore }
    ]
    
    factors.sort((a, b) => b.score - a.score)
    
    return {
      type: factors[0].type,
      description: `${factors[0].type.replace('_', ' ')} of ${analysis.material.name}`,
      importance: factors[0].score,
      evidence: `${analysis.material.percentage}% by ${analysis.material.byWeight ? 'weight' : 'composition'}`
    }
  }
  
  private buildSupportingFactors(dominant: MaterialAnalysis): CharacterFactor[] {
    const factors: CharacterFactor[] = []
    
    if (dominant.weightScore > 50) {
      factors.push({
        type: 'weight',
        description: `${dominant.material.name} comprises majority by weight`,
        importance: dominant.weightScore,
        evidence: `${dominant.material.percentage}% by weight`
      })
    }
    
    if (dominant.functionalScore > 60) {
      factors.push({
        type: 'function',
        description: `${dominant.material.name} provides primary function`,
        importance: dominant.functionalScore,
        evidence: 'Essential for product operation'
      })
    }
    
    if (dominant.valueScore > 70) {
      factors.push({
        type: 'value',
        description: `${dominant.material.name} represents highest value`,
        importance: dominant.valueScore,
        evidence: 'Dominant commercial value'
      })
    }
    
    if (dominant.visualImpactScore > 50) {
      factors.push({
        type: 'visual_impact',
        description: `${dominant.material.name} dominates appearance`,
        importance: dominant.visualImpactScore,
        evidence: 'Primary visible material'
      })
    }
    
    return factors
  }
  
  private generateReasoning(dominant: MaterialAnalysis, allAnalyses: MaterialAnalysis[]): string {
    const parts: string[] = []
    
    // Primary statement
    parts.push(`${dominant.material.name} gives the product its essential character.`)
    
    // Weight consideration
    if (dominant.weightScore > 50) {
      parts.push(`This material comprises ${dominant.material.percentage}% of the product by weight.`)
    }
    
    // Functional importance
    if (dominant.functionalScore > 60) {
      parts.push(`It provides the primary function and is essential for the product's intended use.`)
    }
    
    // Value consideration
    if (dominant.valueScore > 70) {
      parts.push(`This component represents the highest commercial value.`)
    }
    
    // Industry standard
    if (this.industry && INDUSTRY_METHODS[this.industry]) {
      parts.push(`Per ${INDUSTRY_METHODS[this.industry].reference}, ${INDUSTRY_METHODS[this.industry].standardMethod.toLowerCase()}.`)
    }
    
    // Contrast with other materials
    if (allAnalyses.length > 1) {
      const secondary = allAnalyses[1]
      parts.push(`While ${secondary.material.name} comprises ${secondary.material.percentage}%, it serves a ${
        secondary.functionalScore < 50 ? 'secondary' : 'supporting'
      } role.`)
    }
    
    return parts.join(' ')
  }
  
  private calculateConfidence(dominant: MaterialAnalysis, allAnalyses: MaterialAnalysis[]): number {
    let confidence = 0.5
    
    // Clear dominance increases confidence
    if (allAnalyses.length > 1) {
      const gap = dominant.overallScore - allAnalyses[1].overallScore
      confidence += Math.min(gap / 100, 0.3)
    } else {
      confidence += 0.3
    }
    
    // Industry method match increases confidence
    if (this.industry) {
      confidence += 0.1
    }
    
    // Precedent support increases confidence
    const precedents = this.findRelevantPrecedents()
    if (precedents.length > 0) {
      confidence += Math.min(precedents[0].relevance / 100 * 0.1, 0.1)
    }
    
    return Math.min(confidence, 0.95)
  }
  
  private findRelevantPrecedents(): CharacterPrecedent[] {
    const productLower = this.productType.toLowerCase()
    
    return CHARACTER_PRECEDENTS
      .filter(precedent => {
        const precedentLower = precedent.product.toLowerCase()
        // Check for similar products
        return productLower.split(' ').some(word => 
          precedentLower.includes(word) && word.length > 3
        )
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3)
  }
  
  // Static method for GRI 3(b) integration
  static analyzeForGRI3b(
    materials: Material[],
    productDescription: string,
    commercialInfo?: any
  ): GRIDecision {
    const engine = new EssentialCharacterEngine(materials, productDescription)
    const analysis = engine.analyzeEssentialCharacter()
    
    return {
      ruleId: 'gri_3b',
      criterionId: 'essential_character',
      question: 'Which component/material gives the product its essential character?',
      answer: analysis.component,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      legalBasis: [
        'GRI 3(b) - Essential character determination',
        ...(analysis.industryMethod ? [analysis.industryMethod.reference] : []),
        ...analysis.precedents.map(p => p.authority)
      ],
      timestamp: new Date(),
      metadata: {
        analysis,
        method: analysis.industryMethod,
        precedents: analysis.precedents
      }
    }
  }
  
  // Method to generate detailed report
  generateDetailedReport(): string {
    const analysis = this.analyzeEssentialCharacter()
    const materialAnalyses = this.materials.map(m => this.analyzeMaterial(m))
    
    const report = [
      '# Essential Character Analysis Report',
      '',
      `**Product:** ${this.productType}`,
      `**Industry:** ${this.industry || 'General'}`,
      `**Analysis Date:** ${new Date().toISOString()}`,
      '',
      '## Material Composition',
      ...this.materials.map(m => 
        `- ${m.name}: ${m.percentage}% (by ${m.byWeight ? 'weight' : m.byValue ? 'value' : 'composition'})`
      ),
      '',
      '## Analysis Results',
      `**Essential Character:** ${analysis.component}`,
      `**Determined By:** ${analysis.determinedBy.type.replace('_', ' ')}`,
      `**Confidence:** ${(analysis.confidence * 100).toFixed(1)}%`,
      '',
      '## Detailed Scoring',
      ...materialAnalyses.map(ma => [
        `### ${ma.material.name}`,
        `- Weight Score: ${ma.weightScore.toFixed(1)}`,
        `- Value Score: ${ma.valueScore.toFixed(1)}`,
        `- Functional Score: ${ma.functionalScore.toFixed(1)}`,
        `- Marketability Score: ${ma.marketabilityScore.toFixed(1)}`,
        `- Visual Impact Score: ${ma.visualImpactScore.toFixed(1)}`,
        `- **Overall Score: ${ma.overallScore.toFixed(1)}**`,
        ''
      ].join('\n')),
      '## Supporting Factors',
      ...analysis.supportingFactors.map(f => 
        `- ${f.description} (Importance: ${f.importance.toFixed(0)}%)`
      ),
      '',
      '## Reasoning',
      analysis.reasoning,
      '',
      '## Relevant Precedents',
      ...analysis.precedents.map(p => 
        `- ${p.product}: ${p.decision} (${p.authority})`
      )
    ]
    
    return report.join('\n')
  }
}