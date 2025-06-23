export interface ChatMessage {
  id: string
  classificationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: ChatMetadata
}

export interface ChatMetadata {
  confidence?: number
  griReference?: string
  step?: string
  suggestedAction?: SuggestedAction
  formData?: Record<string, any>
  llmMetadata?: {
    model: string
    temperature: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface SuggestedAction {
  type: 'form' | 'decision' | 'information' | 'next_step'
  details: FormAction | DecisionAction | InformationAction | NextStepAction
}

export interface FormAction {
  formType: string
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'select' | 'radio'
    required?: boolean
    options?: Array<{ value: string; label: string }>
    validation?: any
  }>
  prefillData?: Record<string, any>
}

export interface DecisionAction {
  question: string
  options: Array<{
    value: string
    label: string
    description?: string
    implications?: string
  }>
  multiSelect?: boolean
}

export interface InformationAction {
  questions: string[]
  requiredInfo: string[]
  examples?: string[]
}

export interface NextStepAction {
  nextRule: string
  reason: string
  skipRules?: string[]
}

export interface ChatContext {
  classificationId: string
  currentStep: string
  messages: ChatMessage[]
  productInfo: Record<string, any>
  decisions: Array<{
    step: string
    answer: string
    confidence: number
  }>
}

export interface ChatRequest {
  message: string
  classificationId: string
  currentStep: string
  context: ChatContext
}

export interface ChatResponse {
  message: string
  messageId: string
  suggestedAction?: SuggestedAction
  confidence: number
  griReference?: string
  requiresHumanReview?: boolean
}

export interface ConversationState {
  isTyping: boolean
  currentTopic?: string
  awaitingResponse: boolean
  formInProgress?: string
  lastInteraction: Date
}

export interface QuickAction {
  label: string
  value: string
  icon?: string
  category?: 'common' | 'step_specific' | 'help'
}

export interface ChatConfiguration {
  enableQuickActions: boolean
  enableVoiceInput: boolean
  autoSaveInterval: number // in seconds
  maxMessageLength: number
  showConfidenceScores: boolean
  showGRIReferences: boolean
}