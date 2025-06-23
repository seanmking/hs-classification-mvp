import { z } from 'zod'

// Re-export enhanced types from WCO-compliant engine
export {
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
  ExcludedHeading,
  COMPLETE_GRI_RULES as GRI_RULES
} from './gri-engine-wco'

// Import the WCO-compliant engine
import { WCOCompliantGRIEngine } from './gri-engine-wco'

// Export the enhanced engine as the default GRIEngine
export class GRIEngine extends WCOCompliantGRIEngine {
  constructor(initialContext: Partial<import('./gri-engine-wco').GRIContext>) {
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
  
  private buildTreeFromDecisions(decisions: import('./gri-engine-wco').GRIDecision[]): any[] {
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