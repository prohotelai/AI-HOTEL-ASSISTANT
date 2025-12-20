import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z, ZodError } from 'zod'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'

export async function requireAdminContext(requiredPermission: Permission) {
  const session = await getServerSession(authOptions)
  if (!session) {
    const response = NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    throw new ResponseError(response)
  }

  try {
    const context = assertPermission(session, requiredPermission)
    const role = session.user.role?.toLowerCase() ?? 'staff'
    const isSuperadmin = role === 'superadmin'

    return {
      session,
      ...context,
      role,
      isSuperadmin,
    }
  } catch (error) {
    const status = (error as any).status ?? 500
    const response = NextResponse.json({ message: (error as Error).message }, { status })
    throw new ResponseError(response)
  }
}

export async function requireOwnerOrManager(requiredPermission: Permission) {
  const context = await requireAdminContext(requiredPermission)

  const allowed = context.isSuperadmin || context.role === 'owner' || context.role === 'manager'
  if (!allowed) {
    const response = NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    throw new ResponseError(response)
  }

  return context
}

export function parseWithZod<T>(schema: z.ZodType<T>, value: unknown) {
  try {
    return schema.parse(value)
  } catch (error) {
    if (error instanceof ZodError) {
      const response = NextResponse.json({ message: 'Validation error', issues: error.flatten() }, { status: 422 })
      throw new ResponseError(response)
    }
    throw error
  }
}

export class ResponseError extends Error {
  readonly response: NextResponse

  constructor(response: NextResponse) {
    super('ResponseError')
    this.response = response
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof ResponseError) {
    return error.response
  }

  console.error('Admin API error', error)
  return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
}
