/**
 * GET /api/staff/[id] - Get staff profile
 * PATCH /api/staff/[id] - Update staff profile
 * DELETE /api/staff/[id] - Delete staff profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { getStaffProfile, updateStaffProfile, deleteStaffProfile } from '@/lib/services/staffService'
import { z } from 'zod'

// Validation schema
const updateStaffSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  departmentId: z.string().cuid().optional().nullable(),
  position: z.string().optional(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']).optional(),
  endDate: z.string().datetime().optional().nullable(),
  salary: z.number().positive().optional(),
  hourlyRate: z.number().positive().optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  notificationsEnabled: z.boolean().optional(),
  timezone: z.string().optional()
})

/**
 * GET /api/staff/[id]
 * Get staff profile by ID
 */
export const GET = withPermission(Permission.STAFF_VIEW)(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId

    const profile = await getStaffProfile(params.id)

    if (!profile) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      )
    }

    // Ensure profile belongs to user's hotel
    if (profile.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      profile
    })
  } catch (error: any) {
    console.error('[API] GET /api/staff/[id] error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch staff profile', details: error.message },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/staff/[id]
 * Update staff profile
 */
export const PATCH = withPermission(Permission.STAFF_EDIT)(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId
    const userId = user.id

    // Verify profile exists and belongs to hotel
    const existingProfile = await getStaffProfile(params.id)
    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      )
    }

    if (existingProfile.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = updateStaffSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.format() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Transform date fields
    const updateData: any = { ...data }
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth)
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate)
    }

    // Update profile
    const profile = await updateStaffProfile(params.id, updateData, userId)

    return NextResponse.json({
      success: true,
      profile
    })
  } catch (error: any) {
    console.error('[API] PATCH /api/staff/[id] error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to update staff profile', details: error.message },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/staff/[id]
 * Delete staff profile
 */
export const DELETE = withPermission(Permission.STAFF_DELETE)(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId

    // Verify profile exists and belongs to hotel
    const existingProfile = await getStaffProfile(params.id)
    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      )
    }

    if (existingProfile.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete profile
    await deleteStaffProfile(params.id)

    return NextResponse.json({
      success: true,
      message: 'Staff profile deleted successfully'
    })
  } catch (error: any) {
    console.error('[API] DELETE /api/staff/[id] error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to delete staff profile', details: error.message },
      { status: 500 }
    )
  }
})
