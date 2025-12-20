export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withAuth } from '@/lib/middleware/rbac'

// Get conversations for a user (guests and staff)
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
