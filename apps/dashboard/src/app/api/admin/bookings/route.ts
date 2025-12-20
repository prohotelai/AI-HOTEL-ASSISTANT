import { NextResponse } from 'next/server'

export async function GET() {
  // Booking model not yet implemented
  return NextResponse.json(
    { error: 'Bookings not yet implemented', items: [] },
    { status: 501 }
  )
}
