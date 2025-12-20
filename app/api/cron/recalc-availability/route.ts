export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

/**
 * POST /api/cron/recalc-availability
 * Trigger availability recalculation for all hotels
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function POST(request: Request) {
  // Verify CRON secret
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Implement required models
  return NextResponse.json({ 
    success: true, 
    message: 'Availability recalculation not yet implemented' 
  })
}
