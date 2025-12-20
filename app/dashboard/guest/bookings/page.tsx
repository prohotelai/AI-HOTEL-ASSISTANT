'use client'

import { useEffect, useState } from 'react'
import { MetricCard, Alert, StatusSummary } from '@/components/pms/DashboardComponents'

interface GuestBooking {
  id: string
  bookingNumber: string
  roomNumber: string
  roomType: string
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  totalPrice: number
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED'
}

export default function GuestPortal() {
  const [bookings, setBookings] = useState<GuestBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeBooking, setActiveBooking] = useState<GuestBooking | null>(null)

  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pms/bookings')
      if (!response.ok) throw new Error('Failed to fetch bookings')

      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    const interval = setInterval(fetchBookings, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'CHECKED_IN':
        return 'bg-green-100 text-green-800'
      case 'CHECKED_OUT':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600'
      case 'PENDING':
        return 'text-amber-600'
      case 'REFUNDED':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const activeCount = bookings.filter(b => b.status === 'CHECKED_IN').length
  const upcomingCount = bookings.filter(b => b.status === 'CONFIRMED').length
  const pastCount = bookings.filter(b => b.status === 'CHECKED_OUT').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading bookings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">View and manage your hotel reservations</p>
        </div>

        {/* Status Overview */}
        <div className="mb-6">
          <StatusSummary
            status={activeCount > 0 ? 'operational' : 'warning'}
            message={`You have ${activeCount} active booking${activeCount !== 1 ? 's' : ''} and ${upcomingCount} upcoming reservation${upcomingCount !== 1 ? 's' : ''}`}
          />
        </div>

        {/* Booking Metrics */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              title="Active Stays"
              value={activeCount}
              icon="🏨"
              color="green"
            />
            <MetricCard
              title="Upcoming"
              value={upcomingCount}
              icon="📅"
              color="blue"
            />
            <MetricCard
              title="Previous Stays"
              value={pastCount}
              icon="✅"
              color="purple"
            />
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Reservations</h2>

            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No bookings found</p>
                <p className="text-gray-400 mt-1">Make a reservation to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                    onClick={() => setActiveBooking(activeBooking?.id === booking.id ? null : booking)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Room {booking.roomNumber} - {booking.roomType}
                        </h3>
                        <p className="text-sm text-gray-500">Booking #{booking.bookingNumber}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(booking.paymentStatus)} border-current`}>
                          {booking.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Check-In</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkInDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Check-Out</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkOutDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                        <p className="text-sm font-medium text-gray-900">{calculateNights(booking.checkInDate, booking.checkOutDate)} nights</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                        <p className="text-sm font-medium text-gray-900">${booking.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <p className="text-gray-600">{booking.numberOfGuests} guest{booking.numberOfGuests !== 1 ? 's' : ''}</p>
                      {activeBooking?.id === booking.id && (
                        <button className="text-blue-600 hover:text-blue-700 font-medium">
                          View Details →
                        </button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {activeBooking?.id === booking.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-xs text-blue-600 font-medium uppercase">Check-In Information</p>
                          <p className="text-sm text-gray-700 mt-1">
                            {booking.status === 'CONFIRMED' && 'Please arrive between 3:00 PM - 11:00 PM'}
                            {booking.status === 'CHECKED_IN' && 'You are currently checked in. Checkout is at 11:00 AM'}
                            {booking.status === 'CHECKED_OUT' && 'Thank you for your stay!'}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {booking.status === 'CONFIRMED' && (
                            <>
                              <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">
                                Check-In Now
                              </button>
                              <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded text-sm font-medium">
                                Modify Booking
                              </button>
                            </>
                          )}
                          {booking.status === 'CHECKED_IN' && (
                            <>
                              <button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-medium">
                                Check-Out Early
                              </button>
                              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
                                Contact Support
                              </button>
                            </>
                          )}
                          {booking.status === 'CANCELLED' && (
                            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
                              New Booking
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl mb-2">📞</p>
              <p className="font-medium text-gray-900">Call Us</p>
              <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
            </div>
            <div className="text-center">
              <p className="text-2xl mb-2">💬</p>
              <p className="font-medium text-gray-900">Live Chat</p>
              <p className="text-sm text-gray-600">Available 24/7</p>
            </div>
            <div className="text-center">
              <p className="text-2xl mb-2">📧</p>
              <p className="font-medium text-gray-900">Email Us</p>
              <p className="text-sm text-gray-600">support@hotel.com</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6">
            <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
