import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

function isAuthorized(role?: string | null) {
  const normalized = role?.toLowerCase()
  return normalized === 'owner' || normalized === 'admin' || normalized === 'manager'
}

export async function PATCH(_req: NextRequest) {
  const session = await getServerSession()

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAuthorized((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
