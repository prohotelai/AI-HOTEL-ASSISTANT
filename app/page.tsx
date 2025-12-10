import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageCircle, Hotel, Zap, Shield } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hotel className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">AI Hotel Assistant</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            AI-Powered Guest Communication for Hotels
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Multi-tenant SaaS platform offering intelligent conversational agents,
            knowledge base management, and seamless PMS integration.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                Start Free Trial
              </Button>
            </Link>
            <Link href="/chat">
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">ChatGPT-like Interface</h3>
            <p className="text-gray-600">
              Intuitive chat interface with AI-powered responses for guest inquiries.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Embeddable Widget</h3>
            <p className="text-gray-600">
              Easy-to-integrate chat widget for your hotel website.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Multi-Tenant Architecture</h3>
            <p className="text-gray-600">
              Secure, isolated data for each hotel with enterprise-grade security.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500 mb-4">Built with modern technologies</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span className="px-3 py-1 bg-white rounded-full">Next.js 14</span>
            <span className="px-3 py-1 bg-white rounded-full">TypeScript</span>
            <span className="px-3 py-1 bg-white rounded-full">Tailwind CSS</span>
            <span className="px-3 py-1 bg-white rounded-full">Prisma</span>
            <span className="px-3 py-1 bg-white rounded-full">Neon</span>
            <span className="px-3 py-1 bg-white rounded-full">OpenAI (Ready)</span>
            <span className="px-3 py-1 bg-white rounded-full">Pinecone (Ready)</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2024 AI Hotel Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
