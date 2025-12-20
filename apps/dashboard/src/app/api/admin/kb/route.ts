import { NextResponse } from 'next/server'

export async function GET() {
  // Knowledge base not yet implemented
  return NextResponse.json(
    { error: 'Knowledge base not yet implemented', items: [] },
    { status: 501 }
  )
}
