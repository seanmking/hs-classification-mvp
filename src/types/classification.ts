export interface Classification {
  id: string
  productDescription: string
  userId: string
  status: 'in_progress' | 'completed' | 'needs_review' | 'archived'
  currentStep: string
  finalHsCode?: string
  confidence?: number
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  metadata?: Record<string, any>
}

export interface ClassificationStep {
  id: string
  classificationId: string
  step: string
  status: 'started' | 'completed' | 'skipped'
  startedAt: Date
  completedAt?: Date
  data?: Record<string, any>
}

export interface Decision {
  id: string
  classificationId: string
  step: string
  question: string
  answer: string
  reasoning: string
  confidence: number
  timestamp: Date
  metadata?: {
    supportingEvidence?: string[]
    legalReferences?: string[]
    formData?: Record<string, any>
    llmResponse?: {
      model: string
      temperature: number
      tokens: number
    }
  }
}

export interface Material {
  id?: string
  name: string
  percentage: number
  hsCode?: string
  description?: string
  determinationMethod?: 'weight' | 'value' | 'volume' | 'surface_area'
}

export interface ProductDetails {
  productName: string
  primaryFunction: string
  intendedUse: string
  targetMarket: string
  dimensions?: {
    length?: number
    width?: number
    height?: number
    weight?: number
    unit: 'cm' | 'inch' | 'kg' | 'lb'
  }
  countryOfOrigin: string
  isAssembled: 'yes' | 'no' | 'partially'
  additionalInfo?: string
}

export interface ClassificationContext {
  productDescription: string
  currentRule: string
  decisions: Decision[]
  materials?: Material[]
  productDetails?: ProductDetails
  additionalData?: Record<string, any>
}

export interface ClassificationResult {
  classificationId: string
  finalHsCode: string
  confidence: number
  appliedRules: string[]
  decisions: Decision[]
  auditTrail: AuditEntry[]
  legalSummary: LegalSummary
}

export interface AuditEntry {
  id: string
  classificationId: string
  action: string
  actor: string
  details: Record<string, any>
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  hash: string
}

export interface LegalSummary {
  classificationId: string
  startTime: Date
  endTime: Date
  totalDecisions: number
  overallConfidence: number
  lowConfidenceDecisions: Decision[]
  requiresExpertReview: boolean
}