import { format } from 'date-fns'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    confidence?: number
    griReference?: string
    suggestedAction?: any
  }
}

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`
            px-4 py-3 rounded-lg
            ${isUser 
              ? 'bg-legal-blue text-white' 
              : 'bg-gray-100 text-legal-gray'
            }
          `}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* Metadata for assistant messages */}
          {!isUser && message.metadata && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              {message.metadata.griReference && (
                <div className="text-xs opacity-80">
                  Reference: {message.metadata.griReference}
                </div>
              )}
              {message.metadata.confidence && (
                <div className="text-xs opacity-80">
                  Confidence: {(message.metadata.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {format(message.timestamp, 'HH:mm:ss')}
        </div>
      </div>
    </div>
  )
}