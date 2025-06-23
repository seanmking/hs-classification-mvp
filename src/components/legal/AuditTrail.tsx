import { format } from 'date-fns'

interface AuditEntry {
  id: string
  timestamp: string
  action: string
  actor: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

interface AuditTrailProps {
  entries: AuditEntry[]
  classificationId: string
}

export default function AuditTrail({ entries, classificationId }: AuditTrailProps) {
  const getActionIcon = (action: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'classification_created': (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      'step_started': (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      ),
      'decision_made': (
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'form_submitted': (
        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      'classification_completed': (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    }
    
    return iconMap[action] || (
      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="bg-white rounded-lg legal-shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-legal-blue">
          Audit Trail
        </h2>
        <p className="text-sm text-legal-gray mt-1">
          Immutable record for Classification ID: {classificationId}
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-6 text-center text-legal-gray">
            No audit entries found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">{getActionIcon(entry.action)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-legal-blue">
                        {formatAction(entry.action)}
                      </h4>
                      <time className="text-xs text-gray-500">
                        {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </time>
                    </div>
                    
                    <div className="mt-1 text-sm text-legal-gray">
                      By: {entry.actor}
                    </div>
                    
                    {Object.keys(entry.details).length > 0 && (
                      <div className="mt-2 bg-gray-50 p-2 rounded text-xs">
                        <details className="cursor-pointer">
                          <summary className="font-medium">Details</summary>
                          <pre className="mt-2 whitespace-pre-wrap">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                    
                    {(entry.ipAddress || entry.userAgent) && (
                      <div className="mt-2 text-xs text-gray-500">
                        {entry.ipAddress && <div>IP: {entry.ipAddress}</div>}
                        {entry.userAgent && <div className="truncate">UA: {entry.userAgent}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-legal-gray">
            {entries.length} entries recorded
          </div>
          <button className="text-legal-blue hover:underline">
            Export Full Audit Log
          </button>
        </div>
      </div>
    </div>
  )
}