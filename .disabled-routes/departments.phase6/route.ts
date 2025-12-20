/**
 * GET /api/departments - List departments
 * POST /api/departments - Create department
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '@/lib/services/staffService'
import { z } from 'zod'

// Validation schemas
const createDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
})

/**
 * GET /api/departments
 * List all departments for hotel
 */
export const GET = withPermission(Permission.STAFF_VIEW)(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId

    const departments = await listDepartments(hotelId)

    return NextResponse.json({
      success: true,
      departments
    })
  } catch (error: any) {
    console.error('[API] GET /api/departments error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch departments', details: error.message },
      { status: 500 }
    )
  }
})

/**
 * POST /api/departments
 * Create new department
 */
export const POST = withPermission(Permission.STAFF_CREATE)(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId

    // Parse and validate body
    const body = await request.json()
    const validation = createDepartmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.format() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Create department
    const department = await createDepartment(
      hotelId,
      data.name,
      data.description,
      data.color
    )

    return NextResponse.json({
      success: true,
      department
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/departments error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to create department', details: error.message },
      { status: 500 }
    )
  }
})
