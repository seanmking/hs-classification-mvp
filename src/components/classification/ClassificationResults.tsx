'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, ChevronDown, ArrowRight, RefreshCw } from 'lucide-react'
import { ClassificationResult } from '@/services/llm-service'

interface ClassificationResultsProps {
  result: ClassificationResult
  onAccept: () => void
  onReject: () => void
}

export default function ClassificationResults({
  result,
  onAccept,
  onReject
}: ClassificationResultsProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [selectedAlternative, setSelectedAlternative] = useState<ClassificationResult | null>(null)

  // Determine which UI to show based on confidence
  if (result.confidence >= 0.85) {
    return <HighConfidenceResult 
      result={result} 
      onAccept={onAccept}
      onReject={onReject}
      showDetails={showDetails}
      setShowDetails={setShowDetails}
    />
  } else if (result.confidence >= 0.65) {
    return <MediumConfidenceResult
      result={result}
      onAccept={onAccept}
      onReject={onReject}
      showAlternatives={showAlternatives}
      setShowAlternatives={setShowAlternatives}
      selectedAlternative={selectedAlternative}
      setSelectedAlternative={setSelectedAlternative}
    />
  } else {
    return <LowConfidenceResult
      result={result}
      onReject={onReject}
    />
  }
}

// High confidence result component
function HighConfidenceResult({ 
  result, 
  onAccept, 
  onReject,
  showDetails,
  setShowDetails
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto"
    >
      {/* Success header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4"
        >
          <CheckCircle className="w-8 h-8 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900">Classification Found</h2>
      </div>

      {/* Main result card */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {/* HS Code display */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="text-5xl font-bold text-white mb-2"
          >
            {result.code}
          </motion.div>
          <p className="text-blue-100 text-lg">{result.description}</p>
        </div>

        {/* Confidence indicator */}
        <div className="px-8 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Confidence Level</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      i <= Math.round(result.confidence * 5)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-700 font-medium">
                High confidence
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 
                bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                transition-colors font-medium"
            >
              Use This Classification
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-6 py-3 text-gray-700 border border-gray-300 
                rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              View Details
            </button>
          </div>

          {/* Details dropdown */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 space-y-4 overflow-hidden"
              >
                {/* Reasoning */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Classification Reasoning</h4>
                  <p className="text-sm text-gray-700">{result.reasoning}</p>
                </div>

                {/* Similar products */}
                {result.similarProducts && result.similarProducts.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Similar Products</h4>
                    <div className="space-y-2">
                      {result.similarProducts.map((product: any) => (
                        <div key={product.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{product.name}</span>
                          <span className="text-gray-500">→ {product.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legal notes */}
                {result.legalNotes && result.legalNotes.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Applicable Legal Notes</h4>
                    <ul className="space-y-1">
                      {result.legalNotes.slice(0, 3).map((note: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700">
                          • {note.substring(0, 100)}...
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Not quite right? */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={onReject}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Not quite right? Start over
        </button>
      </motion.div>
    </motion.div>
  )
}

// Medium confidence result component
function MediumConfidenceResult({
  result,
  onAccept,
  onReject,
  showAlternatives,
  setShowAlternatives,
  selectedAlternative,
  setSelectedAlternative
}: any) {
  const displayResult = selectedAlternative || result

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-6">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900">Likely Classification</h2>
        <p className="text-gray-600 mt-2">Multiple options found - please review</p>
      </div>

      {/* Primary result */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900">{displayResult.code}</h3>
            <p className="text-gray-700 mt-1">{displayResult.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Confidence</div>
            <div className="text-lg font-medium text-amber-600">
              ~{Math.round(displayResult.confidence * 100)}%
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 transition-colors font-medium"
          >
            Use This Classification
          </button>
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="px-4 py-2 border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors font-medium"
          >
            {showAlternatives ? 'Hide' : 'Show'} Alternatives
          </button>
        </div>
      </div>

      {/* Alternatives */}
      <AnimatePresence>
        {showAlternatives && result.alternatives && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <h3 className="font-medium text-gray-900 mb-2">Alternative Classifications:</h3>
            {result.alternatives.map((alt: ClassificationResult) => (
              <motion.div
                key={alt.code}
                className={`bg-white rounded-lg border p-4 cursor-pointer
                  transition-all hover:shadow-md
                  ${selectedAlternative?.code === alt.code 
                    ? 'border-blue-500 ring-2 ring-blue-200' 
                    : 'border-gray-200'
                  }`}
                onClick={() => setSelectedAlternative(alt)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{alt.code}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alt.description}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    ~{Math.round(alt.confidence * 100)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help choosing */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 mb-2">Need help choosing?</p>
        <button
          onClick={onReject}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          Answer more questions to narrow down
        </button>
      </div>
    </motion.div>
  )
}

// Low confidence result component
function LowConfidenceResult({ result, onReject }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto text-center"
    >
      <div className="bg-orange-50 rounded-xl p-8">
        <RefreshCw className="w-12 h-12 text-orange-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Unable to Determine Classification
        </h2>
        <p className="text-gray-700 mb-6">
          The classification confidence is too low. Let's try a different approach.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={onReject}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again with More Details
          </button>
          <button
            onClick={() => window.location.href = '/guided'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors font-medium"
          >
            Use Guided Form Instead
          </button>
        </div>

        {/* Show best guess anyway */}
        {result.code && (
          <div className="mt-6 pt-6 border-t border-orange-200">
            <p className="text-sm text-gray-600 mb-2">Best guess:</p>
            <div className="text-lg font-medium text-gray-900">{result.code}</div>
            <p className="text-sm text-gray-600">{result.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}