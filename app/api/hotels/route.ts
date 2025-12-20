export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get hotel by slug (for widget)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Hotel slug is required' },
        { status: 400 }
      )
    }

    const hotel = await prisma.hotel.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        widgetColor: true,
        widgetTitle: true,
      }
    })

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ hotel })
  } catch (error) {
    console.error('Hotels API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
