import { format } from 'date-fns'

interface Decision {
  id: string
  step: string
  question: string
  answer: string
  reasoning: string
  confidence: number
  timestamp: string
  supportingEvidence?: string[]
  legalReferences?: string[]
}

interface DecisionRecordProps {
  decision: Decision
  index: number
}

export default function DecisionRecord({ decision, index }: DecisionRecordProps) {
  const getConfidenceBadge = (confidence: number) => {
    const percentage = (confidence * 100).toFixed(0)
    let colorClass = 'bg-gray-100 text-gray-800'
    
    if (confidence >= 0.9) {
      colorClass = 'bg-green-100 text-green-800'
    } else if (confidence >= 0.7) {
      colorClass = 'bg-yellow-100 text-yellow-800'
    } else if (confidence >= 0.5) {
      colorClass = 'bg-orange-100 text-orange-800'
    } else {
      colorClass = 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
        {percentage}% Confidence
      </span>
    )
  }

  return (
    <div className="bg-white border legal-border rounded-lg p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-legal-blue">
            Decision #{index + 1}: {decision.step}
          </h3>
          <time className="text-sm text-gray-500">
            {format(new Date(decision.timestamp), 'MMMM d, yyyy \'at\' HH:mm:ss \'UTC\'')}
          </time>
        </div>
        {getConfidenceBadge(decision.confidence)}
      </div>

      <div className="space-y-4">
        {/* Question */}
        <div>
          <h4 className="text-sm font-medium text-legal-gray mb-1">Question Presented</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            {decision.question}
          </div>
        </div>

        {/* Answer */}
        <div>
          <h4 className="text-sm font-medium text-legal-gray mb-1">Decision</h4>
          <div className="bg-blue-50 p-3 rounded text-sm font-medium text-legal-blue">
            {decision.answer}
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <h4 className="text-sm font-medium text-legal-gray mb-1">Legal Reasoning</h4>
          <div className="prose prose-sm max-w-none text-legal-gray">
            <p>{decision.reasoning}</p>
          </div>
        </div>

        {/* Supporting Evidence */}
        {decision.supportingEvidence && decision.supportingEvidence.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-legal-gray mb-1">Supporting Evidence</h4>
            <ul className="list-disc list-inside text-sm text-legal-gray space-y-1">
              {decision.supportingEvidence.map((evidence, idx) => (
                <li key={idx}>{evidence}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Legal References */}
        {decision.legalReferences && decision.legalReferences.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-legal-gray mb-1">Legal References</h4>
            <div className="flex flex-wrap gap-2">
              {decision.legalReferences.map((ref, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-legal-blue text-white text-xs rounded"
                >
                  {ref}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature Block */}
      <div className="mt-6 pt-4 border-t text-xs text-gray-500">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Decision ID:</strong> {decision.id}
          </div>
          <div>
            <strong>Hash:</strong> {btoa(decision.id + decision.timestamp).substring(0, 16)}...
          </div>
        </div>
      </div>
    </div>
  )
}