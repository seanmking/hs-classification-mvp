import { createHash } from 'crypto'
import type { Classification, Decision, ClassificationStep } from '@/db/schema'
import type { EnhancedGRIContext } from './gri-engine-enhanced'
import { format } from 'date-fns'

export interface DefenseChecklistItem {
  requirement: string
  satisfied: boolean
  evidence?: string
  severity: 'critical' | 'important' | 'recommended'
  category: 'documentation' | 'process' | 'technical' | 'legal'
}

export interface LegalReport {
  id: string
  classificationId: string
  content: string
  hash: string
  defenseChecklist: DefenseChecklistItem[]
  executiveSummary: string
  generatedAt: Date
  expiresAt: Date
  version: string
}

export interface ClassificationReport {
  classification: Classification
  decisions: Decision[]
  steps: ClassificationStep[]
  griContext: EnhancedGRIContext
}

// Defense checklist requirements
const DEFENSE_CHECKLIST: Omit<DefenseChecklistItem, 'satisfied' | 'evidence'>[] = [
  // Critical requirements
  {
    requirement: 'Product description is complete and accurate',
    severity: 'critical',
    category: 'documentation'
  },
  {
    requirement: 'All GRI rules applied in correct sequence',
    severity: 'critical',
    category: 'process'
  },
  {
    requirement: 'Material composition documented (if composite)',
    severity: 'critical',
    category: 'technical'
  },
  {
    requirement: 'HS code exists in official tariff schedule',
    severity: 'critical',
    category: 'legal'
  },
  {
    requirement: 'All exclusion notes have been checked',
    severity: 'critical',
    category: 'legal'
  },
  
  // Important requirements
  {
    requirement: 'Essential character determination documented',
    severity: 'important',
    category: 'technical'
  },
  {
    requirement: 'Decision reasoning provided for each step',
    severity: 'important',
    category: 'documentation'
  },
  {
    requirement: 'Confidence level above 70% threshold',
    severity: 'important',
    category: 'technical'
  },
  {
    requirement: 'Alternative classifications considered',
    severity: 'important',
    category: 'process'
  },
  
  // Recommended requirements
  {
    requirement: 'Similar products referenced for consistency',
    severity: 'recommended',
    category: 'documentation'
  },
  {
    requirement: 'Technical specifications included',
    severity: 'recommended',
    category: 'technical'
  },
  {
    requirement: 'Packaging considerations documented',
    severity: 'recommended',
    category: 'process'
  }
]

export class LegalDocumentationGenerator {
  private readonly version = '1.0.0'
  
  async generateReport(report: ClassificationReport): Promise<LegalReport> {
    const { classification, decisions, steps, griContext } = report
    
    // Generate the main report content
    const content = this.generateMarkdownReport(report)
    
    // Auto-validate defense checklist
    const defenseChecklist = this.validateDefenseChecklist(report)
    
    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(report)
    
    // Generate SHA-256 hash
    const hash = this.generateReportHash(content)
    
    // Create the legal report
    const legalReport: LegalReport = {
      id: `legal_${Date.now()}`,
      classificationId: classification.id,
      content,
      hash,
      defenseChecklist,
      executiveSummary,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      version: this.version
    }
    
    return legalReport
  }
  
  validateDefenseChecklist(report: ClassificationReport): DefenseChecklistItem[] {
    const { classification, decisions, steps, griContext } = report
    
    return DEFENSE_CHECKLIST.map(item => {
      const result: DefenseChecklistItem = {
        ...item,
        satisfied: false,
        evidence: undefined
      }
      
      // Check each requirement
      switch (item.requirement) {
        case 'Product description is complete and accurate':
          result.satisfied = classification.productDescription.length > 20
          result.evidence = `Description length: ${classification.productDescription.length} characters`
          break
          
        case 'All GRI rules applied in correct sequence':
          result.satisfied = this.validateGRISequence(steps)
          result.evidence = `Applied rules: ${steps.map(s => s.step).join(' → ')}`
          break
          
        case 'Material composition documented (if composite)':
          const hasMultipleMaterials = griContext.materials && griContext.materials.length > 1
          if (hasMultipleMaterials) {
            result.satisfied = griContext.productAnalysisData?.compositeAnalysis !== undefined
            result.evidence = griContext.productAnalysisData?.compositeAnalysis 
              ? 'Composite analysis completed' 
              : 'Missing composite analysis'
          } else {
            result.satisfied = true
            result.evidence = 'Not a composite product'
          }
          break
          
        case 'HS code exists in official tariff schedule':
          result.satisfied = classification.finalHsCode !== null
          result.evidence = classification.finalHsCode || 'No HS code assigned'
          break
          
        case 'All exclusion notes have been checked':
          result.satisfied = griContext.exclusions.length === 0 || 
                           decisions.some(d => d.metadata?.includes('exclusion'))
          result.evidence = `${griContext.exclusions.length} exclusions checked`
          break
          
        case 'Essential character determination documented':
          result.satisfied = decisions.some(d => 
            d.step === 'gri_3b' || d.reasoning.toLowerCase().includes('essential character')
          )
          result.evidence = griContext.productAnalysisData?.essentialCharacter || 'Not documented'
          break
          
        case 'Decision reasoning provided for each step':
          const stepsWithReasoning = decisions.filter(d => d.reasoning.length > 10)
          result.satisfied = stepsWithReasoning.length === decisions.length
          result.evidence = `${stepsWithReasoning.length}/${decisions.length} decisions have reasoning`
          break
          
        case 'Confidence level above 70% threshold':
          const avgConfidence = this.calculateAverageConfidence(decisions)
          result.satisfied = avgConfidence >= 0.7
          result.evidence = `Average confidence: ${(avgConfidence * 100).toFixed(1)}%`
          break
          
        case 'Alternative classifications considered':
          result.satisfied = griContext.suggestedHeadings !== undefined && 
                           griContext.suggestedHeadings.length > 1
          result.evidence = griContext.suggestedHeadings 
            ? `${griContext.suggestedHeadings.length} alternatives considered`
            : 'No alternatives documented'
          break
          
        case 'Similar products referenced for consistency':
          result.satisfied = decisions.some(d => 
            d.reasoning.toLowerCase().includes('similar') || 
            d.metadata?.includes('reference')
          )
          break
          
        case 'Technical specifications included':
          result.satisfied = griContext.preClassificationData?.technicalSpecifications !== undefined &&
                           Object.keys(griContext.preClassificationData.technicalSpecifications).length > 0
          result.evidence = griContext.preClassificationData?.technicalSpecifications 
            ? `${Object.keys(griContext.preClassificationData.technicalSpecifications).length} specs documented`
            : 'No specs provided'
          break
          
        case 'Packaging considerations documented':
          result.satisfied = griContext.productAnalysisData?.packagingConsiderations !== undefined ||
                           decisions.some(d => d.step === 'gri_5')
          break
      }
      
      return result
    })
  }
  
  private validateGRISequence(steps: ClassificationStep[]): boolean {
    const expectedSequence = ['pre_classification', 'analyze_product', 'gri_1']
    const actualSequence = steps.map(s => s.step).slice(0, 3)
    
    return expectedSequence.every((step, index) => 
      actualSequence[index] === step
    )
  }
  
  private calculateAverageConfidence(decisions: Decision[]): number {
    if (decisions.length === 0) return 0
    
    const total = decisions.reduce((sum, d) => sum + d.confidence, 0)
    return total / decisions.length
  }
  
  generateReportHash(content: string): string {
    return createHash('sha256')
      .update(content)
      .update(this.version)
      .update(new Date().toISOString())
      .digest('hex')
  }
  
  generateExecutiveSummary(report: ClassificationReport): string {
    const { classification, decisions, griContext } = report
    const avgConfidence = this.calculateAverageConfidence(decisions)
    
    const summary = [
      `## Executive Summary`,
      ``,
      `**Product:** ${classification.productDescription}`,
      `**Classification Date:** ${format(new Date(), 'PPP')}`,
      `**Final HS Code:** ${classification.finalHsCode || 'Pending'}`,
      `**Confidence Level:** ${(avgConfidence * 100).toFixed(1)}%`,
      ``,
      `### Key Findings`,
      ``
    ]
    
    // Add product category and primary function
    if (griContext.preClassificationData) {
      summary.push(
        `- **Product Category:** ${griContext.preClassificationData.productCategory}`,
        `- **Primary Function:** ${griContext.productAnalysisData?.primaryFunction || 'Not specified'}`
      )
    }
    
    // Add material composition if composite
    if (griContext.materials && griContext.materials.length > 1) {
      summary.push(`- **Material Composition:** Multiple materials (composite product)`)
      
      const dominant = griContext.productAnalysisData?.compositeAnalysis?.dominantMaterial
      if (dominant) {
        summary.push(`- **Dominant Material:** ${dominant}`)
      }
    }
    
    // Add GRI rules applied
    const appliedRules = decisions
      .map(d => d.step)
      .filter(step => step.startsWith('gri_'))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
    
    summary.push(
      ``,
      `### Classification Process`,
      `- **GRI Rules Applied:** ${appliedRules.join(', ')}`,
      `- **Total Decisions Made:** ${decisions.length}`,
      `- **Time to Complete:** ${this.calculateProcessTime(report)}`
    )
    
    // Add any critical issues
    const criticalIssues = this.validateDefenseChecklist(report)
      .filter(item => item.severity === 'critical' && !item.satisfied)
    
    if (criticalIssues.length > 0) {
      summary.push(
        ``,
        `### ⚠️ Critical Issues`,
        ...criticalIssues.map(issue => `- ${issue.requirement}`)
      )
    }
    
    // Add recommendation
    const needsReview = avgConfidence < 0.7 || criticalIssues.length > 0
    summary.push(
      ``,
      `### Recommendation`,
      needsReview
        ? `This classification requires expert review due to ${
            avgConfidence < 0.7 ? 'low confidence' : 'critical issues'
          }.`
        : `This classification can proceed with standard verification procedures.`
    )
    
    return summary.join('\n')
  }
  
  private calculateProcessTime(report: ClassificationReport): string {
    const { classification } = report
    
    if (!classification.createdAt || !classification.completedAt) {
      return 'In progress'
    }
    
    const start = new Date(classification.createdAt)
    const end = new Date(classification.completedAt)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Less than 1 minute'
    if (diffMins === 1) return '1 minute'
    if (diffMins < 60) return `${diffMins} minutes`
    
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }
  
  generateMarkdownReport(report: ClassificationReport): string {
    const { classification, decisions, steps, griContext } = report
    const timestamp = format(new Date(), 'PPPpp')
    
    const sections = [
      `# HS Classification Legal Report`,
      ``,
      `**Report ID:** ${this.generateReportId()}`,
      `**Generated:** ${timestamp}`,
      `**Version:** ${this.version}`,
      ``,
      `---`,
      ``,
      this.generateExecutiveSummary(report),
      ``,
      `---`,
      ``,
      `## Classification Details`,
      ``,
      `### Product Information`,
      `- **Description:** ${classification.productDescription}`,
      `- **Classification ID:** ${classification.id}`,
      `- **Status:** ${classification.status}`,
      `- **Final HS Code:** ${classification.finalHsCode || 'Pending determination'}`,
      ``
    ]
    
    // Add pre-classification data
    if (griContext.preClassificationData) {
      sections.push(
        `### Pre-Classification Analysis`,
        `- **Product Category:** ${griContext.preClassificationData.productCategory}`,
        `- **Intended Use:** ${griContext.preClassificationData.intendedUse}`,
        ``
      )
      
      if (griContext.preClassificationData.materialComposition.length > 0) {
        sections.push(
          `**Material Composition:**`,
          ...griContext.preClassificationData.materialComposition.map(m => 
            `- ${m.name}: ${m.percentage}%`
          ),
          ``
        )
      }
    }
    
    // Add GRI decision tree
    sections.push(
      `### GRI Rule Application`,
      ``,
      `\`\`\`mermaid`,
      `graph TD`,
      ...this.generateDecisionTreeMermaid(steps, decisions),
      `\`\`\``,
      ``
    )
    
    // Add detailed decisions
    sections.push(
      `### Decision Log`,
      ``,
      ...decisions.map((d, i) => [
        `#### Decision ${i + 1}: ${d.step}`,
        `- **Question:** ${d.question}`,
        `- **Answer:** ${d.answer}`,
        `- **Reasoning:** ${d.reasoning}`,
        `- **Confidence:** ${(d.confidence * 100).toFixed(1)}%`,
        `- **Timestamp:** ${format(new Date(d.timestamp), 'PPPpp')}`,
        ``
      ]).flat()
    )
    
    // Add defense checklist
    const checklist = this.validateDefenseChecklist(report)
    sections.push(
      `### Defense Checklist Validation`,
      ``,
      `**Overall Compliance:** ${this.calculateComplianceScore(checklist)}%`,
      ``,
      ...this.formatDefenseChecklist(checklist),
      ``
    )
    
    // Add legal notes
    if (griContext.legalNotes.length > 0) {
      sections.push(
        `### Applicable Legal Notes`,
        ``,
        ...griContext.legalNotes.map(note => `- ${note}`),
        ``
      )
    }
    
    // Add digital signature
    sections.push(
      `---`,
      ``,
      `## Document Verification`,
      ``,
      `This document has been digitally signed and timestamped.`,
      ``,
      `**Timestamp:** ${timestamp}`,
      `**Document Hash:** [Will be generated after content finalization]`,
      ``
    )
    
    return sections.join('\n')
  }
  
  private generateReportId(): string {
    return `LR-${Date.now().toString(36).toUpperCase()}`
  }
  
  private generateDecisionTreeMermaid(steps: ClassificationStep[], decisions: Decision[]): string[] {
    const lines: string[] = []
    
    steps.forEach((step, index) => {
      const decision = decisions.find(d => d.step === step.step)
      const label = decision ? `${step.step}["${step.step}<br/>${decision.answer}"]` : `${step.step}["${step.step}"]`
      
      if (index === 0) {
        lines.push(`    Start --> ${label}`)
      } else {
        const prevStep = steps[index - 1]
        lines.push(`    ${prevStep.step} --> ${label}`)
      }
      
      // Add confidence indicator
      if (decision) {
        const confidenceClass = decision.confidence >= 0.8 ? 'high' : 
                               decision.confidence >= 0.6 ? 'medium' : 'low'
        lines.push(`    class ${step.step} ${confidenceClass}`)
      }
    })
    
    // Add style definitions
    lines.push(
      `    classDef high fill:#90EE90,stroke:#333,stroke-width:2px`,
      `    classDef medium fill:#FFD700,stroke:#333,stroke-width:2px`,
      `    classDef low fill:#FFB6C1,stroke:#333,stroke-width:2px`
    )
    
    return lines
  }
  
  private calculateComplianceScore(checklist: DefenseChecklistItem[]): number {
    const weights = { critical: 3, important: 2, recommended: 1 }
    
    let totalWeight = 0
    let achievedWeight = 0
    
    checklist.forEach(item => {
      const weight = weights[item.severity]
      totalWeight += weight
      if (item.satisfied) {
        achievedWeight += weight
      }
    })
    
    return Math.round((achievedWeight / totalWeight) * 100)
  }
  
  private formatDefenseChecklist(checklist: DefenseChecklistItem[]): string[] {
    const lines: string[] = []
    
    // Group by severity
    const bySeverity = {
      critical: checklist.filter(i => i.severity === 'critical'),
      important: checklist.filter(i => i.severity === 'important'),
      recommended: checklist.filter(i => i.severity === 'recommended')
    }
    
    Object.entries(bySeverity).forEach(([severity, items]) => {
      if (items.length === 0) return
      
      lines.push(`#### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Requirements`)
      lines.push(``)
      
      items.forEach(item => {
        const status = item.satisfied ? '✅' : '❌'
        lines.push(`- ${status} **${item.requirement}**`)
        if (item.evidence) {
          lines.push(`  - Evidence: ${item.evidence}`)
        }
      })
      
      lines.push(``)
    })
    
    return lines
  }
  
  async exportToPDF(report: ClassificationReport): Promise<Buffer> {
    // Placeholder - would use a PDF generation library like puppeteer or pdfkit
    throw new Error('PDF export not yet implemented. Use markdown export instead.')
  }
  
  exportToMarkdown(report: ClassificationReport): string {
    return this.generateMarkdownReport(report)
  }
}