'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Hotel, MessageCircle, Settings, BarChart3, Code } from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hotel className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">AI Hotel Assistant</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user.email}</span>
              <Link href="/api/auth/signout">
                <Button variant="outline" size="sm">Sign out</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {session.user.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Conversations</span>
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500 mt-1">Total chats</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Messages</span>
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500 mt-1">Total messages</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Response Time</span>
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">~2s</div>
            <p className="text-xs text-gray-500 mt-1">Average</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Satisfaction</span>
              <BarChart3 className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">N/A</div>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Chat Interface
            </h2>
            <p className="text-gray-600 mb-4">
              Test your AI assistant and manage conversations
            </p>
            <Link href="/chat">
              <Button>Open Chat</Button>
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Code className="h-5 w-5 text-green-600" />
              Embed Widget
            </h2>
            <p className="text-gray-600 mb-4">
              Add the chat widget to your hotel website
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
              {'<script src="' + process.env.NEXT_PUBLIC_APP_URL + '/widget.js"></script>'}
            </div>
          </div>
        </div>

        {/* Future Integrations */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">🚀 Coming Soon</h2>
          <p className="text-gray-700 mb-4">
            Your platform is ready for integration with:
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>OpenAI GPT-4 Integration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Pinecone Vector Database</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Stripe Billing</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
