'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ChevronDown, Plus, Info } from 'lucide-react'
import { llmService } from '@/services/llm-service'
import { motion, AnimatePresence } from 'framer-motion'

export default function HomePage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [hints, setHints] = useState<string[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Analyze input for smart hints
  useEffect(() => {
    const analyzeInput = async () => {
      if (input.length > 15) {
        const analysis = await llmService.analyzeInput({
          text: input,
          mode: 'preventive_guidance'
        })
        
        if (analysis.missingSuggestions) {
          setHints(analysis.missingSuggestions)
        }
      } else {
        setHints([])
      }
    }

    const timer = setTimeout(analyzeInput, 300)
    return () => clearTimeout(timer)
  }, [input])

  const handleSubmit = async () => {
    if (input.length < 10 || isProcessing) return
    
    setIsProcessing(true)
    
    // Store input in session storage for the classification flow
    sessionStorage.setItem('productInput', input)
    
    // Navigate to classification flow
    router.push('/classify')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const addHint = (hint: string) => {
    setInput(prev => prev + ' ' + hint)
    setHints(hints.filter(h => h !== hint))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
        {/* Hero Section - Minimal */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Find HS Code
          </h1>
          <p className="text-lg text-gray-600">
            Describe your product naturally
          </p>
        </motion.div>

        {/* Main Input Section */}
        <motion.div 
          className={`bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 ${
            isFocused ? 'shadow-xl ring-2 ring-blue-500 ring-opacity-20' : ''
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Stainless steel kitchen knife with wooden handle"
              className={`w-full resize-none rounded-lg px-4 py-3 text-base md:text-lg 
                placeholder-gray-400 focus:outline-none transition-all duration-200
                ${isFocused ? 'min-h-[100px]' : 'min-h-[60px]'}`}
              style={{ fontSize: '16px' }} // Prevents zoom on iOS
            />
            
            {/* Mobile-friendly camera button */}
            <button
              className="absolute right-3 top-3 p-2 rounded-lg hover:bg-gray-100 
                transition-colors md:hidden"
              aria-label="Add photo"
            >
              <Camera className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Smart hints */}
          <AnimatePresence>
            {input.length > 15 && hints.length > 0 && (
              <motion.div 
                className="mt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm text-gray-600 mb-2">Consider adding:</p>
                <div className="flex flex-wrap gap-2">
                  {hints.map(hint => (
                    <motion.button
                      key={hint}
                      onClick={() => addHint(hint)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 
                        bg-blue-50 text-blue-700 rounded-full text-sm
                        hover:bg-blue-100 transition-colors"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-3 h-3" />
                      {hint}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={input.length < 10 || isProcessing}
            className={`w-full mt-6 py-3 px-6 rounded-lg font-medium
              transition-all duration-200 text-base md:text-lg
              ${input.length >= 10 && !isProcessing
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            whileHover={input.length >= 10 && !isProcessing ? { scale: 1.02 } : {}}
            whileTap={input.length >= 10 && !isProcessing ? { scale: 0.98 } : {}}
          >
            {isProcessing ? 'Processing...' : 'Find Classification →'}
          </motion.button>
        </motion.div>

        {/* Progressive disclosure for advanced options */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900
              transition-colors text-sm"
          >
            More options
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div 
                className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-md mx-auto"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <a
                  href="/batch"
                  className="p-3 bg-white rounded-lg shadow hover:shadow-md
                    transition-shadow text-sm text-gray-700 hover:text-gray-900"
                >
                  📦 Batch classify
                </a>
                <a
                  href="/guided"
                  className="p-3 bg-white rounded-lg shadow hover:shadow-md
                    transition-shadow text-sm text-gray-700 hover:text-gray-900"
                >
                  📋 Use guided form
                </a>
                <a
                  href="/browse"
                  className="p-3 bg-white rounded-lg shadow hover:shadow-md
                    transition-shadow text-sm text-gray-700 hover:text-gray-900"
                >
                  🔍 Browse categories
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Subtle info section */}
        <motion.div 
          className="mt-12 flex items-start gap-2 text-xs text-gray-500 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            AI-powered classification using South African SARS tariff codes. 
            Results are legally compliant and include all applicable notes.
          </p>
        </motion.div>
      </div>

      {/* Mobile-optimized styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          textarea {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  )
}