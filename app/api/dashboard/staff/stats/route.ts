export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Staff Dashboard Statistics API Endpoint
 * Returns KPIs for staff dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyQRAuth } from '@/lib/auth/qrAuth'

export async function GET(request: NextRequest) {
  try {
    // Verify QR authentication
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const qrSession = await verifyQRAuth(authToken)
    if (!qrSession || qrSession.user.role !== 'staff') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const hotelId = request.nextUrl.searchParams.get('hotelId')
    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId is required' }, { status: 400 })
    }

    // Fetch mock dashboard stats
    // In production, query actual database
    const stats = {
      totalTasks: 24,
      assignedToMe: 8,
      completedToday: 5,
      pendingRooms: 12,
      maintenanceAlerts: 3,
      forecastedOccupancy: 87,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
