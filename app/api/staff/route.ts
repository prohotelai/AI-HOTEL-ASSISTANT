/**
 * Staff Management API
 * 
 * POST /api/staff - Create a new staff record
 * GET /api/staff - List all staff for the authenticated hotel
 * 
 * Security:
 * - Requires authentication (withAuth)
 * - Enforces OWNER/MANAGER/HR role check
 * - Scopes to hotel from session
 * - Does NOT create User accounts
 * 
 * Error Handling:
 * - All DB operations wrapped in try/catch
 * - 400 for invalid input
 * - 403 for insufficient permissions
 * - 404 for not found
 * - 409 for conflicts
 * - 500 for internal errors (never exposed raw)
 * - Comprehensive logging with hotelId, userId, role, endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { hasPermission, Permission } from '@/lib/rbac'
import {
  createStaff,
  listStaffByHotel,
  getStaffById
} from '@/lib/services/staffService'
import { StaffRole, StaffStatus } from '@prisma/client'
import { badRequest, forbidden, notFound, conflict, internalError } from '@/lib/api/errorHandler'

/**
 * POST /api/staff
 * Create a new staff record
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { userId, hotelId, role } = ctx

    // Check permission: Only OWNER/MANAGER/HR can create staff
    if (!hasPermission(role, Permission.STAFF_CREATE)) {
      return forbidden(
        'You do not have permission to create staff records',
        { userId, hotelId, role, endpoint: '/api/staff', method: 'POST' }
      )
    }

    // Parse request body with error handling
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      return badRequest(
        'Invalid JSON in request body',
        { userId, hotelId, role, endpoint: '/api/staff', method: 'POST' }
      )
    }

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.email || !body.staffRole) {
      return badRequest(
        'Missing required fields: firstName, lastName, email, staffRole',
        { userId, hotelId, role, endpoint: '/api/staff', method: 'POST' },
        {
          missing: [
            !body.firstName && 'firstName',
            !body.lastName && 'lastName',
            !body.email && 'email',
            !body.staffRole && 'staffRole'
          ].filter(Boolean)
        }
      )
    }

    // Validate staffRole is valid enum value
    if (!Object.values(StaffRole).includes(body.staffRole)) {
      return badRequest(
        `Invalid staffRole. Must be one of: ${Object.values(StaffRole).join(', ')}`,
        { userId, hotelId, role, endpoint: '/api/staff', method: 'POST' }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return badRequest(
        'Invalid email format',
        { userId, hotelId, role, endpoint: '/api/staff', method: 'POST' }
      )
    }

    // Create staff record (without User account)
    // DB operation: wrapped in service layer
    const staff = await createStaff(hotelId, userId, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      staffRole: body.staffRole,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      address: body.address,
      department: body.department,
      hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
      notes: body.notes
    })

    // Return staff record (DO NOT expose full details to non-admin endpoints)
    return NextResponse.json(
      {
        success: true,
        staff: {
          id: staff.id,
          staffId: staff.staffId, // Expose staffId to admin
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          staffRole: staff.staffRole,
          status: staff.status,
          createdAt: staff.createdAt
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    // Handle specific errors
    if (error.message?.includes('already exists') || error.message?.includes('Unique constraint')) {
      return conflict(
        'Staff record with this email already exists',
        { userId: ctx.userId, hotelId: ctx.hotelId, role: ctx.role, endpoint: '/api/staff', method: 'POST' }
      )
    }

    if (error.message?.includes('Hotel not found')) {
      return notFound(
        'Hotel not found',
        { userId: ctx.userId, hotelId: ctx.hotelId, role: ctx.role, endpoint: '/api/staff', method: 'POST' }
      )
    }

    return internalError(
      error,
      { userId: ctx.userId, hotelId: ctx.hotelId, role: ctx.role, endpoint: '/api/staff', method: 'POST' },
      'Failed to create staff record'
    )
  }
})

/**
 * GET /api/staff
 * List all staff for the authenticated hotel
 */
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { userId, hotelId, role } = ctx

    // Check permission: Only OWNER/MANAGER/HR can view staff
    if (!hasPermission(role, Permission.STAFF_VIEW)) {
      return forbidden(
        'You do not have permission to view staff records',
        { userId, hotelId, role, endpoint: '/api/staff', method: 'GET' }
      )
    }

    // Parse query parameters
    const url = new URL(req.url)
    const status = url.searchParams.get('status') as StaffStatus | null
    const staffRole = url.searchParams.get('role') as StaffRole | null
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Validate query parameters
    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return badRequest(
        'Invalid limit or offset. Limit must be >= 1, offset must be >= 0',
        { userId, hotelId, role, endpoint: '/api/staff', method: 'GET' }
      )
    }

    // List staff
    // DB operation: wrapped in service layer
    const result = await listStaffByHotel(hotelId, {
      status: status || undefined,
      role: staffRole || undefined,
      limit,
      offset
    })

    // Return staff list (expose staffId only to admin)
    return NextResponse.json({
      success: true,
      staff: result.staff.map(s => ({
        id: s.id,
        staffId: s.staffId, // Expose to admin
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        staffRole: s.staffRole,
        status: s.status,
        createdAt: s.createdAt,
        user: s.user // Show if user account linked
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    })
  } catch (error: any) {
    return internalError(
      error,
      { userId: ctx.userId, hotelId: ctx.hotelId, role: ctx.role, endpoint: '/api/staff', method: 'GET' },
      'Failed to list staff records'
    )
  }
})
