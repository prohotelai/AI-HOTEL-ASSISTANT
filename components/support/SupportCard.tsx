'use client'

export default function SupportCard() {
  return (
    <>
      {/* Contact Support Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <svg
            className="w-8 h-8 text-blue-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
        </div>
        <p className="text-gray-600 text-sm mb-3">
          Send us an email and we&apos;ll respond within 24 hours.
        </p>
        <a
          href="mailto:support@aihotelassistant.com"
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          support@aihotelassistant.com
        </a>
      </div>

      {/* Live Chat Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <svg
            className="w-8 h-8 text-green-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Live Chat</h3>
        </div>
        <p className="text-gray-600 text-sm mb-3">
          Chat with our support team in real-time during business hours.
        </p>
        <button
          onClick={() => {
            // Integration point for live chat widget (e.g., Intercom, Zendesk)
            if (window.Intercom) {
              window.Intercom('show')
            } else {
              alert('Live chat will be available soon!')
            }
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Start Chat
        </button>
      </div>

      {/* Phone Support Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <svg
            className="w-8 h-8 text-purple-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
        </div>
        <p className="text-gray-600 text-sm mb-3">
          Call us for urgent issues requiring immediate assistance.
        </p>
        <a
          href="tel:+1-800-555-0123"
          className="text-purple-600 hover:text-purple-700 font-medium text-sm"
        >
          +1 (800) 555-0123
        </a>
        <p className="text-gray-500 text-xs mt-2">Mon-Fri, 9AM-6PM EST</p>
      </div>
    </>
  )
}

// TypeScript declaration for window.Intercom (optional)
declare global {
  interface Window {
    Intercom?: (command: string, ...args: any[]) => void
  }
}
