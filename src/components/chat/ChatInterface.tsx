'use client'

import { useState, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import QuickActions from './QuickActions'
import { WCOCompliantGRIEngine, COMPLETE_GRI_RULES } from '@/lib/classification/gri-engine-wco'
import { DecisionLogger } from '@/lib/classification/decision-logger'
import { LegalFrameworkManager } from '@/lib/classification/legal-framework'
import DynamicForm from '@/components/forms/DynamicForm'
import { GRIStep } from '@/components/classification/GRIStep'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: any
}

interface ChatInterfaceProps {
  classificationId: string
  currentStep: string
  onStepComplete?: (step: string) => void
}

export default function ChatInterface({ 
  classificationId, 
  currentStep,
  onStepComplete 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showDynamicForm, setShowDynamicForm] = useState(false)
  const [currentFormType, setCurrentFormType] = useState<string | null>(null)
  const messagesEndRef = useRef<null | HTMLDivElement>(null)
  
  // Initialize legal compliance engines
  const [griEngine] = useState(() => new WCOCompliantGRIEngine({
    classificationId,
    productDescription: ''
  }))
  const [decisionLogger] = useState(() => new DecisionLogger(classificationId))
  const [legalFramework] = useState(() => new LegalFrameworkManager())

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Initial legally-compliant greeting
    const initialMessage: Message = {
      id: nanoid(),
      role: 'assistant',
      content: `Welcome to the HS Classification Assistant. I'll help you classify your product following international customs law and WCO guidelines. 

This process is legally binding and all decisions will be documented for compliance purposes. We'll apply the General Rules for Interpretation (GRI) in sequential order, which is mandatory under customs law.

Let's start by gathering comprehensive information about your product.`,
      timestamp: new Date(),
      metadata: {
        step: 'pre_classification',
        griRule: 'pre_classification',
        legalNote: 'Classification must follow GRI rules sequentially'
      }
    }
    
    setMessages([initialMessage])
    
    // Log the start of classification
    decisionLogger.logAuditEvent('classification_started', 'system', {
      classificationId,
      timestamp: new Date().toISOString()
    })
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // Validate current step can accept input
    const currentRule = griEngine.getCurrentRule()
    const validation = griEngine.validateRule(currentRule)
    
    if (!validation.valid && currentRule.id !== 'pre_classification') {
      setMessages(prev => [...prev, {
        id: nanoid(),
        role: 'assistant',
        content: `Before proceeding, we need to complete the following: ${validation.errors.join(', ')}`,
        timestamp: new Date(),
        metadata: { error: true }
      }])
      return
    }

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      // Process through GRI engine
      const response = await processGRIStep(inputValue, currentRule)
      
      // Log the decision
      if (response.decision) {
        griEngine.recordDecision(response.decision)
        decisionLogger.logDecision({
          step: currentRule.id,
          question: response.decision.question,
          answer: response.decision.answer,
          reasoning: response.decision.reasoning,
          confidence: response.decision.confidence,
          metadata: {
            legalReferences: response.decision.legalBasis,
            ...{ griRule: currentRule.id }
          }
        })
        
        // Check if we can advance
        const nextStep = griEngine.determineNextStep()
        if (nextStep) {
          griEngine.moveToNextRule(nextStep)
          legalFramework.markStepComplete(currentRule.id)
          onStepComplete?.(currentRule.id)
        }
      }

      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          confidence: response.confidence,
          griReference: currentRule.id,
          suggestedAction: response.suggestedAction,
          legalBasis: response.legalBasis
        },
      }

      setMessages(prev => [...prev, assistantMessage])

      // Handle form requirements
      if (response.suggestedAction?.type === 'form') {
        setCurrentFormType(response.suggestedAction.formType)
        setShowDynamicForm(true)
      }
    } catch (error) {
      console.error('Failed to process message:', error)
      setMessages(prev => [...prev, {
        id: nanoid(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
        metadata: { error: true }
      }])
    } finally {
      setIsTyping(false)
    }
  }
  
  // Process input through GRI rules
  const processGRIStep = async (input: string, currentRule: any) => {
    // This would normally call the LLM API, but for MVP we'll use structured logic
    
    if (currentRule.id === 'pre_classification') {
      // Check if we have enough info to proceed
      if (input.length < 50) {
        return {
          message: 'I need more detailed information about your product. Please describe its physical characteristics, materials, function, and intended use.',
          confidence: 0.6,
          suggestedAction: {
            type: 'form',
            formType: 'product_details'
          },
          decision: null,
          legalBasis: ['Pre-classification analysis required']
        }
      }
      
      return {
        message: `Thank you for the product description. Based on your input, I'll now guide you through the GRI classification process.

First, we'll apply GRI Rule 1, which requires us to check the section and chapter notes before examining headings.`,
        confidence: 0.9,
        decision: {
          ruleId: 'pre_classification',
          criterionId: 'physical_characteristics',
          question: 'Product description provided',
          answer: input,
          reasoning: 'Comprehensive product information gathered',
          confidence: 0.9,
          legalBasis: ['Pre-classification requirement fulfilled']
        },
        legalBasis: ['Moving to GRI 1 as per legal requirement']
      }
    }
    
    if (currentRule.id === 'gri_1') {
      return {
        message: `Under GRI Rule 1, I need to identify which sections and chapters might apply to your product.

Based on your description, I'll check the relevant section and chapter notes for any exclusions or special provisions.`,
        confidence: 0.85,
        suggestedAction: {
          type: 'form',
          formType: 'section_selection'
        },
        decision: null,
        legalBasis: ['GRI 1 - Terms of headings and legal notes']
      }
    }
    
    // Default response for other rules
    return {
      message: `Processing your input under ${currentRule.name}...`,
      confidence: 0.8,
      decision: null,
      legalBasis: [currentRule.legalText]
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickAction = (action: string) => {
    setInputValue(action)
    // Optionally auto-send
    // handleSendMessage()
  }

  const handleFormSubmit = (formData: any) => {
    setShowDynamicForm(false)
    
    // Process form data as a decision
    const currentRule = griEngine.getCurrentRule()
    const formMessage = `Form submitted: ${currentFormType}`
    
    setMessages(prev => [...prev, {
      id: nanoid(),
      role: 'user',
      content: formMessage,
      timestamp: new Date(),
      metadata: { formData, isForm: true }
    }])
    
    // Log form submission
    decisionLogger.logAuditEvent('form_submitted', 'user', {
      formType: currentFormType,
      formData,
      griRule: currentRule.id
    })
    
    // Continue processing
    setInputValue(JSON.stringify(formData))
    handleSendMessage()
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header with Classification Info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">HS Classification Assistant</h2>
            <p className="text-sm text-gray-500">Legal compliance enforced • ID: {classificationId}</p>
          </div>
          <div className="text-sm text-gray-600">
            Confidence: {(decisionLogger.getOverallConfidence() * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      
      {/* Current GRI Step Indicator */}
      <GRIStep 
        currentRule={{
          ...griEngine.getCurrentRule(),
          mandatory: true
        }}
        progress={{
          completed: griEngine.exportContext().decisions.map(d => d.ruleId).filter((v, i, a) => a.indexOf(v) === i),
          current: griEngine.getCurrentRule().id,
          remaining: Object.keys(COMPLETE_GRI_RULES).filter(id => 
            !griEngine.exportContext().decisions.some(d => d.ruleId === id) && 
            id !== griEngine.getCurrentRule().id
          ),
          completionPercentage: griEngine.getProgress()
        }}
      />
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Form Modal */}
      {showDynamicForm && currentFormType && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Required Information</h3>
              <DynamicForm
                formType={currentFormType}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowDynamicForm(false)}
                context={{
                  griRule: griEngine.getCurrentRule().id,
                  classificationId
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions 
        currentStep={griEngine.getCurrentRule().id} 
        onSelectAction={handleQuickAction}
      />

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex space-x-4">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={isTyping || showDynamicForm}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || showDynamicForm}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 flex justify-between">
          <span>All messages are recorded for legal documentation</span>
          <span>Current step: {griEngine.getCurrentRule().name}</span>
        </div>
      </div>
    </div>
  )
}