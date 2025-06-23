// Re-export types from the schema for convenience
export type {
  Classification,
  NewClassification,
  ClassificationStep,
  NewClassificationStep,
  Decision,
  NewDecision,
  ChatMessage,
  NewChatMessage,
  AuditLog,
  NewAuditLog,
  Material,
  NewMaterial,
  FormSubmission,
  NewFormSubmission,
  HSCode,
  NewHSCode,
  User,
  NewUser,
  Session,
  NewSession,
} from '@/db/schema'

// Additional database-related types

export interface DatabaseConfig {
  url: string
  poolSize?: number
  timeout?: number
}

export interface QueryResult<T> {
  data: T | null
  error: Error | null
}

export interface PaginationParams {
  page: number
  limit: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchParams {
  query: string
  fields?: string[]
  filters?: Record<string, any>
  limit?: number
}

export interface BatchOperation<T> {
  operation: 'insert' | 'update' | 'delete'
  data: T | T[]
  where?: Record<string, any>
}

export interface TransactionResult {
  success: boolean
  error?: Error
  affectedRows?: number
}

export interface DatabaseStats {
  totalClassifications: number
  completedClassifications: number
  inProgressClassifications: number
  totalDecisions: number
  totalUsers: number
  averageConfidence: number
  averageCompletionTime: number // in minutes
}

export interface BackupMetadata {
  backupId: string
  createdAt: Date
  size: number
  tablesIncluded: string[]
  recordCount: Record<string, number>
}