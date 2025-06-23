import { z } from 'zod'

// Schema for LLM responses
const LLMResponseSchema = z.object({
  analysis: z.string(),
  questions: z.array(z.string()).optional(),
  suggestedAction: z.object({
    type: z.enum(['form', 'decision', 'information', 'next_step']),
    details: z.any()
  }).optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  hsCodeSuggestions: z.array(z.object({
    code: z.string(),
    description: z.string(),
    confidence: z.number()
  })).optional(),
  griRule: z.string().optional(),
  nextStep: z.string().optional()
})

export type ParsedLLMResponse = z.infer<typeof LLMResponseSchema>

export class ResponseParser {
  /**
   * Parse LLM response with multiple fallback strategies
   */
  static parseResponse(rawResponse: string): ParsedLLMResponse {
    // Try structured parsing first
    try {
      return this.parseStructuredResponse(rawResponse)
    } catch (error) {
      console.warn('Structured parsing failed, attempting unstructured parsing')
      return this.parseUnstructuredResponse(rawResponse)
    }
  }
  
  /**
   * Parse JSON-formatted response
   */
  private static parseStructuredResponse(response: string): ParsedLLMResponse {
    // Extract JSON from various formats
    let jsonStr = response
    
    // Check for markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    }
    
    // Try to find JSON object in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch && !codeBlockMatch) {
      jsonStr = jsonMatch[0]
    }
    
    const parsed = JSON.parse(jsonStr)
    return LLMResponseSchema.parse(parsed)
  }
  
  /**
   * Parse unstructured text response
   */
  private static parseUnstructuredResponse(response: string): ParsedLLMResponse {
    const lines = response.split('\n').filter(line => line.trim())
    
    // Extract confidence if mentioned
    const confidence = this.extractConfidence(response)
    
    // Extract questions
    const questions = this.extractQuestions(response)
    
    // Extract HS codes if mentioned
    const hsCodeSuggestions = this.extractHSCodes(response)
    
    // Determine suggested action
    const suggestedAction = this.determineSuggestedAction(response, questions)
    
    // Extract reasoning
    const reasoning = this.extractReasoning(response)
    
    return {
      analysis: response,
      questions: questions.length > 0 ? questions : undefined,
      suggestedAction,
      confidence,
      reasoning,
      hsCodeSuggestions: hsCodeSuggestions.length > 0 ? hsCodeSuggestions : undefined
    }
  }
  
  /**
   * Extract confidence score from text
   */
  private static extractConfidence(text: string): number {
    // Look for percentage
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:confidence|certain|sure)/i)
    if (percentMatch) {
      return parseFloat(percentMatch[1]) / 100
    }
    
    // Look for decimal confidence
    const decimalMatch = text.match(/confidence[:\s]+(\d+\.\d+)/i)
    if (decimalMatch) {
      return parseFloat(decimalMatch[1])
    }
    
    // Look for confidence words
    const highConfidence = /(?:high confidence|very confident|certain|definitely)/i.test(text)
    const mediumConfidence = /(?:moderate confidence|fairly confident|probably|likely)/i.test(text)
    const lowConfidence = /(?:low confidence|uncertain|unsure|possibly)/i.test(text)
    
    if (highConfidence) return 0.85
    if (lowConfidence) return 0.3
    if (mediumConfidence) return 0.6
    
    return 0.5 // Default
  }
  
  /**
   * Extract questions from response
   */
  private static extractQuestions(text: string): string[] {
    const questions: string[] = []
    
    // Look for numbered questions
    const numberedQuestions = text.match(/\d+\.\s*([^.!?]+\?)/g)
    if (numberedQuestions) {
      questions.push(...numberedQuestions.map(q => q.replace(/^\d+\.\s*/, '')))
    }
    
    // Look for bullet point questions
    const bulletQuestions = text.match(/[-•]\s*([^.!?]+\?)/g)
    if (bulletQuestions) {
      questions.push(...bulletQuestions.map(q => q.replace(/^[-•]\s*/, '')))
    }
    
    // Look for standalone questions
    const standaloneQuestions = text.match(/(?:^|\n)([^.!?\n]+\?)/g)
    if (standaloneQuestions) {
      questions.push(...standaloneQuestions.map(q => q.trim()))
    }
    
    // Deduplicate
    return [...new Set(questions)]
  }
  
  /**
   * Extract HS code suggestions
   */
  private static extractHSCodes(text: string): Array<{code: string, description: string, confidence: number}> {
    const codes: Array<{code: string, description: string, confidence: number}> = []
    
    // Look for HS codes (4, 6, or 8 digits)
    const codeMatches = text.matchAll(/(?:HS|heading|code)[:\s]*(\d{4}(?:\.\d{2})?(?:\.\d{2})?)\s*[-–]?\s*([^.;\n]+)/gi)
    
    for (const match of codeMatches) {
      codes.push({
        code: match[1],
        description: match[2].trim(),
        confidence: 0.7 // Default confidence for extracted codes
      })
    }
    
    return codes
  }
  
  /**
   * Determine suggested action type
   */
  private static determineSuggestedAction(text: string, questions: string[]): ParsedLLMResponse['suggestedAction'] {
    // Check for form indicators
    const formIndicators = /(?:fill out|complete|provide.*form|need.*following information)/i
    if (formIndicators.test(text)) {
      return {
        type: 'form',
        details: { formType: this.detectFormType(text) }
      }
    }
    
    // Check for decision request
    const decisionIndicators = /(?:choose|select|decide between|which.*prefer)/i
    if (decisionIndicators.test(text)) {
      return {
        type: 'decision',
        details: { options: this.extractOptions(text) }
      }
    }
    
    // If questions exist, it's an information request
    if (questions.length > 0) {
      return {
        type: 'information',
        details: { questions }
      }
    }
    
    // Check for next step indication
    const nextStepIndicators = /(?:proceed to|next.*step|now.*apply|move to)/i
    if (nextStepIndicators.test(text)) {
      return {
        type: 'next_step',
        details: { nextRule: this.extractNextRule(text) }
      }
    }
    
    return undefined
  }
  
  /**
   * Detect what type of form is needed
   */
  private static detectFormType(text: string): string {
    if (/material|composition|percentage/i.test(text)) {
      return 'material_composition'
    }
    if (/physical|dimension|size|weight/i.test(text)) {
      return 'physical_characteristics'
    }
    if (/function|purpose|use/i.test(text)) {
      return 'product_details'
    }
    return 'general_information'
  }
  
  /**
   * Extract options from decision request
   */
  private static extractOptions(text: string): string[] {
    const options: string[] = []
    
    // Look for numbered options
    const numberedOptions = text.match(/\d+[.)]\s*([^.!?\n]+)/g)
    if (numberedOptions) {
      options.push(...numberedOptions.map(o => o.replace(/^\d+[.)]\s*/, '').trim()))
    }
    
    // Look for "or" separated options
    const orMatch = text.match(/(?:either|between)\s+(.+?)\s+or\s+(.+?)(?:\.|,|;|$)/i)
    if (orMatch) {
      options.push(orMatch[1].trim(), orMatch[2].trim())
    }
    
    return options
  }
  
  /**
   * Extract next GRI rule
   */
  private static extractNextRule(text: string): string | null {
    const ruleMatch = text.match(/GRI\s*(?:Rule\s*)?(\d+[a-c]?)/i)
    if (ruleMatch) {
      return `gri_${ruleMatch[1].toLowerCase()}`
    }
    return null
  }
  
  /**
   * Extract reasoning from response
   */
  private static extractReasoning(text: string): string {
    // Look for reasoning indicators
    const reasoningMatch = text.match(/(?:because|reasoning|rationale|explanation)[:\s]*([^.!?]+[.!?])/i)
    if (reasoningMatch) {
      return reasoningMatch[1].trim()
    }
    
    // Use first substantive sentence as reasoning
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20)
    return sentences[0]?.trim() || 'No specific reasoning provided'
  }
  
  /**
   * Validate and clean parsed response
   */
  static validateResponse(response: ParsedLLMResponse): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check required fields
    if (!response.analysis || response.analysis.length < 10) {
      errors.push('Analysis is too short or missing')
    }
    
    if (response.confidence < 0 || response.confidence > 1) {
      errors.push('Confidence must be between 0 and 1')
    }
    
    // Check for low confidence
    if (response.confidence < 0.5) {
      warnings.push('Low confidence response - may need human review')
    }
    
    // Check action consistency
    if (response.suggestedAction?.type === 'form' && !response.suggestedAction.details?.formType) {
      warnings.push('Form type not specified')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}