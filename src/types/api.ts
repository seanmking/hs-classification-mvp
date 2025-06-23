// Auto-generated API response types
// Generated on: 2025-06-23T11:25:06.771Z

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    timestamp: string
    version: string
  }
}

export interface ClassificationAPIResponse {
  classification: {
    id: string
    productDescription: string
    status: string
    currentStep: string
    finalHsCode?: string
    confidence?: number
  }
}

export interface ChatAPIResponse {
  message: string
  messageId: string
  suggestedAction?: any
  confidence: number
  griReference?: string
}