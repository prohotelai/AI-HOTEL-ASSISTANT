export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { listTickets, createTicket } from '@/lib/services/ticketService'
// TODO: Re-enable usage tracking in Phase 5.1
// import { checkTicketLimit, incrementTicketUsage, UsageLimitError } from '@/lib/subscription/usageTracking'

export const GET = withPermission(Permission.TICKETS_VIEW)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  try {
    const hotelId = user.hotelId
    const data = await listTickets(hotelId!, req.nextUrl.searchParams)
    return NextResponse.json(data)
  } catch (error) {
    const status = (error as any).status ?? 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }
})

export const POST = withPermission(Permission.TICKETS_CREATE)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  try {
    const hotelId = user.hotelId
    const userId = user.id
    
    // TODO: Re-enable usage tracking in Phase 5.1
    // ✅ Check ticket limit before creation
    // try {
    //   await checkTicketLimit(hotelId!)
    // } catch (error) {
    //   if (error instanceof UsageLimitError) {
    //     return NextResponse.json(
    //       {
    //         error: 'Ticket Limit Exceeded',
    //         message: error.message,
    //         limitType: error.limitType,
    //         currentUsage: error.currentUsage,
    //         limit: error.limit,
    //         upgradeUrl: error.upgradeUrl,
    //       },
    //       { status: 402 }
    //     )
    //   }
    //   throw error
    // }
    
    const body = await req.json()
    const ticket = await createTicket({ hotelId: hotelId!, userId }, body)
    
    // TODO: Re-enable usage tracking in Phase 5.1
    // ✅ Increment ticket usage after successful creation
    // await incrementTicketUsage(hotelId!)
    
    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    const status = (error as any).status ?? 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }
})
