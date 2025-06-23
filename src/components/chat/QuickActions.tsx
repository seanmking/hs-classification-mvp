interface QuickActionsProps {
  currentStep: string
  onSelectAction: (action: string) => void
}

export default function QuickActions({ currentStep, onSelectAction }: QuickActionsProps) {
  // Define quick actions based on current GRI step
  const getQuickActions = () => {
    const baseActions = [
      'I need more information',
      'Can you explain this step?',
      'Show me an example',
    ]

    const stepSpecificActions: Record<string, string[]> = {
      'gri_1': [
        'What heading should I look at?',
        'My product serves multiple purposes',
        'Help me identify the primary function',
      ],
      'gri_2a': [
        'The product is incomplete',
        'It has all essential components',
        'Some parts are missing',
      ],
      'gri_2b': [
        'It\'s made of multiple materials',
        'One material dominates',
        'Materials are equally important',
      ],
      'gri_3a': [
        'Which description is more specific?',
        'Both headings seem equally specific',
        'I need help comparing headings',
      ],
      'gri_3b': [
        'How do I determine essential character?',
        'The main component is clear',
        'Multiple components are important',
      ],
    }

    return [...(stepSpecificActions[currentStep] || []), ...baseActions]
  }

  const actions = getQuickActions()

  return (
    <div className="border-t px-4 py-3 bg-gray-50">
      <div className="text-xs text-legal-gray mb-2">Quick responses:</div>
      <div className="flex flex-wrap gap-2">
        {actions.slice(0, 4).map((action, index) => (
          <button
            key={index}
            onClick={() => onSelectAction(action)}
            className="text-sm px-3 py-1 bg-white border legal-border rounded-full hover:bg-gray-100 transition"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}