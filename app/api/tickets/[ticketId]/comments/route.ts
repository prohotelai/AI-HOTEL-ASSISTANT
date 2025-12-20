import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { addComment } from '@/lib/services/ticketService'

interface RouteParams {
  params: { ticketId: string }
}

export const POST = withPermission(Permission.TICKETS_COMMENT)(async (req: NextRequest, { params }: RouteParams) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  try {
    const hotelId = user.hotelId
    const userId = user.id
    const body = await req.json()
    const comment = await addComment({ hotelId, userId, ticketId: params.ticketId }, body)
    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    const status = (error as any).status ?? 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }
})
