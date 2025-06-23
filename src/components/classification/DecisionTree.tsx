interface TreeNode {
  id: string
  label: string
  type: 'gri_rule' | 'decision' | 'outcome'
  children?: TreeNode[]
  metadata?: {
    hsCode?: string
    confidence?: number
    reasoning?: string
  }
}

interface DecisionTreeProps {
  tree: TreeNode
  currentNodeId?: string
}

export default function DecisionTree({ tree, currentNodeId }: DecisionTreeProps) {
  const renderNode = (node: TreeNode, level: number = 0) => {
    const isCurrentNode = node.id === currentNodeId
    const nodeClasses = `
      p-3 rounded-lg border-2 transition-all
      ${isCurrentNode ? 'border-legal-blue bg-blue-50' : 'border-gray-200 bg-white'}
      ${node.type === 'outcome' ? 'bg-green-50 border-green-200' : ''}
    `

    const getNodeIcon = () => {
      switch (node.type) {
        case 'gri_rule':
          return (
            <svg className="w-4 h-4 text-legal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        case 'decision':
          return (
            <svg className="w-4 h-4 text-legal-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        case 'outcome':
          return (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
      }
    }

    return (
      <div key={node.id} className="relative">
        <div className={nodeClasses}>
          <div className="flex items-start space-x-2">
            <div className="mt-1">{getNodeIcon()}</div>
            <div className="flex-1">
              <div className="font-medium text-sm text-legal-blue">
                {node.label}
              </div>
              {node.metadata && (
                <div className="mt-1 text-xs text-legal-gray">
                  {node.metadata.hsCode && (
                    <div>HS Code: {node.metadata.hsCode}</div>
                  )}
                  {node.metadata.confidence && (
                    <div>Confidence: {(node.metadata.confidence * 100).toFixed(0)}%</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {node.children && node.children.length > 0 && (
          <div className="ml-8 mt-2 space-y-2 relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300" style={{ left: '-1rem' }} />
            {node.children.map((child, index) => (
              <div key={child.id} className="relative">
                <div className="absolute w-4 h-px bg-gray-300" style={{ left: '-1rem', top: '1.5rem' }} />
                {renderNode(child, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-legal-blue mb-3">
        Classification Decision Tree
      </h3>
      <div className="overflow-x-auto">
        {renderNode(tree)}
      </div>
    </div>
  )
}