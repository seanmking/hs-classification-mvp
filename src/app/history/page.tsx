'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Classification {
  id: string
  productDescription: string
  finalHsCode?: string
  status: string
  createdAt: string
  updatedAt: string
}

export default function HistoryPage() {
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchClassifications()
  }, [])

  const fetchClassifications = async () => {
    try {
      const response = await fetch('/api/classification')
      const data = await response.json()
      setClassifications(data.classifications || [])
    } catch (error) {
      console.error('Failed to fetch classifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status as keyof typeof statusStyles] || statusStyles.archived}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-legal-blue mx-auto"></div>
          <p className="mt-4 text-legal-gray">Loading classifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-legal-blue">
          Classification History
        </h1>
        <Link
          href="/classify"
          className="px-4 py-2 bg-legal-blue text-white rounded hover:bg-opacity-90 transition"
        >
          New Classification
        </Link>
      </div>

      {classifications.length === 0 ? (
        <div className="bg-white p-12 rounded-lg legal-shadow text-center">
          <p className="text-legal-gray mb-4">No classifications found</p>
          <Link
            href="/classify"
            className="inline-block px-6 py-3 bg-legal-blue text-white rounded hover:bg-opacity-90 transition"
          >
            Start Your First Classification
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg legal-shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classification ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HS Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classifications.map((classification) => (
                <tr key={classification.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {classification.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {classification.productDescription}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {classification.finalHsCode || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(classification.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(classification.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      {classification.status === 'in_progress' ? (
                        <Link
                          href={`/classify/${classification.id}`}
                          className="text-legal-blue hover:underline"
                        >
                          Continue
                        </Link>
                      ) : (
                        <Link
                          href={`/classify/${classification.id}`}
                          className="text-legal-blue hover:underline"
                        >
                          View
                        </Link>
                      )}
                      {classification.status === 'completed' && (
                        <Link
                          href={`/classify/${classification.id}/report`}
                          className="text-legal-gray hover:underline"
                        >
                          Report
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}