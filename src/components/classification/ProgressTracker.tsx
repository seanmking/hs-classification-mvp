interface Step {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface ProgressTrackerProps {
  steps: Step[]
  currentStep: string
}

export default function ProgressTracker({ steps, currentStep }: ProgressTrackerProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)
  const progress = ((steps.filter(s => s.status === 'completed').length / steps.length) * 100).toFixed(0)

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm text-legal-gray mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-legal-blue h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = step.status === 'completed'
          const isPending = step.status === 'pending'

          return (
            <div
              key={step.id}
              className={`
                relative pl-8 pb-3
                ${index < steps.length - 1 ? 'border-l-2 ml-3' : ''}
                ${isCompleted ? 'border-green-300' : 'border-gray-300'}
              `}
            >
              {/* Step indicator */}
              <div
                className={`
                  absolute left-0 w-6 h-6 rounded-full -translate-x-1/2
                  flex items-center justify-center text-xs font-semibold
                  ${isActive ? 'bg-legal-blue text-white' : ''}
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${isPending ? 'bg-gray-300 text-gray-600' : ''}
                `}
                style={{ left: '-0.5rem' }}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Step content */}
              <div className={`${isActive ? 'text-legal-blue' : 'text-legal-gray'}`}>
                <h4 className={`text-sm font-medium ${isActive ? 'text-legal-blue' : ''}`}>
                  {step.name}
                </h4>
                <p className="text-xs mt-1 opacity-75">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legal Notice */}
      <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-xs text-yellow-800">
          <strong>Legal Notice:</strong> Steps must be completed in sequential order per GRI requirements.
        </p>
      </div>
    </div>
  )
}