'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// TODO: Import components
// import ChatInterface from '@/components/chat/ChatInterface'
// import ProgressTracker from '@/components/classification/ProgressTracker'
// import DecisionTree from '@/components/classification/DecisionTree'

export default function ClassificationPage() {
  const params = useParams()
  const classificationId = params.id as string
  const [classification, setClassification] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchClassification()
  }, [classificationId])

  const fetchClassification = async () => {
    try {
      const response = await fetch(`/api/classification/${classificationId}`)
      const data = await response.json()
      setClassification(data.classification)
    } catch (error) {
      console.error('Failed to fetch classification:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-legal-blue mx-auto"></div>
          <p className="mt-4 text-legal-gray">Loading classification...</p>
        </div>
      </div>
    )
  }

  if (!classification) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-legal-gray">Classification not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Progress Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg legal-shadow sticky top-6">
            <h2 className="text-lg font-semibold text-legal-blue mb-4">
              Classification Progress
            </h2>
            {/* TODO: Add ProgressTracker component */}
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">Current Step:</div>
                <div className="text-legal-gray">{classification.currentStep}</div>
              </div>
              <div className="text-sm">
                <div className="font-medium">Status:</div>
                <div className="text-legal-gray capitalize">{classification.status}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg legal-shadow h-[600px] flex flex-col">
            <div className="p-4 border-b">
              <h1 className="text-xl font-semibold text-legal-blue">
                HS Code Classification Assistant
              </h1>
              <p className="text-sm text-legal-gray mt-1">
                Classification ID: {classificationId}
              </p>
            </div>
            
            {/* TODO: Add ChatInterface component */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-center text-legal-gray py-8">
                Chat interface will be implemented here
              </div>
            </div>
          </div>
        </div>

        {/* Decision Tree Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg legal-shadow">
            <h2 className="text-lg font-semibold text-legal-blue mb-4">
              Decision Tree
            </h2>
            {/* TODO: Add DecisionTree component */}
            <div className="text-sm text-legal-gray">
              Decision tree visualization will appear here as you progress through the classification.
            </div>
          </div>
          
          <div className="mt-6 bg-white p-6 rounded-lg legal-shadow">
            <h3 className="text-lg font-semibold text-legal-blue mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition text-sm">
                View Audit Trail
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition text-sm">
                Save Progress
              </button>
              <button 
                onClick={() => window.location.href = `/classify/${classificationId}/report`}
                className="w-full text-left px-4 py-2 bg-legal-blue text-white rounded hover:bg-opacity-90 transition text-sm"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}