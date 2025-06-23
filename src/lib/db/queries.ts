import { db, eq, desc, and, sql } from './client'
import * as schema from '@/db/schema'
import { nanoid } from 'nanoid'

// Classification queries
export const classificationQueries = {
  // Create new classification
  async create(data: {
    productDescription: string
    userId?: string
  }) {
    const id = `clf_${nanoid()}`
    const now = new Date()
    
    const [classification] = await db().insert(schema.classifications).values({
      id,
      productDescription: data.productDescription,
      userId: data.userId || 'anonymous',
      status: 'in_progress',
      currentStep: 'gri_1',
      createdAt: now,
      updatedAt: now,
    }).returning()
    
    return classification
  },
  
  // Get classification by ID
  async getById(id: string) {
    const [classification] = await db()
      .select()
      .from(schema.classifications)
      .where(eq(schema.classifications.id, id))
      .limit(1)
    
    return classification
  },
  
  // Update classification
  async update(id: string, data: Partial<schema.Classification>) {
    const [updated] = await db()
      .update(schema.classifications)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(schema.classifications.id, id))
      .returning()
    
    return updated
  },
  
  // Get user's classifications
  async getByUser(userId: string, limit = 50, offset = 0) {
    const classifications = await db()
      .select()
      .from(schema.classifications)
      .where(eq(schema.classifications.userId, userId))
      .orderBy(desc(schema.classifications.createdAt))
      .limit(limit)
      .offset(offset)
    
    return classifications
  },
  
  // Complete classification
  async complete(id: string, finalHsCode: string, confidence: number) {
    const [completed] = await db()
      .update(schema.classifications)
      .set({
        status: 'completed',
        finalHsCode,
        confidence,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.classifications.id, id))
      .returning()
    
    return completed
  }
}

// Classification step queries
export const stepQueries = {
  // Record a new step
  async create(data: {
    classificationId: string
    step: string
    status?: string
  }) {
    const id = `step_${nanoid()}`
    
    const [step] = await db().insert(schema.classificationSteps).values({
      id,
      classificationId: data.classificationId,
      step: data.step,
      status: data.status || 'started',
      startedAt: new Date()
    }).returning()
    
    return step
  },
  
  // Complete a step
  async complete(stepId: string, data?: any) {
    const [completed] = await db()
      .update(schema.classificationSteps)
      .set({
        status: 'completed',
        completedAt: new Date(),
        data: data ? JSON.stringify(data) : null
      })
      .where(eq(schema.classificationSteps.id, stepId))
      .returning()
    
    return completed
  },
  
  // Get steps for classification
  async getByClassification(classificationId: string) {
    const steps = await db()
      .select()
      .from(schema.classificationSteps)
      .where(eq(schema.classificationSteps.classificationId, classificationId))
      .orderBy(schema.classificationSteps.startedAt)
    
    return steps
  }
}

// Decision queries
export const decisionQueries = {
  // Record a decision
  async create(data: {
    classificationId: string
    step: string
    question: string
    answer: string
    reasoning: string
    confidence: number
    metadata?: any
  }) {
    const id = `dec_${nanoid()}`
    
    const [decision] = await db().insert(schema.decisions).values({
      id,
      classificationId: data.classificationId,
      step: data.step,
      question: data.question,
      answer: data.answer,
      reasoning: data.reasoning,
      confidence: data.confidence,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      timestamp: new Date()
    }).returning()
    
    return decision
  },
  
  // Get decisions for classification
  async getByClassification(classificationId: string) {
    const decisions = await db()
      .select()
      .from(schema.decisions)
      .where(eq(schema.decisions.classificationId, classificationId))
      .orderBy(schema.decisions.timestamp)
    
    return decisions
  },
  
  // Get decision by step
  async getByStep(classificationId: string, step: string) {
    const [decision] = await db()
      .select()
      .from(schema.decisions)
      .where(
        and(
          eq(schema.decisions.classificationId, classificationId),
          eq(schema.decisions.step, step)
        )
      )
      .limit(1)
    
    return decision
  }
}

// Chat message queries
export const chatQueries = {
  // Save chat message
  async create(data: {
    classificationId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    metadata?: any
  }) {
    const id = `msg_${nanoid()}`
    
    const [message] = await db().insert(schema.chatMessages).values({
      id,
      classificationId: data.classificationId,
      role: data.role,
      content: data.content,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      createdAt: new Date()
    }).returning()
    
    return message
  },
  
  // Get chat history
  async getByClassification(classificationId: string, limit = 100) {
    const messages = await db()
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.classificationId, classificationId))
      .orderBy(desc(schema.chatMessages.createdAt))
      .limit(limit)
    
    // Reverse to get chronological order
    return messages.reverse()
  }
}

// Audit log queries
export const auditQueries = {
  // Create audit log entry
  async create(data: {
    classificationId: string
    action: string
    actor: string
    details: any
    ipAddress?: string
    userAgent?: string
  }) {
    const id = `audit_${nanoid()}`
    const timestamp = new Date()
    
    // Generate hash for integrity
    const hashData = JSON.stringify({
      action: data.action,
      actor: data.actor,
      details: data.details,
      timestamp: timestamp.toISOString()
    })
    const hash = btoa(hashData).substring(0, 32)
    
    const [entry] = await db().insert(schema.auditLogs).values({
      id,
      classificationId: data.classificationId,
      action: data.action,
      actor: data.actor,
      details: JSON.stringify(data.details),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      hash,
      timestamp
    }).returning()
    
    return entry
  },
  
  // Get audit trail
  async getByClassification(classificationId: string) {
    const entries = await db()
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.classificationId, classificationId))
      .orderBy(schema.auditLogs.timestamp)
    
    return entries
  }
}

// Utility queries
export const utilityQueries = {
  // Get classification statistics
  async getStats(userId?: string) {
    const baseQuery = userId 
      ? and(eq(schema.classifications.userId, userId))
      : undefined
    
    const stats = await db()
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(case when status = 'completed' then 1 end)`,
        inProgress: sql<number>`count(case when status = 'in_progress' then 1 end)`,
        avgConfidence: sql<number>`avg(confidence)`,
        avgDuration: sql<number>`avg(julianday(completed_at) - julianday(created_at)) * 24 * 60`
      })
      .from(schema.classifications)
      .where(baseQuery)
    
    return stats[0]
  },
  
  // Search classifications
  async search(query: string, userId?: string) {
    const searchConditions = and(
      userId ? eq(schema.classifications.userId, userId) : undefined,
      sql`product_description LIKE ${`%${query}%`} OR final_hs_code LIKE ${`%${query}%`}`
    )
    
    const results = await db()
      .select()
      .from(schema.classifications)
      .where(searchConditions)
      .orderBy(desc(schema.classifications.createdAt))
      .limit(20)
    
    return results
  }
}