'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ReportPage() {
  const params = useParams()
  const classificationId = params.id as string
  const [report, setReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch complete classification data and generate report
    setTimeout(() => {
      setReport({
        classificationId,
        generatedAt: new Date().toISOString(),
        productDescription: 'Sample product description',
        finalHsCode: '8471.30.00',
        confidence: 0.92,
      })
      setIsLoading(false)
    }, 1000)
  }, [classificationId])

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-legal-blue mx-auto"></div>
          <p className="mt-4 text-legal-gray">Generating report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6 flex justify-between items-center no-print">
        <h1 className="text-3xl font-bold text-legal-blue">
          Classification Report
        </h1>
        <div className="space-x-4">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-legal-blue text-white rounded hover:bg-opacity-90 transition"
          >
            Print Report
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-legal-gray text-legal-gray rounded hover:bg-gray-50 transition"
          >
            Back to Classification
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg legal-shadow print:shadow-none">
        {/* Report Header */}
        <div className="border-b pb-6 mb-6">
          <h2 className="text-2xl font-semibold text-legal-blue mb-2">
            HS Code Classification Report
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Classification ID:</span> {classificationId}
            </div>
            <div>
              <span className="font-medium">Generated:</span> {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-legal-blue mb-4">
            Executive Summary
          </h3>
          <div className="bg-blue-50 p-4 rounded">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Final HS Code:</span>
                <div className="text-2xl font-bold text-legal-blue">{report.finalHsCode}</div>
              </div>
              <div>
                <span className="font-medium">Confidence Score:</span>
                <div className="text-2xl font-bold text-green-600">
                  {(report.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Information */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-legal-blue mb-4">
            Product Information
          </h3>
          <div className="prose max-w-none">
            <p>{report.productDescription}</p>
          </div>
        </section>

        {/* GRI Application Summary */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-legal-blue mb-4">
            GRI Application Summary
          </h3>
          <div className="space-y-4">
            {/* TODO: Add actual GRI steps from database */}
            <div className="border-l-4 border-legal-blue pl-4">
              <h4 className="font-semibold">GRI Rule 1</h4>
              <p className="text-sm text-legal-gray">
                Applied terms of heading 8471 - Automatic data-processing machines
              </p>
            </div>
          </div>
        </section>

        {/* Decision Log */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-legal-blue mb-4">
            Decision Log
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Decision Point
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reasoning
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* TODO: Add actual decisions from database */}
                <tr>
                  <td className="px-4 py-3 text-sm">2024-01-23 10:30:00</td>
                  <td className="px-4 py-3 text-sm">Material Composition</td>
                  <td className="px-4 py-3 text-sm">Primary material identified as electronic components</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Legal Certification */}
        <section className="mt-12 pt-8 border-t">
          <p className="text-sm text-legal-gray">
            This classification report has been generated following the World Customs Organization's 
            General Rules for Interpretation (GRI) in sequential order. All decisions and reasoning 
            have been documented contemporaneously for legal defensibility.
          </p>
        </section>
      </div>
    </div>
  )
}