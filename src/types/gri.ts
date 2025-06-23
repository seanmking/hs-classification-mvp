export type GRIStep =
  | 'gri_1'
  | 'gri_2a'
  | 'gri_2b'
  | 'gri_3a'
  | 'gri_3b'
  | 'gri_3c'
  | 'gri_4'
  | 'gri_5'
  | 'gri_6'

export interface GRIRule {
  id: GRIStep
  name: string
  description: string
  order: number
  requiredInputs: string[]
  decisionCriteria: string[]
  nextSteps: GRINextStep[]
}

export interface GRINextStep {
  condition: string
  nextRule: GRIStep | null
}

export interface GRIDecision {
  ruleId: GRIStep
  question: string
  answer: string
  reasoning: string
  confidence: number
  timestamp: Date
  metadata?: {
    hsCodeOptions?: string[]
    materialAnalysis?: Record<string, any>
    specificityComparison?: Array<{
      code: string
      description: string
      specificityScore: number
    }>
  }
}

export interface GRIContext {
  productDescription: string
  currentRule: GRIStep
  decisions: GRIDecision[]
  materials?: Array<{
    name: string
    percentage: number
    hsCode?: string
  }>
  additionalData?: Record<string, any>
}

export interface GRIValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
  missingInputs?: string[]
}

export interface GRIProgress {
  currentStep: GRIStep
  completedSteps: GRIStep[]
  percentComplete: number
  estimatedStepsRemaining: number
}

// Specific data structures for each GRI rule

export interface GRI1Data {
  productDescription: string
  primaryFunction: string
  applicableHeadings?: string[]
  sectionNotes?: string[]
  chapterNotes?: string[]
}

export interface GRI2aData {
  missingComponents: string[]
  hasEssentialCharacter: boolean
  functionalityAssessment: string
  canFunctionAsIntended: boolean
}

export interface GRI2bData {
  materials: Array<{
    name: string
    percentage: number
    hsCode?: string
    description?: string
  }>
  primaryMaterial: string
  determinationMethod: 'weight' | 'value' | 'volume' | 'surface_area'
}

export interface GRI3aData {
  possibleHeadings: Array<{
    code: string
    description: string
    specificityScore: number
  }>
  mostSpecificHeading: string
  specificityReasoning: string
}

export interface GRI3bData {
  components: Array<{
    name: string
    role: string
    importance: 'essential' | 'important' | 'auxiliary'
  }>
  essentialComponent: string
  characterAnalysis: string
  considerationFactors: {
    bulk?: boolean
    quantity?: boolean
    weight?: boolean
    value?: boolean
    roleInUse?: boolean
  }
}

export interface GRI3cData {
  applicableHeadings: string[]
  lastHeading: string
}

export interface GRI4Data {
  similarProducts: Array<{
    name: string
    hsCode: string
    similarityScore: number
    similarities: string[]
  }>
  mostSimilarProduct: string
  similarityAnalysis: string
}

export interface GRI5Data {
  packagingDescription: string
  isReusable: boolean
  isSpeciallyFitted: boolean
  givesEssentialCharacter: boolean
  packagingClassification: 'with_goods' | 'separately'
}

export interface GRI6Data {
  heading: string
  subheadingOptions: string[]
  selectedSubheading: string
  subheadingReasoning: string
  finalCode: string
}

export type GRIStepData =
  | GRI1Data
  | GRI2aData
  | GRI2bData
  | GRI3aData
  | GRI3bData
  | GRI3cData
  | GRI4Data
  | GRI5Data
  | GRI6Data