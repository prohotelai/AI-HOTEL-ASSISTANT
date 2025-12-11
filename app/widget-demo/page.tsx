import { ChatWidget } from '@/components/widget/ChatWidget'

export default function WidgetDemoPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-3xl font-bold mb-4">Chat Widget Demo</h1>
          <p className="text-gray-600 mb-4">
            This page demonstrates the embeddable chat widget. The widget appears
            in the bottom-right corner and can be integrated into any hotel website.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h2 className="font-semibold mb-2">Features:</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Floating chat button in bottom-right corner</li>
              <li>Expandable chat interface</li>
              <li>Custom branding colors per hotel</li>
              <li>Anonymous guest support</li>
              <li>Mobile-responsive design</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold mb-4">Sample Hotel Content</h2>
          <p className="text-gray-600 mb-4">
            Welcome to our hotel! We offer luxurious accommodations in the heart
            of the city. Our amenities include:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>24/7 Front Desk Service</li>
            <li>Complimentary Wi-Fi</li>
            <li>Fitness Center & Spa</li>
            <li>On-site Restaurant & Bar</li>
            <li>Business Center</li>
            <li>Concierge Services</li>
          </ul>
          <p className="text-gray-600 mt-4">
            Click the chat button in the bottom-right corner to start a conversation
            with our AI assistant!
          </p>
        </div>
      </div>

      {/* Embedded Widget */}
      <ChatWidget hotelSlug="demo-hotel" />
    </div>
  )
}
