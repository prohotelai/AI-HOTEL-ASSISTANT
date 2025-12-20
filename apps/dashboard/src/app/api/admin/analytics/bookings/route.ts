import { NextResponse } from 'next/server'

export async function GET() {
  // Booking model not yet implemented
  return NextResponse.json(
    { error: 'Booking analytics not yet implemented' },
    { status: 501 }
  )
}
