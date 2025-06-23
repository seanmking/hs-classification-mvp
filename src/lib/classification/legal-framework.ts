import { GRIRule, GRIDecision, GRIContext } from './gri-engine'
import { COMPLETE_GRI_RULES } from './gri-engine-wco'

// Legal Framework Types
export interface ClassificationPhase {
  id: string
  name: string
  description: string
  requiredSteps: ClassificationStep[]
  validationRules: ValidationRequirement[]
  documentationRequirements: DocumentationRequirement[]
}

export interface ClassificationStep {
  id: string
  name: string
  description: string
  griRule?: string
  mandatory: boolean
  decisionPoints: DecisionPoint[]
  legalBasis: string
}

export interface DecisionPoint {
  id: string
  question: string
  possibleOutcomes: Outcome[]
  documentation: string[]
  legalReference: string
}

export interface Outcome {
  value: string
  nextAction: string
  reasoning: string
}

export interface ValidationRequirement {
  id: string
  description: string
  validator: (context: GRIContext) => boolean
  errorMessage: string
  severity: 'critical' | 'warning' | 'info'
}

export interface DocumentationRequirement {
  id: string
  type: 'decision' | 'evidence' | 'reasoning' | 'reference'
  description: string
  mandatory: boolean
  template?: string
}

// Complete Classification Logic Flow from WCO Documentation
export const CLASSIFICATION_PHASES: ClassificationPhase[] = [
  {
    id: 'phase_0',
    name: 'Pre-Classification Analysis',
    description: 'Initial product analysis and information gathering phase',
    requiredSteps: [
      {
        id: 'step_0.1',
        name: 'Product Information Collection',
        description: 'Gather comprehensive product information',
        griRule: 'pre_classification',
        mandatory: true,
        decisionPoints: [
          {
            id: 'dp_0.1.1',
            question: 'Is the product description complete?',
            possibleOutcomes: [
              {
                value: 'Yes',
                nextAction: 'Proceed to material analysis',
                reasoning: 'Sufficient information for classification'
              },
              {
                value: 'No',
                nextAction: 'Request additional information',
                reasoning: 'Incomplete information risks misclassification'
              }
            ],
            documentation: ['Product specifications', 'Technical datasheets', 'Commercial invoices'],
            legalReference: 'Pre-classification requirement for accurate determination'
          }
        ],
        legalBasis: 'Comprehensive product analysis is prerequisite for defensible classification'
      },
      {
        id: 'step_0.2',
        name: 'Material Composition Analysis',
        description: 'Determine material composition and percentages',
        mandatory: false,
        decisionPoints: [
          {
            id: 'dp_0.2.1',
            question: 'Is the product composed of multiple materials?',
            possibleOutcomes: [
              {
                value: 'Single material',
                nextAction: 'Document material and proceed',
                reasoning: 'Simple classification by material'
              },
              {
                value: 'Multiple materials',
                nextAction: 'Analyze composition percentages',
                reasoning: 'May require GRI 2(b) or 3(b) application'
              }
            ],
            documentation: ['Material test reports', 'Composition certificates'],
            legalReference: 'Material composition affects GRI application'
          }
        ],
        legalBasis: 'Material composition determines applicable GRI rules'
      },
      {
        id: 'step_0.3',
        name: 'Commercial Context Analysis',
        description: 'Understand commercial designation and use',
        mandatory: true,
        decisionPoints: [
          {
            id: 'dp_0.3.1',
            question: 'What is the commercial designation?',
            possibleOutcomes: [
              {
                value: 'Trade name exists',
                nextAction: 'Document trade name and industry usage',
                reasoning: 'Trade names may indicate specific classification'
              },
              {
                value: 'Generic product',
                nextAction: 'Focus on functional characteristics',
                reasoning: 'Classification by function and composition'
              }
            ],
            documentation: ['Trade catalogs', 'Industry standards', 'Marketing materials'],
            legalReference: 'Commercial designation influences classification'
          }
        ],
        legalBasis: 'Commercial reality principle in classification'
      }
    ],
    validationRules: [
      {
        id: 'vr_0.1',
        description: 'Product description must be comprehensive',
        validator: (context) => context.productDescription.length >= 50,
        errorMessage: 'Product description too brief for accurate classification',
        severity: 'critical'
      },
      {
        id: 'vr_0.2',
        description: 'Physical characteristics must be documented',
        validator: (context) => context.physicalCharacteristics !== undefined,
        errorMessage: 'Physical characteristics missing',
        severity: 'warning'
      }
    ],
    documentationRequirements: [
      {
        id: 'dr_0.1',
        type: 'evidence',
        description: 'Product samples or detailed photos',
        mandatory: false,
        template: 'Physical evidence supporting product description'
      },
      {
        id: 'dr_0.2',
        type: 'reference',
        description: 'Technical specifications or datasheets',
        mandatory: true,
        template: 'Official product documentation from manufacturer'
      }
    ]
  },
  {
    id: 'phase_1',
    name: 'GRI Rule Application',
    description: 'Sequential application of General Rules for Interpretation',
    requiredSteps: [
      {
        id: 'step_1.1',
        name: 'GRI 1 - Heading and Notes Analysis',
        description: 'Classification by terms of headings and section/chapter notes',
        griRule: 'gri_1',
        mandatory: true,
        decisionPoints: [
          {
            id: 'dp_1.1.1',
            question: 'Do any section or chapter notes exclude this product?',
            possibleOutcomes: [
              {
                value: 'Yes - Excluded',
                nextAction: 'Document exclusion and find alternative',
                reasoning: 'Legal notes take precedence over heading descriptions'
              },
              {
                value: 'No - Not excluded',
                nextAction: 'Proceed to heading analysis',
                reasoning: 'Product not excluded by legal notes'
              }
            ],
            documentation: ['Relevant section notes', 'Chapter notes', 'Exclusion analysis'],
            legalReference: 'GRI 1 - Legal notes have binding force'
          },
          {
            id: 'dp_1.1.2',
            question: 'Does the product match a specific heading?',
            possibleOutcomes: [
              {
                value: 'Single heading match',
                nextAction: 'Validate and proceed to GRI 6',
                reasoning: 'Clear heading match found'
              },
              {
                value: 'Multiple headings possible',
                nextAction: 'Apply GRI 3 for resolution',
                reasoning: 'Multiple headings require specificity analysis'
              },
              {
                value: 'No clear match',
                nextAction: 'Detailed product analysis required',
                reasoning: 'No obvious heading - analyze characteristics'
              }
            ],
            documentation: ['Heading analysis', 'Match reasoning'],
            legalReference: 'GRI 1 - Terms of headings'
          }
        ],
        legalBasis: 'GRI 1 is the primary rule - headings and notes determine classification'
      },
      {
        id: 'step_1.2',
        name: 'Product State Analysis',
        description: 'Determine if GRI 2 rules apply',
        griRule: 'analyze_product',
        mandatory: false,
        decisionPoints: [
          {
            id: 'dp_1.2.1',
            question: 'What is the state of the product?',
            possibleOutcomes: [
              {
                value: 'Complete',
                nextAction: 'Continue with standard classification',
                reasoning: 'No GRI 2(a) consideration needed'
              },
              {
                value: 'Incomplete/Unfinished',
                nextAction: 'Apply GRI 2(a)',
                reasoning: 'Must determine if has essential character'
              },
              {
                value: 'Multiple materials',
                nextAction: 'Apply GRI 2(b)',
                reasoning: 'Mixture/composite requires analysis'
              }
            ],
            documentation: ['Assembly state', 'Completeness assessment'],
            legalReference: 'Determines GRI 2 applicability'
          }
        ],
        legalBasis: 'Product state determines classification approach'
      }
    ],
    validationRules: [
      {
        id: 'vr_1.1',
        description: 'Section/chapter notes must be checked first',
        validator: (context) => {
          const gri1Decision = context.decisions.find(d => d.ruleId === 'gri_1')
          return gri1Decision !== undefined
        },
        errorMessage: 'GRI 1 must be applied before other rules',
        severity: 'critical'
      },
      {
        id: 'vr_1.2',
        description: 'Rules must be applied sequentially',
        validator: (context) => {
          const ruleOrder = ['gri_1', 'gri_2a', 'gri_2b', 'gri_3a', 'gri_3b', 'gri_3c', 'gri_4', 'gri_5a', 'gri_5b', 'gri_6']
          const appliedRules = context.decisions.map(d => d.ruleId)
          
          for (let i = 1; i < appliedRules.length; i++) {
            const prevIndex = ruleOrder.indexOf(appliedRules[i - 1])
            const currIndex = ruleOrder.indexOf(appliedRules[i])
            if (currIndex < prevIndex) return false
          }
          return true
        },
        errorMessage: 'GRI rules not applied in correct sequence',
        severity: 'critical'
      }
    ],
    documentationRequirements: [
      {
        id: 'dr_1.1',
        type: 'decision',
        description: 'Document each GRI rule application',
        mandatory: true,
        template: 'Rule: [X], Decision: [Y], Reasoning: [Z]'
      },
      {
        id: 'dr_1.2',
        type: 'reasoning',
        description: 'Explain why each rule was applied or skipped',
        mandatory: true
      }
    ]
  },
  {
    id: 'phase_2',
    name: 'Classification Validation',
    description: 'Validate and document the final classification',
    requiredSteps: [
      {
        id: 'step_2.1',
        name: 'Legal Note Compliance',
        description: 'Verify compliance with all applicable legal notes',
        mandatory: true,
        decisionPoints: [
          {
            id: 'dp_2.1.1',
            question: 'Does the classification comply with all legal notes?',
            possibleOutcomes: [
              {
                value: 'Yes - Compliant',
                nextAction: 'Proceed to final validation',
                reasoning: 'No legal note violations'
              },
              {
                value: 'No - Non-compliant',
                nextAction: 'Review and correct classification',
                reasoning: 'Legal note violation must be resolved'
              }
            ],
            documentation: ['Legal note checklist', 'Compliance verification'],
            legalReference: 'Legal notes are binding'
          }
        ],
        legalBasis: 'Final classification must comply with all legal notes'
      },
      {
        id: 'step_2.2',
        name: 'Documentation Completeness',
        description: 'Ensure all required documentation is complete',
        mandatory: true,
        decisionPoints: [
          {
            id: 'dp_2.2.1',
            question: 'Is all required documentation complete?',
            possibleOutcomes: [
              {
                value: 'Yes - Complete',
                nextAction: 'Generate final report',
                reasoning: 'Documentation sufficient for defense'
              },
              {
                value: 'No - Incomplete',
                nextAction: 'Identify and complete missing documentation',
                reasoning: 'Incomplete documentation risks dispute'
              }
            ],
            documentation: ['Documentation checklist', 'Audit trail'],
            legalReference: 'Documentation required for legal defensibility'
          }
        ],
        legalBasis: 'Complete documentation essential for customs compliance'
      }
    ],
    validationRules: [
      {
        id: 'vr_2.1',
        description: 'All decisions must be documented',
        validator: (context) => {
          return context.decisions.every(d => d.reasoning && d.reasoning.length > 10)
        },
        errorMessage: 'Some decisions lack proper documentation',
        severity: 'critical'
      }
    ],
    documentationRequirements: [
      {
        id: 'dr_2.1',
        type: 'reference',
        description: 'Complete audit trail of classification process',
        mandatory: true
      }
    ]
  }
]

// Legal Framework Manager
export class LegalFrameworkManager {
  private currentPhase: ClassificationPhase
  private completedSteps: Set<string> = new Set()
  
  constructor() {
    this.currentPhase = CLASSIFICATION_PHASES[0]
  }
  
  getCurrentPhase(): ClassificationPhase {
    return this.currentPhase
  }
  
  validatePhaseCompletion(context: GRIContext): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check all mandatory steps are complete
    for (const step of this.currentPhase.requiredSteps) {
      if (step.mandatory && !this.completedSteps.has(step.id)) {
        errors.push(`Mandatory step not completed: ${step.name}`)
      }
    }
    
    // Run validation rules
    for (const rule of this.currentPhase.validationRules) {
      if (!rule.validator(context)) {
        errors.push(`${rule.severity.toUpperCase()}: ${rule.errorMessage}`)
      }
    }
    
    return { valid: errors.length === 0, errors }
  }
  
  markStepComplete(stepId: string): void {
    this.completedSteps.add(stepId)
  }
  
  canProceedToNextPhase(context: GRIContext): boolean {
    const validation = this.validatePhaseCompletion(context)
    return validation.valid
  }
  
  moveToNextPhase(): boolean {
    const currentIndex = CLASSIFICATION_PHASES.findIndex(p => p.id === this.currentPhase.id)
    if (currentIndex < CLASSIFICATION_PHASES.length - 1) {
      this.currentPhase = CLASSIFICATION_PHASES[currentIndex + 1]
      this.completedSteps.clear()
      return true
    }
    return false
  }
  
  getRequiredDocumentation(): DocumentationRequirement[] {
    return this.currentPhase.documentationRequirements.filter(req => req.mandatory)
  }
  
  getAllDecisionPoints(): DecisionPoint[] {
    const decisionPoints: DecisionPoint[] = []
    
    for (const phase of CLASSIFICATION_PHASES) {
      for (const step of phase.requiredSteps) {
        decisionPoints.push(...step.decisionPoints)
      }
    }
    
    return decisionPoints
  }
  
  validateDecisionCoverage(decisions: GRIDecision[]): { 
    covered: string[]
    missing: string[] 
  } {
    const allDecisionPoints = this.getAllDecisionPoints()
    const coveredIds = new Set(decisions.map(d => d.criterionId))
    
    const covered = allDecisionPoints
      .filter(dp => coveredIds.has(dp.id))
      .map(dp => dp.id)
    
    const missing = allDecisionPoints
      .filter(dp => !coveredIds.has(dp.id))
      .map(dp => dp.id)
    
    return { covered, missing }
  }
  
  generateComplianceReport(context: GRIContext): {
    compliant: boolean
    phases: Array<{
      phase: string
      status: 'complete' | 'incomplete' | 'not_started'
      errors: string[]
    }>
    overallErrors: string[]
  } {
    const report = {
      compliant: true,
      phases: [] as any[],
      overallErrors: [] as string[]
    }
    
    for (const phase of CLASSIFICATION_PHASES) {
      const phaseStatus = {
        phase: phase.name,
        status: 'not_started' as 'complete' | 'incomplete' | 'not_started',
        errors: [] as string[]
      }
      
      // Check if phase has been started
      const phaseDecisions = context.decisions.filter(d => {
        const step = phase.requiredSteps.find(s => s.griRule === d.ruleId)
        return step !== undefined
      })
      
      if (phaseDecisions.length > 0) {
        // Phase has been started
        const validation = this.validatePhaseCompletion(context)
        
        if (validation.valid) {
          phaseStatus.status = 'complete'
        } else {
          phaseStatus.status = 'incomplete'
          phaseStatus.errors = validation.errors
          report.compliant = false
        }
      }
      
      report.phases.push(phaseStatus)
    }
    
    // Overall validation
    if (!this.validateGRISequence(context)) {
      report.overallErrors.push('GRI rules not applied in correct sequence')
      report.compliant = false
    }
    
    return report
  }
  
  private validateGRISequence(context: GRIContext): boolean {
    const ruleOrder = Object.values(COMPLETE_GRI_RULES)
      .sort((a, b) => a.order - b.order)
      .map(r => r.id)
    
    const appliedRules = context.decisions.map(d => d.ruleId)
    
    let lastIndex = -1
    for (const rule of appliedRules) {
      const currentIndex = ruleOrder.indexOf(rule)
      if (currentIndex < lastIndex) {
        return false
      }
      lastIndex = currentIndex
    }
    
    return true
  }
}