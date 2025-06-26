'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { llmService } from '@/services/llm-service'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ProgressiveQuestionFlow from '@/components/classification/ProgressiveQuestionFlow'
import ClassificationResults from '@/components/classification/ClassificationResults'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

type Stage = 'initializing' | 'questioning' | 'processing' | 'results' | 'error'

export default function ClassifyPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('initializing')
  const [productInput, setProductInput] = useState('')
  const [classification, setClassification] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Get initial input from session storage
  useEffect(() => {
    const input = sessionStorage.getItem('productInput')
    if (!input) {
      router.push('/')
      return
    }
    
    setProductInput(input)
    
    // Start initial classification
    performInitialClassification(input)
  }, [router])

  const performInitialClassification = async (input: string) => {
    try {
      setStage('processing')
      
      // Initial classification attempt
      const result = await llmService.classify(input)
      
      // Check if we need more information
      if (result.confidence >= 0.85) {
        // High confidence - go straight to results
        setClassification(result)
        setStage('results')
      } else {
        // Need more information - start questioning
        setStage('questioning')
      }
    } catch (err) {
      console.error('Classification error:', err)
      setError('Unable to classify product. Please try again.')
      setStage('error')
    }
  }

  const handleQuestioningComplete = (finalClassification: any) => {
    setClassification(finalClassification)
    setStage('results')
  }

  const handleAcceptClassification = () => {
    // Store classification in session
    sessionStorage.setItem('acceptedClassification', JSON.stringify(classification))
    
    // Navigate to report generation or confirmation page
    router.push('/classification/report')
  }

  const handleStartOver = () => {
    sessionStorage.removeItem('productInput')
    sessionStorage.removeItem('acceptedClassification')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Start over</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">HS Classification</h1>
              {stage !== 'initializing' && (
                <p className="text-sm text-gray-500">
                  {productInput.substring(0, 50)}...
                </p>
              )}
            </div>
            
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
          
          {/* Progress indicator */}
          {stage !== 'initializing' && stage !== 'error' && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  stage === 'processing' ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  stage === 'questioning' ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  stage === 'results' ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Initializing */}
          {stage === 'initializing' && (
            <motion.div
              key="initializing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[400px]"
            >
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Initializing classification...</p>
            </motion.div>
          )}

          {/* Processing */}
          {stage === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SkeletonLoader />
            </motion.div>
          )}

          {/* Questioning */}
          {stage === 'questioning' && (
            <motion.div
              key="questioning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProgressiveQuestionFlow
                initialInput={productInput}
                onComplete={handleQuestioningComplete}
              />
            </motion.div>
          )}

          {/* Results */}
          {stage === 'results' && classification && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ClassificationResults
                result={classification}
                onAccept={handleAcceptClassification}
                onReject={handleStartOver}
              />
            </motion.div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <h2 className="text-lg font-semibold text-red-900 mb-2">
                  Classification Error
                </h2>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}