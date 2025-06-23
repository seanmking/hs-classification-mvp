interface GRIStepProps {
  step: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  decisions?: Array<{
    question: string
    answer: string
    reasoning: string
    timestamp: string
  }>
  onStartStep?: () => void
}

export default function GRIStep({ 
  step, 
  title, 
  description, 
  status, 
  decisions = [],
  onStartStep 
}: GRIStepProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'in_progress':
        return (
          <div className="w-5 h-5 rounded-full border-2 border-legal-blue border-t-transparent animate-spin" />
        )
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        )
    }
  }

  const getStepClasses = () => {
    const base = "p-4 rounded-lg border-2 transition-all"
    switch (status) {
      case 'completed':
        return `${base} border-green-200 bg-green-50`
      case 'in_progress':
        return `${base} border-legal-blue bg-blue-50`
      default:
        return `${base} border-gray-200 bg-gray-50`
    }
  }

  return (
    <div className={getStepClasses()}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-1">{getStatusIcon()}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-legal-blue">
              {step}: {title}
            </h3>
            <p className="text-sm text-legal-gray mt-1">{description}</p>
            
            {decisions.length > 0 && (
              <div className="mt-3 space-y-2">
                {decisions.map((decision, index) => (
                  <div key={index} className="bg-white p-3 rounded border border-gray-200 text-sm">
                    <div className="font-medium text-legal-blue">{decision.question}</div>
                    <div className="text-legal-gray mt-1">Answer: {decision.answer}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Reasoning: {decision.reasoning}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {status === 'pending' && onStartStep && (
          <button
            onClick={onStartStep}
            className="px-3 py-1 text-sm bg-legal-blue text-white rounded hover:bg-opacity-90 transition"
          >
            Start
          </button>
        )}
      </div>
    </div>
  )
}