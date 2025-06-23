import { z } from 'zod'

// TODO: Implement the core GRI logic
// Must enforce:
// 1. Sequential rule application (1->2->3->4->5->6)
// 2. Cannot skip rules
// 3. Document reasoning at each step
// 4. Generate decision tree
// 5. Flag when expert review needed

export interface GRIRule {
  id: string
  name: string
  description: string
  order: number
  requiredInputs: string[]
  decisionCriteria: string[]
  nextSteps: {
    condition: string
    nextRule: string | null
  }[]
}

export interface GRIDecision {
  ruleId: string
  question: string
  answer: string
  reasoning: string
  confidence: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface GRIContext {
  productDescription: string
  currentRule: string
  decisions: GRIDecision[]
  materials?: Array<{
    name: string
    percentage: number
    hsCode?: string
  }>
  additionalData?: Record<string, any>
}

export const GRI_RULES: Record<string, GRIRule> = {
  'gri_1': {
    id: 'gri_1',
    name: 'Classification by terms of headings',
    description: 'Classification shall be determined according to the terms of the headings and any relative section or chapter notes',
    order: 1,
    requiredInputs: ['product_description', 'primary_function'],
    decisionCriteria: [
      'Does the product fit clearly within a single heading?',
      'Are there any section or chapter notes that apply?',
      'Is the heading description specific to this product?'
    ],
    nextSteps: [
      { condition: 'single_heading_found', nextRule: 'gri_6' },
      { condition: 'incomplete_product', nextRule: 'gri_2a' },
      { condition: 'multiple_materials', nextRule: 'gri_2b' },
      { condition: 'multiple_headings', nextRule: 'gri_3a' }
    ]
  },
  'gri_2a': {
    id: 'gri_2a',
    name: 'Incomplete or unfinished articles',
    description: 'Any reference to an article includes incomplete/unfinished articles having the essential character of the complete article',
    order: 2,
    requiredInputs: ['missing_components', 'essential_character'],
    decisionCriteria: [
      'What components are missing?',
      'Does it have the essential character of the complete article?',
      'Can it function as intended despite missing parts?'
    ],
    nextSteps: [
      { condition: 'has_essential_character', nextRule: 'gri_1' },
      { condition: 'lacks_essential_character', nextRule: 'gri_3a' }
    ]
  },
  'gri_2b': {
    id: 'gri_2b',
    name: 'Mixtures and composite goods',
    description: 'Any reference to goods of a given material includes mixtures or combinations with other materials',
    order: 2,
    requiredInputs: ['material_composition', 'primary_material'],
    decisionCriteria: [
      'What materials compose the product?',
      'What are the percentages of each material?',
      'Which material gives the product its essential character?'
    ],
    nextSteps: [
      { condition: 'single_material_dominates', nextRule: 'gri_1' },
      { condition: 'multiple_materials_equal', nextRule: 'gri_3b' }
    ]
  },
  'gri_3a': {
    id: 'gri_3a',
    name: 'Most specific description',
    description: 'The heading providing the most specific description shall be preferred to headings providing general descriptions',
    order: 3,
    requiredInputs: ['possible_headings', 'specificity_analysis'],
    decisionCriteria: [
      'Which heading provides the most specific description?',
      'Are any headings clearly more specific than others?',
      'Do any headings mention the product by name?'
    ],
    nextSteps: [
      { condition: 'specific_heading_found', nextRule: 'gri_6' },
      { condition: 'equal_specificity', nextRule: 'gri_3b' }
    ]
  },
  'gri_3b': {
    id: 'gri_3b',
    name: 'Essential character',
    description: 'Goods shall be classified according to the material or component which gives them their essential character',
    order: 3,
    requiredInputs: ['components', 'character_analysis'],
    decisionCriteria: [
      'Which component gives the essential character?',
      'Consider: bulk, quantity, weight, value, or role in use',
      'What is the primary function provided by each component?'
    ],
    nextSteps: [
      { condition: 'essential_character_determined', nextRule: 'gri_6' },
      { condition: 'no_essential_character', nextRule: 'gri_3c' }
    ]
  },
  'gri_3c': {
    id: 'gri_3c',
    name: 'Last heading in numerical order',
    description: 'When goods cannot be classified by 3(a) or 3(b), classify under the heading which occurs last in numerical order',
    order: 3,
    requiredInputs: ['applicable_headings'],
    decisionCriteria: [
      'List all applicable headings in numerical order',
      'Select the last heading in numerical order'
    ],
    nextSteps: [
      { condition: 'always', nextRule: 'gri_6' }
    ]
  },
  'gri_4': {
    id: 'gri_4',
    name: 'Goods not covered by any heading',
    description: 'Goods which cannot be classified under any heading shall be classified under the heading for the most similar goods',
    order: 4,
    requiredInputs: ['similar_products', 'similarity_analysis'],
    decisionCriteria: [
      'What similar products exist in the tariff?',
      'What characteristics make them similar?',
      'Which product is most similar overall?'
    ],
    nextSteps: [
      { condition: 'similar_goods_found', nextRule: 'gri_6' }
    ]
  },
  'gri_5': {
    id: 'gri_5',
    name: 'Cases and containers',
    description: 'Cases, containers, and packing materials are classified with the goods if suitable for repetitive use',
    order: 5,
    requiredInputs: ['packaging_description', 'reusability'],
    decisionCriteria: [
      'Is the packaging suitable for repetitive use?',
      'Is it specially shaped or fitted for the goods?',
      'Does it give the whole its essential character?'
    ],
    nextSteps: [
      { condition: 'classify_with_goods', nextRule: 'gri_6' },
      { condition: 'classify_separately', nextRule: 'gri_1' }
    ]
  },
  'gri_6': {
    id: 'gri_6',
    name: 'Subheading classification',
    description: 'Apply GRI 1-5 at the subheading level within the same heading',
    order: 6,
    requiredInputs: ['heading', 'subheading_options'],
    decisionCriteria: [
      'Apply GRI rules to determine correct subheading',
      'Work from 4-digit to 6-digit to 8-digit classification'
    ],
    nextSteps: [
      { condition: 'classification_complete', nextRule: null }
    ]
  }
}

export class GRIEngine {
  private context: GRIContext
  private currentRuleId: string
  
  constructor(initialContext: Partial<GRIContext>) {
    this.context = {
      productDescription: initialContext.productDescription || '',
      currentRule: 'gri_1',
      decisions: [],
      ...initialContext
    }
    this.currentRuleId = 'gri_1'
  }
  
  getCurrentRule(): GRIRule {
    return GRI_RULES[this.currentRuleId]
  }
  
  canProceedToNextRule(): boolean {
    const currentRule = this.getCurrentRule()
    // Check if all required inputs have been collected
    // This is a simplified check - in reality would validate actual data
    return currentRule.requiredInputs.length > 0
  }
  
  recordDecision(decision: Omit<GRIDecision, 'timestamp'>): void {
    this.context.decisions.push({
      ...decision,
      timestamp: new Date()
    })
  }
  
  moveToNextRule(condition: string): void {
    const currentRule = this.getCurrentRule()
    const nextStep = currentRule.nextSteps.find(step => step.condition === condition)
    
    if (nextStep && nextStep.nextRule) {
      this.currentRuleId = nextStep.nextRule
      this.context.currentRule = nextStep.nextRule
    }
  }
  
  getDecisionTree(): any {
    // TODO: Generate visual decision tree from decisions
    return {
      id: 'root',
      label: 'Classification Start',
      type: 'gri_rule',
      children: this.buildTreeFromDecisions()
    }
  }
  
  private buildTreeFromDecisions(): any[] {
    // TODO: Build tree structure from decision history
    return this.context.decisions.map((decision, index) => ({
      id: `decision_${index}`,
      label: decision.question,
      type: 'decision',
      metadata: {
        answer: decision.answer,
        confidence: decision.confidence
      }
    }))
  }
  
  needsExpertReview(): boolean {
    // Check if any decisions have low confidence
    const lowConfidenceDecisions = this.context.decisions.filter(d => d.confidence < 0.7)
    return lowConfidenceDecisions.length > 0
  }
  
  getProgress(): number {
    const totalRules = Object.keys(GRI_RULES).length
    const currentRuleOrder = this.getCurrentRule().order
    return (currentRuleOrder / totalRules) * 100
  }
  
  exportContext(): GRIContext {
    return { ...this.context }
  }
}