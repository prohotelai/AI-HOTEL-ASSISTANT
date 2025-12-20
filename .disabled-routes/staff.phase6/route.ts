/**
 * GET /api/staff - List staff profiles
 * POST /api/staff - Create staff profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { listStaffProfiles, createStaffProfile, getStaffStatistics } from '@/lib/services/staffService'
import { z } from 'zod'

// Validation schemas
const createStaffSchema = z.object({
  userId: z.string().cuid().optional(), // Optional - will be created if not provided
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().cuid().optional(),
  position: z.string().optional(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']).optional(),
  startDate: z.string().datetime().optional(),
  salary: z.number().positive().optional(),
  hourlyRate: z.number().positive().optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional()
})

const listStaffSchema = z.object({
  departmentId: z.string().cuid().optional(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
})

/**
 * GET /api/staff
 * List staff profiles with filters
 */
export const GET = withPermission(Permission.STAFF_VIEW)(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validation = listStaffSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.format() },
        { status: 400 }
      )
    }

    const filters = {
      hotelId,
      ...validation.data
    }

    // If requesting stats
    if (searchParams.get('stats') === 'true') {
      const stats = await getStaffStatistics(hotelId)
      return NextResponse.json(stats)
    }

    // List staff profiles
    const result = await listStaffProfiles(filters)

    return NextResponse.json({
      success: true,
      profiles: result.profiles,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0
    })
  } catch (error: any) {
    console.error('[API] GET /api/staff error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch staff profiles', details: error.message },
      { status: 500 }
    )
  }
})

/**
 * POST /api/staff
 * Create new staff profile
 */
export const POST = withPermission(Permission.STAFF_CREATE)(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId
    const creatorId = user.id

    // Parse and validate body
    const body = await request.json()
    const validation = createStaffSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.format() },
        { status: 400 }
      )
    }

    const data = validation.data

    // If userId not provided, user must be created separately (via invitation)
    if (!data.userId) {
      return NextResponse.json(
        { error: 'userId is required. Use invitation flow to create user and profile together.' },
        { status: 400 }
      )
    }

    // Create staff profile
    const profile = await createStaffProfile({
      userId: data.userId,
      hotelId,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      address: data.address,
      city: data.city,
      country: data.country,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      position: data.position,
      employmentStatus: data.employmentStatus,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      salary: data.salary,
      hourlyRate: data.hourlyRate,
      bio: data.bio,
      avatar: data.avatar,
      skills: data.skills,
      certifications: data.certifications,
      languages: data.languages
    })

    return NextResponse.json({
      success: true,
      profile
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/staff error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to create staff profile', details: error.message },
      { status: 500 }
    )
  }
})
