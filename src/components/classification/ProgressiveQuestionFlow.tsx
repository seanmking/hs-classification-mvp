'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { llmService, Question } from '@/services/llm-service'
import { ChevronRight, Info } from 'lucide-react'

interface ProgressiveQuestionFlowProps {
  initialInput: string
  onComplete: (classification: any) => void
}

export default function ProgressiveQuestionFlow({ 
  initialInput, 
  onComplete 
}: ProgressiveQuestionFlowProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isThinking, setIsThinking] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [customAnswer, setCustomAnswer] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  useEffect(() => {
    // Start the questioning process
    checkNextQuestion()
  }, [])

  const checkNextQuestion = async () => {
    setIsThinking(true)
    
    try {
      const result = await llmService.determineNextQuestion(
        initialInput,
        answers,
        0.85 // Target 85% confidence
      )
      
      if (result.confident && result.classification) {
        // We have enough confidence - complete the flow
        onComplete(result.classification)
      } else if (result.nextQuestion) {
        // Need more information
        setCurrentQuestion(result.nextQuestion)
        setShowMoreOptions(false)
        setShowCustomInput(false)
        setCustomAnswer('')
      }
    } catch (error) {
      console.error('Error in question flow:', error)
      // Fallback to basic classification
      const fallback = await llmService.classify(initialInput)
      onComplete(fallback)
    } finally {
      setIsThinking(false)
    }
  }

  const handleAnswer = async (value: string) => {
    if (!currentQuestion) return
    
    // Record the answer
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: value
    }
    setAnswers(newAnswers)
    
    // Check if we need another question
    checkNextQuestion()
  }

  const handleCustomSubmit = () => {
    if (customAnswer.trim()) {
      handleAnswer(customAnswer.trim())
    }
  }

  if (isThinking) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <motion.div
          className="w-16 h-16 border-3 border-blue-600 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-gray-600">Analyzing...</p>
      </div>
    )
  }

  if (!currentQuestion) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white rounded-2xl shadow-lg p-6 md:p-8"
      >
        {/* Question */}
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
          {currentQuestion.text}
        </h2>

        {/* Primary answer options */}
        <div className="space-y-3">
          {currentQuestion.topOptions.slice(0, showMoreOptions ? undefined : 3).map((option) => (
            <motion.button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className={`w-full text-left p-4 rounded-lg border transition-all
                ${option.recommended 
                  ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' 
                  : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-base md:text-lg text-gray-900">
                  {option.label}
                </span>
                <div className="flex items-center gap-2">
                  {option.recommended && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      Likely
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Show more options button */}
        {!showMoreOptions && currentQuestion.topOptions.length > 3 && (
          <button
            onClick={() => setShowMoreOptions(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Show more options ({currentQuestion.topOptions.length - 3} more)
          </button>
        )}

        {/* Custom answer option */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              None of these apply / Enter custom answer
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <input
                type="text"
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Type your answer..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customAnswer.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg 
                    hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomAnswer('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-8 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>
              {currentQuestion.isLast 
                ? 'Last question' 
                : `Question ${currentQuestion.currentNumber} of ~${currentQuestion.totalQuestions}`
              }
            </span>
          </div>
          
          {/* Progress dots */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(currentQuestion.totalQuestions, 5) }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < currentQuestion.currentNumber
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Why am I asking this? */}
      <motion.div 
        className="mt-4 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <details className="inline-block text-left">
          <summary className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
            Why am I asking this?
          </summary>
          <div className="mt-2 p-4 bg-gray-50 rounded-lg max-w-md">
            <p className="text-sm text-gray-600">
              This information helps narrow down the classification by understanding
              {currentQuestion.id === 'purpose' && ' how the product will be used'}
              {currentQuestion.id === 'material' && ' what the product is made of'}
              {currentQuestion.id === 'material_detail' && ' the specific composition'}
              . Each answer improves classification accuracy.
            </p>
          </div>
        </details>
      </motion.div>
    </div>
  )
}