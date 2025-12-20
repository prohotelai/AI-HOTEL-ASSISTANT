import { NextResponse } from 'next/server'

export async function GET() {
  // Ticket analytics temporarily disabled
  return NextResponse.json(
    {
      status: [],
      priority: [],
      range: { from: null, to: null }
    },
    { status: 200 }
  )
}
