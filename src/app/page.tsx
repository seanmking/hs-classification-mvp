import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-legal-blue mb-4">
          Welcome to HS Classification Assistant
        </h2>
        <p className="text-xl text-legal-gray">
          Legally defensible customs classification through systematic GRI application
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-8 rounded-lg legal-shadow">
          <h3 className="text-2xl font-semibold text-legal-blue mb-4">
            Start New Classification
          </h3>
          <p className="text-legal-gray mb-6">
            Begin a new product classification with AI-guided assistance through each GRI rule.
          </p>
          <Link 
            href="/classify" 
            className="inline-block bg-legal-blue text-white px-6 py-3 rounded hover:bg-opacity-90 transition"
          >
            Start Classification
          </Link>
        </div>

        <div className="bg-white p-8 rounded-lg legal-shadow">
          <h3 className="text-2xl font-semibold text-legal-blue mb-4">
            View History
          </h3>
          <p className="text-legal-gray mb-6">
            Access previous classifications, reports, and audit trails for legal reference.
          </p>
          <Link 
            href="/history" 
            className="inline-block bg-legal-gray text-white px-6 py-3 rounded hover:bg-opacity-90 transition"
          >
            View History
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-legal-blue mb-3">
          Legal Compliance Features
        </h3>
        <ul className="space-y-2 text-legal-gray">
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            Sequential GRI rule application (cannot skip steps)
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            Complete decision documentation with timestamps
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            Immutable audit trail for legal defense
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            Professional reports suitable for customs authorities
          </li>
        </ul>
      </div>
    </div>
  )
}