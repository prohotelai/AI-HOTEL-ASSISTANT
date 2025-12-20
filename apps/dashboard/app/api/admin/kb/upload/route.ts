import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Knowledge Base feature not yet implemented' }, { status: 501 })
}
