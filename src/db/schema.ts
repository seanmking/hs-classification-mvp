import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// TODO: Define SQLite schema using Drizzle ORM
// Tables needed:
// - classifications: Main classification records
// - classification_steps: GRI application steps
// - decisions: Individual decisions made
// - chat_messages: Chat conversation history
// - audit_logs: Immutable audit trail

// Main classification table
export const classifications = sqliteTable('classifications', {
  id: text('id').primaryKey(),
  productDescription: text('product_description').notNull(),
  userId: text('user_id').notNull().default('anonymous'),
  status: text('status').notNull().default('in_progress'), // in_progress, completed, needs_review, archived
  currentStep: text('current_step').notNull().default('gri_1'),
  finalHsCode: text('final_hs_code'),
  confidence: real('confidence'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  metadata: text('metadata'), // JSON string for additional data
})

export type Classification = typeof classifications.$inferSelect
export type NewClassification = typeof classifications.$inferInsert

// Classification steps table (tracks GRI progression)
export const classificationSteps = sqliteTable('classification_steps', {
  id: text('id').primaryKey(),
  classificationId: text('classification_id').notNull().references(() => classifications.id),
  step: text('step').notNull(), // gri_1, gri_2a, etc.
  status: text('status').notNull().default('started'), // started, completed, skipped
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  data: text('data'), // JSON string for step-specific data
})

export type ClassificationStep = typeof classificationSteps.$inferSelect
export type NewClassificationStep = typeof classificationSteps.$inferInsert

// Decisions table (records every decision made)
export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  classificationId: text('classification_id').notNull().references(() => classifications.id),
  step: text('step').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  reasoning: text('reasoning').notNull(),
  confidence: real('confidence').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  metadata: text('metadata'), // JSON string for supporting evidence, references, etc.
})

export type Decision = typeof decisions.$inferSelect
export type NewDecision = typeof decisions.$inferInsert

// Chat messages table
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  classificationId: text('classification_id').notNull().references(() => classifications.id),
  role: text('role').notNull(), // user, assistant, system
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON string for confidence, suggestions, etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert

// Audit logs table (immutable audit trail)
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  classificationId: text('classification_id').notNull().references(() => classifications.id),
  action: text('action').notNull(), // classification_created, step_started, decision_made, etc.
  actor: text('actor').notNull(), // user_id or 'system'
  details: text('details').notNull(), // JSON string with action details
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  hash: text('hash').notNull(), // For integrity verification
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert

// Materials table (for tracking product composition)
export const materials = sqliteTable('materials', {
  id: text('id').primaryKey(),
  classificationId: text('classification_id').notNull().references(() => classifications.id),
  name: text('name').notNull(),
  percentage: real('percentage').notNull(),
  hsCode: text('hs_code'),
  description: text('description'),
  determinationMethod: text('determination_method').notNull(), // weight, value, volume, surface_area
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type Material = typeof materials.$inferSelect
export type NewMaterial = typeof materials.$inferInsert

// Form submissions table (for tracking form data)
export const formSubmissions = sqliteTable('form_submissions', {
  id: text('id').primaryKey(),
  classificationId: text('classification_id').notNull().references(() => classifications.id),
  formType: text('form_type').notNull(),
  data: text('data').notNull(), // JSON string of form data
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type FormSubmission = typeof formSubmissions.$inferSelect
export type NewFormSubmission = typeof formSubmissions.$inferInsert

// HS codes reference table (could be populated with official HS codes)
export const hsCodes = sqliteTable('hs_codes', {
  code: text('code').primaryKey(),
  description: text('description').notNull(),
  level: text('level').notNull(), // chapter, heading, subheading, tariff
  parentCode: text('parent_code'),
  notes: text('notes'), // JSON array of notes
  exclusions: text('exclusions'), // JSON array of exclusions
})

export type HSCode = typeof hsCodes.$inferSelect
export type NewHSCode = typeof hsCodes.$inferInsert

// Users table (for user management)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  name: text('name'),
  role: text('role').notNull().default('user'), // user, admin, expert
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// Sessions table (for user sessions)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

// Create indexes for better query performance
export const indexes = {
  // Classification indexes
  classificationUserIdIdx: sql`CREATE INDEX IF NOT EXISTS classification_user_id_idx ON classifications(user_id)`,
  classificationStatusIdx: sql`CREATE INDEX IF NOT EXISTS classification_status_idx ON classifications(status)`,
  classificationCreatedAtIdx: sql`CREATE INDEX IF NOT EXISTS classification_created_at_idx ON classifications(created_at)`,
  
  // Step indexes
  stepClassificationIdIdx: sql`CREATE INDEX IF NOT EXISTS step_classification_id_idx ON classification_steps(classification_id)`,
  
  // Decision indexes
  decisionClassificationIdIdx: sql`CREATE INDEX IF NOT EXISTS decision_classification_id_idx ON decisions(classification_id)`,
  decisionStepIdx: sql`CREATE INDEX IF NOT EXISTS decision_step_idx ON decisions(step)`,
  
  // Chat message indexes
  chatClassificationIdIdx: sql`CREATE INDEX IF NOT EXISTS chat_classification_id_idx ON chat_messages(classification_id)`,
  
  // Audit log indexes
  auditClassificationIdIdx: sql`CREATE INDEX IF NOT EXISTS audit_classification_id_idx ON audit_logs(classification_id)`,
  auditTimestampIdx: sql`CREATE INDEX IF NOT EXISTS audit_timestamp_idx ON audit_logs(timestamp)`,
}

// SARS-compliant schema additions

export const hsCodeSections = sqliteTable('hs_code_sections', {
  code: text('code').primaryKey(),
  romanNumeral: text('roman_numeral').notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const hsCodesEnhanced = sqliteTable('hs_codes_enhanced', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  code2Digit: text('code_2_digit'),
  code4Digit: text('code_4_digit'),
  code6Digit: text('code_6_digit'),
  code8Digit: text('code_8_digit'),
  checkDigit: text('check_digit'),
  description: text('description').notNull(),
  level: text('level').notNull(),
  parentCode: text('parent_code'),
  sectionCode: text('section_code'),
  tariffRate: real('tariff_rate'),
  unitOfMeasure: text('unit_of_measure'),
  statisticalUnit: text('statistical_unit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const legalNotes = sqliteTable('legal_notes', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  hsCode: text('hs_code').notNull(),
  noteType: text('note_type').notNull(),
  noteNumber: text('note_number'),
  noteText: text('note_text').notNull(),
  legalReference: text('legal_reference').notNull(),
  effectiveDate: integer('effective_date', { mode: 'timestamp' }).notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  priority: integer('priority').notNull().default(50),
  bindingCountries: text('binding_countries').notNull().default('["*"]'),
  examples: text('examples'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const sarsAdditionalNotes = sqliteTable('sars_additional_notes', {
  id: text('id').primaryKey(),
  chapterCode: text('chapter_code').notNull(),
  noteType: text('note_type').notNull(),
  noteNumber: integer('note_number').notNull(),
  noteText: text('note_text').notNull(),
  conditions: text('conditions'),
  effectiveDate: integer('effective_date', { mode: 'timestamp' }).notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const sectionChapterMapping = sqliteTable('section_chapter_mapping', {
  sectionCode: text('section_code').notNull(),
  chapterCode: text('chapter_code').notNull(),
  fromChapter: integer('from_chapter').notNull(),
  toChapter: integer('to_chapter').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const classificationLegalNotes = sqliteTable('classification_legal_notes', {
  id: text('id').primaryKey(),
  classificationId: text('classification_id').notNull().references(() => classifications.id),
  legalNoteId: text('legal_note_id').notNull(),
  applied: integer('applied', { mode: 'boolean' }).notNull().default(false),
  applicationReason: text('application_reason'),
  excludedReason: text('excluded_reason'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const sarsDeterminations = sqliteTable('sars_determinations', {
  id: text('id').primaryKey(),
  determinationNumber: text('determination_number').unique().notNull(),
  hsCode: text('hs_code').notNull(),
  productDescription: text('product_description').notNull(),
  decision: text('decision').notNull(),
  reasoning: text('reasoning').notNull(),
  effectiveDate: integer('effective_date', { mode: 'timestamp' }).notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  appealStatus: text('appeal_status'),
  legalBasis: text('legal_basis').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const legalNoteVersions = sqliteTable('legal_note_versions', {
  id: text('id').primaryKey(),
  legalNoteId: text('legal_note_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  changeType: text('change_type').notNull(),
  changeDescription: text('change_description').notNull(),
  changedBy: text('changed_by').notNull(),
  changedAt: integer('changed_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  previousText: text('previous_text'),
  newText: text('new_text'),
})

// Export types
export type HSCodeSection = typeof hsCodeSections.$inferSelect
export type NewHSCodeSection = typeof hsCodeSections.$inferInsert

export type HSCodeEnhanced = typeof hsCodesEnhanced.$inferSelect
export type NewHSCodeEnhanced = typeof hsCodesEnhanced.$inferInsert

export type LegalNote = typeof legalNotes.$inferSelect
export type NewLegalNote = typeof legalNotes.$inferInsert

export type SARSAdditionalNote = typeof sarsAdditionalNotes.$inferSelect
export type NewSARSAdditionalNote = typeof sarsAdditionalNotes.$inferInsert

export type SectionChapterMapping = typeof sectionChapterMapping.$inferSelect
export type NewSectionChapterMapping = typeof sectionChapterMapping.$inferInsert

export type ClassificationLegalNote = typeof classificationLegalNotes.$inferSelect
export type NewClassificationLegalNote = typeof classificationLegalNotes.$inferInsert

export type SARSDetermination = typeof sarsDeterminations.$inferSelect
export type NewSARSDetermination = typeof sarsDeterminations.$inferInsert

export type LegalNoteVersion = typeof legalNoteVersions.$inferSelect
export type NewLegalNoteVersion = typeof legalNoteVersions.$inferInsert