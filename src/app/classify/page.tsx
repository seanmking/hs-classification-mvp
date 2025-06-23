'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClassifyPage() {
  const router = useRouter()
  const [productDescription, setProductDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleStartClassification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productDescription.trim()) return

    setIsLoading(true)
    try {
      // TODO: Create classification via API
      const response = await fetch('/api/classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDescription }),
      })
      
      const data = await response.json()
      if (data.classification) {
        router.push(`/classify/${data.classification.id}`)
      }
    } catch (error) {
      console.error('Failed to start classification:', error)
      // TODO: Show error toast
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-legal-blue mb-8">
        Start New Classification
      </h1>
      
      <div className="bg-white p-8 rounded-lg legal-shadow">
        <form onSubmit={handleStartClassification}>
          <div className="mb-6">
            <label 
              htmlFor="product-description" 
              className="block text-sm font-medium text-legal-gray mb-2"
            >
              Product Description
            </label>
            <textarea
              id="product-description"
              rows={4}
              className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue text-gray-900 bg-white"
              placeholder="Describe your product in detail. Include information about its purpose, materials, and how it's used..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md mb-6">
            <p className="text-sm text-legal-gray">
              <strong>Legal Notice:</strong> This classification process will follow the General Rules for Interpretation (GRI) 
              in sequential order. You cannot skip steps, and all decisions will be recorded for legal documentation purposes.
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !productDescription.trim()}
            className="w-full bg-legal-blue text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Starting Classification...' : 'Start Classification Process'}
          </button>
        </form>
      </div>
      
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-legal-blue mb-4">
          What to Expect
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-legal-gray">
          <li>AI-guided conversation to understand your product</li>
          <li>Sequential application of GRI rules 1-6</li>
          <li>Dynamic forms for specific information gathering</li>
          <li>Decision documentation at each step</li>
          <li>Final HS code determination with confidence score</li>
          <li>Comprehensive legal report generation</li>
        </ol>
      </div>
    </div>
  )
}