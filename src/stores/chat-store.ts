import { create } from 'zustand'
import type { ChatMessage } from '@/types/chat'

interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  currentContext: {
    step: string
    needsInfo: string[]
    suggestedAction?: {
      type: 'form' | 'decision' | 'information' | 'next_step'
      details: any
    }
  }
  
  // Actions
  addMessage: (message: ChatMessage) => void
  setTyping: (isTyping: boolean) => void
  updateContext: (context: Partial<ChatState['currentContext']>) => void
  clearMessages: () => void
  
  // Computed
  getLastUserMessage: () => ChatMessage | undefined
  getLastAssistantMessage: () => ChatMessage | undefined
  getMessagesByStep: (step: string) => ChatMessage[]
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isTyping: false,
  currentContext: {
    step: 'gri_1',
    needsInfo: [],
  },
  
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }))
  },
  
  setTyping: (isTyping) => {
    set({ isTyping })
  },
  
  updateContext: (context) => {
    set((state) => ({
      currentContext: { ...state.currentContext, ...context },
    }))
  },
  
  clearMessages: () => {
    set({ messages: [] })
  },
  
  getLastUserMessage: () => {
    const { messages } = get()
    return messages.filter(m => m.role === 'user').slice(-1)[0]
  },
  
  getLastAssistantMessage: () => {
    const { messages } = get()
    return messages.filter(m => m.role === 'assistant').slice(-1)[0]
  },
  
  getMessagesByStep: (step) => {
    const { messages } = get()
    return messages.filter(m => m.metadata?.step === step)
  },
}))