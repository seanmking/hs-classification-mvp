import { z } from 'zod'

// Import everything from WCO-compliant engine
import { 
  WCOCompliantGRIEngine,
  COMPLETE_GRI_RULES,
  type GRIRule,
  type ValidationRule,
  type DecisionCriterion,
  type NextStep,
  type Condition,
  type Example,
  type GRIDecision,
  type GRIContext,
  type Material,
  type PhysicalCharacteristics,
  type CommercialInfo,
  type HSHeading,
  type ExcludedHeading
} from './gri-engine-wco'

// Re-export types
export type {
  GRIRule,
  ValidationRule,
  DecisionCriterion,
  NextStep,
  Condition,
  Example,
  GRIDecision,
  GRIContext,
  Material,
  PhysicalCharacteristics,
  CommercialInfo,
  HSHeading,
  ExcludedHeading
}

// Re-export constants
export { COMPLETE_GRI_RULES as GRI_RULES }

// Export the enhanced engine as the default GRIEngine
export class GRIEngine extends WCOCompliantGRIEngine {
  constructor(initialContext: Partial<GRIContext>) {
    super(initialContext)
  }
  
  // Additional helper methods for backward compatibility
  canProceedToNextRule(): boolean {
    const currentRule = this.getCurrentRule()
    const validation = this.validateRule(currentRule)
    return validation.valid
  }
  
  needsExpertReview(): boolean {
    // Check if any decisions have low confidence
    const context = this.exportContext()
    const lowConfidenceDecisions = context.decisions.filter(d => d.confidence < 0.7)
    return lowConfidenceDecisions.length > 0
  }
  
  getDecisionTree(): any {
    // Generate visual decision tree from decisions
    const context = this.exportContext()
    return {
      id: 'root',
      label: 'Classification Start',
      type: 'gri_rule',
      children: this.buildTreeFromDecisions(context.decisions)
    }
  }
  
  private buildTreeFromDecisions(decisions: GRIDecision[]): any[] {
    return decisions.map((decision, index) => ({
      id: `decision_${index}`,
      label: decision.question,
      type: 'decision',
      metadata: {
        answer: decision.answer,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        hash: decision.hash
      }
    }))
  }
}