interface ClassificationSummaryProps {
  classification: {
    id: string
    productDescription: string
    finalHsCode?: string
    confidence?: number
    status: string
    createdAt: string
    completedAt?: string
    decisions: Array<{
      step: string
      question: string
      answer: string
      reasoning: string
      timestamp: string
    }>
  }
}

export default function ClassificationSummary({ classification }: ClassificationSummaryProps) {
  const getDuration = () => {
    if (!classification.completedAt) return 'In Progress'
    
    const start = new Date(classification.createdAt)
    const end = new Date(classification.completedAt)
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 60000)
    
    return `${minutes} minutes`
  }

  const getStatusBadge = () => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      needs_review: 'bg-orange-100 text-orange-800',
      archived: 'bg-gray-100 text-gray-800',
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[classification.status as keyof typeof statusStyles] || statusStyles.archived}`}>
        {classification.status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg legal-shadow p-6">
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-semibold text-legal-blue">
            Classification Summary
          </h2>
          {getStatusBadge()}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm text-legal-gray">
          <div>
            <span className="font-medium">ID:</span> {classification.id}
          </div>
          <div>
            <span className="font-medium">Duration:</span> {getDuration()}
          </div>
        </div>
      </div>

      {/* Product Information */}
      <div className="mb-6">
        <h3 className="font-semibold text-legal-blue mb-2">Product Description</h3>
        <p className="text-sm text-legal-gray">{classification.productDescription}</p>
      </div>

      {/* Final Classification */}
      {classification.finalHsCode && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-legal-blue mb-2">Final Classification</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-legal-gray">HS Code</div>
              <div className="text-2xl font-bold text-legal-blue">
                {classification.finalHsCode}
              </div>
            </div>
            {classification.confidence && (
              <div>
                <div className="text-sm text-legal-gray">Confidence</div>
                <div className="text-2xl font-bold text-green-600">
                  {(classification.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Decisions */}
      <div>
        <h3 className="font-semibold text-legal-blue mb-3">Key Decisions</h3>
        <div className="space-y-3">
          {classification.decisions.slice(0, 3).map((decision, index) => (
            <div key={index} className="border-l-4 border-legal-blue pl-3">
              <div className="text-sm font-medium text-legal-gray">
                {decision.step}: {decision.question}
              </div>
              <div className="text-sm text-legal-gray mt-1">
                → {decision.answer}
              </div>
            </div>
          ))}
          
          {classification.decisions.length > 3 && (
            <div className="text-sm text-legal-blue">
              + {classification.decisions.length - 3} more decisions
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 pt-4 border-t flex space-x-3">
        <button className="flex-1 px-4 py-2 bg-legal-blue text-white rounded hover:bg-opacity-90 transition text-sm">
          View Full Report
        </button>
        <button className="px-4 py-2 border border-legal-gray text-legal-gray rounded hover:bg-gray-50 transition text-sm">
          Export
        </button>
      </div>
    </div>
  )
}