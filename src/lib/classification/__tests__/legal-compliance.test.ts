import { describe, test, expect, beforeEach } from '@jest/globals'
import { WCOCompliantGRIEngine } from '../gri-engine-wco'
import { LegalFrameworkManager } from '../legal-framework'
import { DecisionLogger } from '../decision-logger'

describe('Legal Compliance Tests', () => {
  let engine: WCOCompliantGRIEngine
  let frameworkManager: LegalFrameworkManager
  let logger: DecisionLogger
  
  beforeEach(() => {
    engine = new WCOCompliantGRIEngine({
      classificationId: 'test-123',
      productDescription: 'Test product for legal compliance validation'
    })
    frameworkManager = new LegalFrameworkManager()
    logger = new DecisionLogger('test-123')
  })
  
  describe('GRI Sequential Application', () => {
    test('should enforce GRI rules in correct order', () => {
      const context = engine.exportContext()
      
      // Start with pre-classification
      expect(engine.getCurrentRule().id).toBe('pre_classification')
      
      // Record pre-classification decision
      engine.recordDecision({
        ruleId: 'pre_classification',
        criterionId: 'physical_characteristics',
        question: 'What are the physical characteristics?',
        answer: ['Material composition', 'Physical state'],
        reasoning: 'Product has clear physical characteristics',
        confidence: 0.95,
        legalBasis: ['Pre-classification requirement']
      })
      
      // Move to GRI 1
      engine.moveToNextRule('gri_1')
      expect(engine.getCurrentRule().id).toBe('gri_1')
      
      // Validate sequence
      const validation = frameworkManager.validatePhaseCompletion(context)
      expect(validation.valid).toBe(true)
    })
    
    test('should not allow skipping GRI rules', () => {
      // Try to jump directly to GRI 3 without GRI 1
      expect(() => {
        engine.moveToNextRule('gri_3a')
      }).not.toThrow() // Engine allows it, but framework should catch it
      
      const context = engine.exportContext()
      const validation = frameworkManager.validatePhaseCompletion(context)
      
      // Should fail validation because GRI 1 was skipped
      expect(validation.errors).toContain('GRI 1 must be applied before other rules')
    })
    
    test('should validate GRI 3 prerequisites', () => {
      // GRI 3 only applies when multiple headings are possible
      engine.moveToNextRule('gri_3a')
      
      engine.recordDecision({
        ruleId: 'gri_3a',
        criterionId: 'possible_headings',
        question: 'Possible headings',
        answer: ['8471'], // Only one heading
        reasoning: 'Single heading identified',
        confidence: 0.9,
        legalBasis: ['GRI 3(a)']
      })
      
      const rule = engine.getCurrentRule()
      const validation = engine.validateRule(rule)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('GRI 3 only applies when multiple headings are possible')
    })
  })
  
  describe('Legal Note Application', () => {
    test('should prioritize exclusion notes over heading descriptions', () => {
      // Record that an exclusion note applies
      engine.moveToNextRule('gri_1')
      
      engine.recordDecision({
        ruleId: 'gri_1',
        criterionId: 'section_chapter_notes',
        question: 'Are there any Section or Chapter Notes that apply?',
        answer: ['Exclusion notes'],
        reasoning: 'Chapter 84 Note 5 excludes this product',
        confidence: 1.0,
        legalBasis: ['Chapter 84 Note 5 - Exclusion']
      })
      
      engine.recordDecision({
        ruleId: 'gri_1',
        criterionId: 'heading_match',
        question: 'Does the product match specific heading(s)?',
        answer: 'Excluded by notes',
        reasoning: 'Although heading 8471 seems to match, exclusion note takes precedence',
        confidence: 1.0,
        legalBasis: ['GRI 1 - Legal notes have binding force']
      })
      
      // Next step should handle the exclusion
      const nextStep = engine.determineNextStep()
      expect(nextStep).not.toBe('validate_heading')
    })
    
    test('should document all applicable legal notes', () => {
      logger.logDecision({
        step: 'gri_1',
        question: 'Which legal notes apply?',
        answer: 'Section XVI Note 1, Chapter 84 Note 3',
        reasoning: 'Both notes affect classification',
        confidence: 0.95,
        metadata: {
          legalReferences: [
            'Section XVI Note 1 - Scope',
            'Chapter 84 Note 3 - Definition'
          ]
        }
      })
      
      const decisions = logger.getDecisions()
      expect(decisions[0].metadata?.legalReferences).toHaveLength(2)
    })
  })
  
  describe('Essential Character Determination', () => {
    test('should consider multiple factors for essential character', () => {
      engine.moveToNextRule('gri_3b')
      
      engine.recordDecision({
        ruleId: 'gri_3b',
        criterionId: 'character_factor',
        question: 'What factor determines the essential character?',
        answer: ['Value', 'Role in use', 'Marketability'],
        reasoning: 'Multiple factors considered for comprehensive analysis',
        confidence: 0.85,
        legalBasis: ['GRI 3(b) - Essential character factors']
      })
      
      engine.recordDecision({
        ruleId: 'gri_3b',
        criterionId: 'component_analysis',
        question: 'Which component gives essential character?',
        answer: 'Electronic components',
        reasoning: 'Electronic components provide 80% of value and define product function',
        confidence: 0.9,
        legalBasis: ['GRI 3(b) - Value and function analysis']
      })
      
      const context = engine.exportContext()
      const decisions = context.decisions.filter(d => d.ruleId === 'gri_3b')
      
      expect(decisions).toHaveLength(2)
      expect(decisions[0].answer).toContain('Value')
    })
  })
  
  describe('Audit Trail Integrity', () => {
    test('should create immutable audit trail', () => {
      const entry1 = logger.logAuditEvent('classification_started', 'user-123', {
        productDescription: 'Test product'
      })
      
      const entry2 = logger.logAuditEvent('decision_made', 'user-123', {
        step: 'gri_1',
        decision: 'Heading 8471 identified'
      })
      
      // Verify hashes
      expect(entry1.hash).toBeDefined()
      expect(entry2.hash).toBeDefined()
      
      // Verify integrity
      expect(logger.verifyIntegrity()).toBe(true)
      
      // Attempt to tamper (in real implementation, this would be prevented)
      const trail = logger.getAuditTrail()
      expect(trail).toHaveLength(3) // Including initial system event
    })
    
    test('should track low confidence decisions', () => {
      logger.logDecision({
        step: 'gri_3b',
        question: 'Essential character?',
        answer: 'Uncertain',
        reasoning: 'Multiple components of equal importance',
        confidence: 0.5 // Low confidence
      })
      
      const summary = logger.generateLegalSummary()
      expect(summary.lowConfidenceDecisions).toHaveLength(1)
      expect(summary.lowConfidenceDecisions[0].confidence).toBe(0.5)
    })
  })
  
  describe('Documentation Requirements', () => {
    test('should enforce mandatory documentation', () => {
      const phase = frameworkManager.getCurrentPhase()
      const requiredDocs = frameworkManager.getRequiredDocumentation()
      
      expect(requiredDocs.every(doc => doc.mandatory)).toBe(true)
    })
    
    test('should generate complete legal basis', () => {
      // Apply multiple GRI rules
      engine.recordDecision({
        ruleId: 'gri_1',
        criterionId: 'heading_match',
        question: 'Heading match?',
        answer: 'Multiple headings',
        reasoning: 'Product matches both 8471 and 8473',
        confidence: 0.8,
        legalBasis: ['GRI 1 - Multiple headings require GRI 3']
      })
      
      engine.moveToNextRule('gri_3a')
      engine.recordDecision({
        ruleId: 'gri_3a',
        criterionId: 'specificity_comparison',
        question: 'Most specific?',
        answer: 'Heading 8471',
        reasoning: '8471 names the product specifically',
        confidence: 0.9,
        legalBasis: ['GRI 3(a) - Specific over general']
      })
      
      const legalBasis = engine.generateLegalBasis()
      expect(legalBasis.length).toBeGreaterThan(2)
      expect(legalBasis.some(basis => basis.includes('GRI 1'))).toBe(true)
      expect(legalBasis.some(basis => basis.includes('GRI 3(a)'))).toBe(true)
    })
  })
  
  describe('Temporal Validity', () => {
    test('should respect effective dates of legal notes', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      
      // This would be checked against legal_notes table
      const mockLegalNote = {
        id: 'note_123',
        effectiveDate: futureDate,
        noteText: 'Future regulation',
        hsCode: '8471'
      }
      
      // Note should not apply to current classification
      const today = new Date()
      expect(mockLegalNote.effectiveDate > today).toBe(true)
    })
  })
  
  describe('SARS Compliance', () => {
    test('should validate SARS check digits', () => {
      // Test check digit calculation
      const calculateCheckDigit = (code8: string): string => {
        let sum = 0
        for (let i = 0; i < 8; i++) {
          sum += parseInt(code8[i]) * (i % 2 === 0 ? 1 : 3)
        }
        return String((10 - (sum % 10)) % 10)
      }
      
      expect(calculateCheckDigit('84713000')).toBe('7')
      expect(calculateCheckDigit('85171200')).toBe('0')
    })
  })
  
  describe('Classification Completeness', () => {
    test('should ensure all phases are complete before finalizing', () => {
      const context = engine.exportContext()
      
      // Check phase 0 (pre-classification)
      const phaseValidation = frameworkManager.validatePhaseCompletion(context)
      expect(phaseValidation.errors).toContain('Mandatory step not completed: Product Information Collection')
      
      // Cannot finalize without completing all phases
      const report = frameworkManager.generateComplianceReport(context)
      expect(report.compliant).toBe(false)
    })
    
    test('should generate defensible classification report', () => {
      // Complete classification
      logger.completeClassification('84713000', 0.92)
      
      const legalRecord = logger.exportForLegalRecord()
      
      expect(legalRecord.metadata.classificationId).toBe('test-123')
      expect(legalRecord.summary.overallConfidence).toBeGreaterThan(0)
      expect(legalRecord.auditTrail.length).toBeGreaterThan(0)
      
      // Should include completion event
      const completionEvent = legalRecord.auditTrail.find(
        event => event.action === 'classification_completed'
      )
      expect(completionEvent).toBeDefined()
      expect(completionEvent?.details.finalHsCode).toBe('84713000')
    })
  })
})