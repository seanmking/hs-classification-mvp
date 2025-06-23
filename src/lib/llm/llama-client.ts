// TODO: Create Llama integration
// Connect to local Llama instance
// Handle:
// 1. Connection to localhost Llama API
// 2. Prompt engineering for classification
// 3. Response parsing
// 4. Error handling and fallbacks
// 5. Confidence scoring

interface LlamaConfig {
  apiUrl: string
  model: string
  maxRetries: number
  timeout: number
}

interface LlamaRequest {
  prompt: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stopSequences?: string[]
  systemPrompt?: string
}

interface LlamaResponse {
  text: string
  finishReason: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class LlamaClient {
  private config: LlamaConfig
  
  constructor(config?: Partial<LlamaConfig>) {
    this.config = {
      apiUrl: process.env.LLAMA_API_URL || 'http://localhost:8080',
      model: process.env.LLAMA_MODEL || 'llama2',
      maxRetries: 3,
      timeout: 30000,
      ...config
    }
  }
  
  /**
   * Send a chat completion request to Llama
   */
  async chat(request: LlamaRequest): Promise<LlamaResponse> {
    const payload = {
      model: this.config.model,
      messages: [
        ...(request.systemPrompt ? [{
          role: 'system',
          content: request.systemPrompt
        }] : []),
        {
          role: 'user',
          content: request.prompt
        }
      ],
      stream: false,
      options: {
        temperature: request.temperature ?? 0.3, // Lower temp for classification accuracy
        num_predict: request.maxTokens ?? 1000,
        top_p: request.topP ?? 0.9,
        stop: request.stopSequences
      }
    }
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest('/api/chat', payload)
        
        if (!response.message) {
          throw new Error('No response message returned from Ollama')
        }
        
        return {
          text: response.message.content,
          finishReason: response.done ? 'stop' : 'length',
          usage: {
            promptTokens: response.prompt_eval_count || 0,
            completionTokens: response.eval_count || 0,
            totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
          }
        }
      } catch (error) {
        lastError = error as Error
        console.error(`Llama request attempt ${attempt + 1} failed:`, error)
        
        if (attempt < this.config.maxRetries - 1) {
          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000)
        }
      }
    }
    
    throw new Error(`Failed to get response from Llama after ${this.config.maxRetries} attempts: ${lastError?.message}`)
  }
  
  /**
   * Generate a classification-specific response
   */
  async classifyProduct(params: {
    productDescription: string
    currentStep: string
    context: any
    previousDecisions?: any[]
  }): Promise<{
    response: string
    suggestedAction?: any
    confidence: number
    reasoning: string
  }> {
    const systemPrompt = this.generateClassificationPrompt(params.currentStep)
    
    const contextInfo = this.formatContext(params.context, params.previousDecisions)
    
    const prompt = `
Product Description: ${params.productDescription}

Current Classification Step: ${params.currentStep}

Context:
${contextInfo}

Please provide:
1. Analysis based on the current GRI rule
2. Specific questions or information needed
3. Confidence level (0-1) for any determinations
4. Reasoning for your analysis

Format your response as JSON with the following structure:
{
  "analysis": "Your detailed analysis",
  "questions": ["List of specific questions if needed"],
  "suggestedAction": {
    "type": "form|decision|information",
    "details": {}
  },
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of your reasoning"
}
`
    
    try {
      const response = await this.chat({
        prompt,
        systemPrompt,
        temperature: 0.2, // Very low for consistency
        maxTokens: 1500
      })
      
      // Parse JSON response
      const parsed = this.parseJSONResponse(response.text)
      
      return {
        response: parsed.analysis || response.text,
        suggestedAction: parsed.suggestedAction,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No specific reasoning provided'
      }
    } catch (error) {
      console.error('Classification request failed:', error)
      
      // Fallback response
      return {
        response: 'I need more information to proceed with the classification. Could you provide additional details about your product?',
        confidence: 0,
        reasoning: 'Failed to process classification request'
      }
    }
  }
  
  /**
   * Check if Llama service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      return response.ok
    } catch (error) {
      console.error('Llama health check failed:', error)
      return false
    }
  }
  
  /**
   * Make HTTP request to Llama API
   */
  private async makeRequest(endpoint: string, data: any): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    
    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      
      throw error
    }
  }
  
  /**
   * Generate system prompt based on GRI step
   */
  private generateClassificationPrompt(step: string): string {
    // This is imported from prompts.ts in real implementation
    const prompts: Record<string, string> = {
      'gri_1': 'You are a customs classification expert applying GRI Rule 1...',
      'gri_2a': 'You are applying GRI Rule 2(a) regarding incomplete articles...',
      // etc.
    }
    
    return prompts[step] || prompts['gri_1']
  }
  
  /**
   * Format context information for the prompt
   */
  private formatContext(context: any, previousDecisions?: any[]): string {
    let contextStr = ''
    
    if (context.materials && context.materials.length > 0) {
      contextStr += '\nMaterial Composition:\n'
      context.materials.forEach((mat: any) => {
        contextStr += `- ${mat.name}: ${mat.percentage}%\n`
      })
    }
    
    if (previousDecisions && previousDecisions.length > 0) {
      contextStr += '\nPrevious Decisions:\n'
      previousDecisions.forEach(dec => {
        contextStr += `- ${dec.step}: ${dec.answer} (Confidence: ${dec.confidence})\n`
      })
    }
    
    return contextStr || 'No additional context available'
  }
  
  /**
   * Parse JSON response with fallback
   */
  private parseJSONResponse(text: string): any {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : text
      
      return JSON.parse(jsonStr)
    } catch (error) {
      console.warn('Failed to parse JSON response, using fallback parsing')
      
      // Fallback: try to extract key information
      return {
        analysis: text,
        confidence: 0.5,
        reasoning: 'Response could not be parsed as structured JSON'
      }
    }
  }
  
  /**
   * Sleep helper for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}