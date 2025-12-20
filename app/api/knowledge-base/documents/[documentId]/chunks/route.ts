export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { documentId: string }
}

export const GET = withPermission(Permission.KNOWLEDGE_BASE_VIEW)(async (request: NextRequest, { params }: RouteParams) => {
  // TODO: Implement knowledgeBaseChunk model
  return NextResponse.json({ 
    success: false,
    error: 'Knowledge base chunks not yet implemented'
  }, { status: 501 })
  
  /*
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  try {
    const hotelId = user.hotelId
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

    const chunks = await prisma.knowledgeBaseChunk.findMany({
      where: {
        document: {
          id: params.documentId,
          hotelId,
        },
      },
      select: {
        id: true,
        sequence: true,
        content: true,
        tokenCount: true,
        embeddingStatus: true,
        embeddedAt: true,
      },
      orderBy: { sequence: 'asc' },
      take: limit,
    })

    return NextResponse.json({ items: chunks })
  } catch (error) {
    const status = (error as any).status ?? 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }
  */
})
