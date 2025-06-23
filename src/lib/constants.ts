// Auto-generated constants
// Generated on: 2025-06-23T11:25:06.772Z

export const APP_CONFIG = {
  name: 'HS Classification Assistant',
  version: '0.1.0',
  api: {
    timeout: 30000,
    retryAttempts: 3,
  },
  classification: {
    maxSteps: 9,
    confidenceThreshold: 0.7,
    expertReviewThreshold: 0.5,
  },
  chat: {
    maxMessageLength: 2000,
    maxHistorySize: 100,
  },
  ui: {
    toastDuration: 5000,
    autoSaveInterval: 30000,
  },
} as const

export const GRI_STEPS = [
  'gri_1',
  'gri_2a',
  'gri_2b',
  'gri_3a',
  'gri_3b',
  'gri_3c',
  'gri_4',
  'gri_5',
  'gri_6',
] as const

export const CLASSIFICATION_STATUS = {
  IDLE: 'idle',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  NEEDS_REVIEW: 'needs_review',
  ARCHIVED: 'archived',
} as const