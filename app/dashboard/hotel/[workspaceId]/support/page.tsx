'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import SupportCard from '@/components/support/SupportCard'
import SupportTicketForm from '@/components/support/SupportTicketForm'
import SupportTicketList from '@/components/support/SupportTicketList'

type SupportTicket = {
  id: string
  subject: string
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  user: {
    id: string
    name: string
    email: string
  }
}

export default function SupportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [supportEnabled, setSupportEnabled] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      checkSupportAccess()
      fetchTickets()
    }
  }, [status, router])

  const checkSupportAccess = async () => {
    try {
      const res = await fetch('/api/support/tickets')
      if (res.status === 403) {
        // Support not enabled - show upsell
        setSupportEnabled(false)
        setLoading(false)
        return
      }
      setSupportEnabled(true)
    } catch (error) {
      console.error('Failed to check support access:', error)
      setSupportEnabled(false)
      setLoading(false)
    }
  }

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/support/tickets')
      
      if (res.status === 403) {
        setSupportEnabled(false)
        setLoading(false)
        return
      }

      const data = await res.json()
      if (data.success) {
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTicketCreated = (newTicket: SupportTicket) => {
    setTickets([newTicket, ...tickets])
    setShowForm(false)
  }

  const handleTicketUpdated = (updatedTicket: SupportTicket) => {
    setTickets(tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)))
  }

  const handleTicketDeleted = (ticketId: string) => {
    setTickets(tickets.filter((t) => t.id !== ticketId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show upsell if support not enabled
  if (!supportEnabled) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 text-yellow-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            24/7 Technical Support
          </h1>
          <p className="text-gray-700 mb-6">
            Upgrade to a paid plan to access 24/7 technical support from our expert team.
          </p>
          <div className="bg-white rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-lg mb-3">What&apos;s Included:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Priority ticket response within 24 hours
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Live chat support during business hours
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Email support with dedicated account manager
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Access to premium knowledge base and tutorials
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Phone support for urgent issues
              </li>
            </ul>
          </div>
          <button
            onClick={() => router.push(`/dashboard/hotel/${workspaceId}/billing`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    )
  }

  // Show support dashboard
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">24/7 Technical Support</h1>
        <p className="text-gray-600">Get help from our support team anytime, anywhere.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <SupportCard />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Support Tickets</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Cancel' : 'Create Ticket'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6">
            <SupportTicketForm onSuccess={handleTicketCreated} />
          </div>
        )}

        <SupportTicketList
          tickets={tickets}
          onUpdate={handleTicketUpdated}
          onDelete={handleTicketDeleted}
        />
      </div>
    </div>
  )
}
