'use client'

import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import QuickActions from './QuickActions'

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
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // TODO: Load initial message based on current step
    setMessages([{
      id: 'initial',
      role: 'assistant',
      content: `Welcome to the HS Classification Assistant. I'll help you classify your product by applying the General Rules for Interpretation (GRI) in sequential order. Let's start with understanding your product better.`,
      timestamp: new Date(),
    }])
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      // TODO: Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          classificationId,
          currentStep,
          context: { messages: messages.slice(-10) }, // Last 10 messages for context
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: data.messageId,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        metadata: {
          confidence: data.confidence,
          griReference: data.griReference,
          suggestedAction: data.suggestedAction,
        },
      }

      setMessages(prev => [...prev, assistantMessage])

      // Handle suggested actions
      if (data.suggestedAction?.type === 'form') {
        setShowDynamicForm(true)
        // TODO: Load appropriate form based on formType
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // TODO: Show error toast
    } finally {
      setIsTyping(false)
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Form Area */}
      {showDynamicForm && (
        <div className="border-t p-4 bg-gray-50">
          <div className="text-sm text-legal-gray mb-2">
            Please provide the following information:
          </div>
          {/* TODO: Render appropriate form component */}
          <button 
            onClick={() => setShowDynamicForm(false)}
            className="text-sm text-legal-blue hover:underline"
          >
            Answer in chat instead
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions 
        currentStep={currentStep} 
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
            className="flex-1 px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none text-gray-900 bg-white"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="px-6 py-2 bg-legal-blue text-white rounded-md hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-legal-gray mt-2">
          All messages are recorded for legal documentation purposes
        </div>
      </div>
    </div>
  )
}