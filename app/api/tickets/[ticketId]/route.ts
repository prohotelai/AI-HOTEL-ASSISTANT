import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { getTicket, updateTicket, closeTicket } from '@/lib/services/ticketService'

interface RouteParams {
  params: { ticketId: string }
}

export const GET = withPermission(Permission.TICKETS_VIEW)(async (req: NextRequest, { params }: RouteParams) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  try {
    const hotelId = user.hotelId
    const ticket = await getTicket(hotelId, params.ticketId)
    return NextResponse.json(ticket)
  } catch (error) {
    const status = (error as any).status ?? 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }
})

export const PATCH = withPermission(Permission.TICKETS_UPDATE)(async (req: NextRequest, { params }: RouteParams) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  try {
    const hotelId = user.hotelId
    const userId = user.id
    const body = await req.json()
    const ticket = await updateTicket({ hotelId, userId, ticketId: params.ticketId }, body)
    return NextResponse.json(ticket)
  } catch (error) {
    const status = (error as any).status ?? 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }
})

export const DELETE = withPermission(Permission.TICKETS_ASSIGN)(async (req: NextRequest, { params }: RouteParams) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  try {
    const hotelId = user.hotelId
    const userId = user.id
    const ticket = await closeTicket({ hotelId, userId, ticketId: params.ticketId })
    return NextResponse.json(ticket)
  } catch (error) {
    const status = (error as any).status ?? 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }
})
