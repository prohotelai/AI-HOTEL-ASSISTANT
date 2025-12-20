export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Widget API Routes
 * POST /api/widget/session - Create widget session for guest
 * GET /api/widget/guest - Get authenticated guest info
 * 
 * Feature not yet fully implemented (guest/booking models don't exist)
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/widget/session
 * Create a widget session for a guest
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Feature not yet fully implemented' },
    { status: 501 }
  )
}

/**
 * GET /api/widget/guest
 * Get authenticated guest information
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Feature not yet fully implemented' },
    { status: 501 }
  )
}
