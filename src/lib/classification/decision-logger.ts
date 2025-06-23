import { nanoid } from 'nanoid'

export interface DecisionLogEntry {
  id: string
  classificationId: string
  timestamp: Date
  step: string
  question: string
  answer: string
  reasoning: string
  confidence: number
  userId?: string
  metadata?: {
    formData?: Record<string, any>
    llmResponse?: {
      model: string
      temperature: number
      tokens: number
    }
    supportingEvidence?: string[]
    legalReferences?: string[]
  }
}

export interface AuditLogEntry {
  id: string
  classificationId: string
  timestamp: Date
  action: string
  actor: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  hash?: string // For integrity verification
}

export class DecisionLogger {
  private decisions: DecisionLogEntry[] = []
  private auditLog: AuditLogEntry[] = []
  private classificationId: string
  
  constructor(classificationId: string) {
    this.classificationId = classificationId
    this.logAuditEvent('classification_started', 'system', {
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * Log a decision made during classification
   */
  logDecision(params: Omit<DecisionLogEntry, 'id' | 'classificationId' | 'timestamp'>): DecisionLogEntry {
    const entry: DecisionLogEntry = {
      id: `dec_${nanoid()}`,
      classificationId: this.classificationId,
      timestamp: new Date(),
      ...params
    }
    
    this.decisions.push(entry)
    
    // Also create audit log entry
    this.logAuditEvent('decision_made', params.userId || 'system', {
      decisionId: entry.id,
      step: entry.step,
      confidence: entry.confidence
    })
    
    return entry
  }
  
  /**
   * Log an audit event (for legal compliance)
   */
  logAuditEvent(
    action: string, 
    actor: string, 
    details: Record<string, any>,
    request?: { ip?: string; userAgent?: string }
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit_${nanoid()}`,
      classificationId: this.classificationId,
      timestamp: new Date(),
      action,
      actor,
      details,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      hash: this.generateHash(action, actor, details)
    }
    
    this.auditLog.push(entry)
    
    // TODO: In production, immediately persist to immutable storage
    // this.persistToDatabase(entry)
    
    return entry
  }
  
  /**
   * Get all decisions for the classification
   */
  getDecisions(): DecisionLogEntry[] {
    return [...this.decisions]
  }
  
  /**
   * Get audit trail
   */
  getAuditTrail(): AuditLogEntry[] {
    return [...this.auditLog]
  }
  
  /**
   * Get decision by step
   */
  getDecisionByStep(step: string): DecisionLogEntry | undefined {
    return this.decisions.find(d => d.step === step)
  }
  
  /**
   * Calculate overall confidence score
   */
  getOverallConfidence(): number {
    if (this.decisions.length === 0) return 0
    
    const totalConfidence = this.decisions.reduce((sum, d) => sum + d.confidence, 0)
    return totalConfidence / this.decisions.length
  }
  
  /**
   * Generate a summary for legal reporting
   */
  generateLegalSummary(): {
    classificationId: string
    startTime: Date
    endTime: Date
    totalDecisions: number
    overallConfidence: number
    lowConfidenceDecisions: DecisionLogEntry[]
    auditEventCount: number
  } {
    const startTime = this.auditLog[0]?.timestamp || new Date()
    const endTime = this.auditLog[this.auditLog.length - 1]?.timestamp || new Date()
    
    return {
      classificationId: this.classificationId,
      startTime,
      endTime,
      totalDecisions: this.decisions.length,
      overallConfidence: this.getOverallConfidence(),
      lowConfidenceDecisions: this.decisions.filter(d => d.confidence < 0.7),
      auditEventCount: this.auditLog.length
    }
  }
  
  /**
   * Export for legal documentation
   */
  exportForLegalRecord(): {
    metadata: {
      classificationId: string
      exportedAt: string
      version: string
    }
    decisions: DecisionLogEntry[]
    auditTrail: AuditLogEntry[]
    summary: {
      classificationId: string
      startTime: Date
      endTime: Date
      totalDecisions: number
      overallConfidence: number
      lowConfidenceDecisions: DecisionLogEntry[]
      auditEventCount: number
    }
  } {
    return {
      metadata: {
        classificationId: this.classificationId,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      decisions: this.getDecisions(),
      auditTrail: this.getAuditTrail(),
      summary: this.generateLegalSummary()
    }
  }
  
  /**
   * Verify integrity of the log
   */
  verifyIntegrity(): boolean {
    // Verify each audit entry's hash
    for (const entry of this.auditLog) {
      const expectedHash = this.generateHash(entry.action, entry.actor, entry.details)
      if (entry.hash !== expectedHash) {
        return false
      }
    }
    return true
  }
  
  /**
   * Generate hash for integrity verification
   */
  private generateHash(action: string, actor: string, details: Record<string, any>): string {
    // Simplified hash - in production use proper cryptographic hash
    const data = JSON.stringify({ action, actor, details })
    return btoa(data).substring(0, 16)
  }
  
  /**
   * Mark classification as complete
   */
  completeClassification(finalHsCode: string, confidence: number): void {
    this.logAuditEvent('classification_completed', 'system', {
      finalHsCode,
      confidence,
      totalDecisions: this.decisions.length,
      duration: this.calculateDuration()
    })
  }
  
  /**
   * Calculate classification duration
   */
  private calculateDuration(): string {
    if (this.auditLog.length < 2) return '0 minutes'
    
    const start = this.auditLog[0].timestamp
    const end = this.auditLog[this.auditLog.length - 1].timestamp
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 60000)
    
    return `${minutes} minutes`
  }
}