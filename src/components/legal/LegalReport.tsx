import { format } from 'date-fns'
import DecisionRecord from './DecisionRecord'

interface LegalReportProps {
  classification: {
    id: string
    productDescription: string
    finalHsCode: string
    confidence: number
    createdAt: string
    completedAt: string
    decisions: Array<{
      id: string
      step: string
      question: string
      answer: string
      reasoning: string
      confidence: number
      timestamp: string
      supportingEvidence?: string[]
      legalReferences?: string[]
    }>
    materials?: Array<{
      name: string
      percentage: number
      hsCode?: string
    }>
  }
  onPrint?: () => void
  onExport?: (format: 'pdf' | 'docx') => void
}

export default function LegalReport({ classification, onPrint, onExport }: LegalReportProps) {
  const getDuration = () => {
    const start = new Date(classification.createdAt)
    const end = new Date(classification.completedAt)
    const durationMs = end.getTime() - start.getTime()
    const hours = Math.floor(durationMs / 3600000)
    const minutes = Math.floor((durationMs % 3600000) / 60000)
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  return (
    <div className="bg-white rounded-lg legal-shadow print:shadow-none">
      {/* Report Header */}
      <div className="p-8 border-b">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-legal-blue mb-2">
              HS Code Classification Report
            </h1>
            <p className="text-legal-gray">
              Legal Documentation for Customs Classification
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-legal-gray">Report Generated</div>
            <div className="font-medium">
              {format(new Date(), 'MMMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-legal-gray">Classification ID</div>
            <div className="font-semibold text-sm">{classification.id}</div>
          </div>
          <div>
            <div className="text-xs text-legal-gray">Final HS Code</div>
            <div className="font-semibold text-sm text-legal-blue">
              {classification.finalHsCode}
            </div>
          </div>
          <div>
            <div className="text-xs text-legal-gray">Confidence</div>
            <div className="font-semibold text-sm text-green-600">
              {(classification.confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-legal-gray">Duration</div>
            <div className="font-semibold text-sm">{getDuration()}</div>
          </div>
        </div>
      </div>

      {/* Product Information */}
      <section className="p-8 border-b">
        <h2 className="text-2xl font-semibold text-legal-blue mb-4">
          1. Product Information
        </h2>
        <div className="prose max-w-none">
          <p className="text-legal-gray">{classification.productDescription}</p>
        </div>
        
        {classification.materials && classification.materials.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-legal-blue mb-3">
              Material Composition
            </h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Percentage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    HS Code
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classification.materials.map((material, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm">{material.name}</td>
                    <td className="px-4 py-3 text-sm">{material.percentage}%</td>
                    <td className="px-4 py-3 text-sm">{material.hsCode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* GRI Application */}
      <section className="p-8 border-b">
        <h2 className="text-2xl font-semibold text-legal-blue mb-4">
          2. GRI Application & Decision Log
        </h2>
        <p className="text-legal-gray mb-6">
          The following decisions were made in accordance with the World Customs Organization's 
          General Rules for Interpretation (GRI), applied in sequential order as legally required.
        </p>
        
        {classification.decisions.map((decision, index) => (
          <DecisionRecord key={decision.id} decision={decision} index={index} />
        ))}
      </section>

      {/* Final Determination */}
      <section className="p-8 border-b">
        <h2 className="text-2xl font-semibold text-legal-blue mb-4">
          3. Final Determination
        </h2>
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-legal-blue mb-2">
                Harmonized System Code
              </h3>
              <div className="text-3xl font-bold text-legal-blue">
                {classification.finalHsCode}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-legal-blue mb-2">
                Classification Confidence
              </h3>
              <div className="text-3xl font-bold text-green-600">
                {(classification.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Certification */}
      <section className="p-8">
        <h2 className="text-2xl font-semibold text-legal-blue mb-4">
          4. Legal Certification
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-sm text-legal-gray mb-4">
            This classification has been conducted in strict accordance with:
          </p>
          <ul className="list-disc list-inside text-sm text-legal-gray space-y-1 mb-4">
            <li>The Harmonized Commodity Description and Coding System</li>
            <li>World Customs Organization General Rules for Interpretation (GRI)</li>
            <li>Applicable national customs regulations</li>
            <li>Contemporary documentation standards for legal defensibility</li>
          </ul>
          <p className="text-sm text-legal-gray">
            All decisions have been documented contemporaneously and form an immutable audit trail 
            suitable for customs authority review and legal proceedings.
          </p>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-sm text-legal-gray">Classification Officer</p>
              <p className="text-xs text-gray-500 mt-1">AI-Assisted Classification System</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-sm text-legal-gray">Date</p>
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(classification.completedAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="p-6 border-t bg-gray-50 no-print">
        <div className="flex justify-end space-x-4">
          <button
            onClick={onPrint}
            className="px-6 py-2 border border-legal-gray text-legal-gray rounded hover:bg-gray-100 transition"
          >
            Print Report
          </button>
          <button
            onClick={() => onExport?.('pdf')}
            className="px-6 py-2 bg-legal-blue text-white rounded hover:bg-opacity-90 transition"
          >
            Export as PDF
          </button>
        </div>
      </div>
    </div>
  )
}