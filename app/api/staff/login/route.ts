import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

/**
 * POST /api/staff/login
 * 
 * Staff login endpoint:
 * 1. Validates QR context (staffId, hotelId)
 * 2. Verifies password
 * 3. Creates StaffSession with permissions
 * 4. Returns session token
 */
export async function POST(req: NextRequest) {
  try {
    const { qrToken, password } = await req.json()

    if (!qrToken || !password) {
      return NextResponse.json(
        { error: 'QR token and password required' },
        { status: 400 }
      )
    }

    // 1. Resolve QR token to get context
    const qrRecord = await prisma.guestStaffQRToken.findFirst({
      where: {
        token: qrToken,
        expiresAt: { gte: new Date() },
        isUsed: false,
        role: { in: ['staff', 'STAFF'] }
      },
      include: {
        user: true,
        hotel: true
      }
    })

    if (!qrRecord || !qrRecord.user) {
      return NextResponse.json(
        { error: 'Invalid or expired QR code' },
        { status: 401 }
      )
    }

    const staff = qrRecord.user
    const hotel = qrRecord.hotel

    // 2. Check if staff account is suspended
    if (staff.isSuspended) {
      return NextResponse.json(
        { error: 'Account suspended. Contact administrator.' },
        { status: 403 }
      )
    }

    // 3. Verify password
    if (!staff.staffPassword) {
      return NextResponse.json(
        { error: 'Password not set. Please set password first.' },
        { status: 400 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, staff.staffPassword)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // 4. Check if password change is required
    if (staff.mustChangePassword) {
      return NextResponse.json(
        { 
          error: 'Password change required',
          mustChangePassword: true 
        },
        { status: 403 }
      )
    }

    // 5. Determine permissions based on role
    const permissions = getStaffPermissions(staff.role as string)

    // 6. Create StaffSession
    const sessionToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

    const staffSession = await prisma.staffSession.create({
      data: {
        userId: staff.id,
        hotelId: hotel.id,
        sessionToken,
        sessionType: 'STAFF',
        expiresAt,
        canAccessKB: permissions.canAccessKB,
        canViewTickets: permissions.canViewTickets,
        canCreateTickets: permissions.canCreateTickets,
      }
    })

    // 7. Mark QR token as used
    await prisma.guestStaffQRToken.update({
      where: { id: qrRecord.id },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    })

    // 8. Return session info
    return NextResponse.json({
      success: true,
      sessionToken: staffSession.sessionToken,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
      hotel: {
        id: hotel.id,
        name: hotel.name,
      },
      permissions: {
        canAccessKB: staffSession.canAccessKB,
        canViewTickets: staffSession.canViewTickets,
        canCreateTickets: staffSession.canCreateTickets,
      },
      expiresAt: staffSession.expiresAt.toISOString()
    })

  } catch (error) {
    console.error('Staff login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Get staff permissions based on role
 */
function getStaffPermissions(role: string) {
  const normalizedRole = role.toUpperCase()

  switch (normalizedRole) {
    case 'MANAGER':
      return {
        canAccessKB: true,
        canViewTickets: true,
        canCreateTickets: true,
      }
    case 'RECEPTION':
      return {
        canAccessKB: true,
        canViewTickets: true,
        canCreateTickets: true,
      }
    case 'STAFF':
      return {
        canAccessKB: true,
        canViewTickets: true,
        canCreateTickets: true,
      }
    default:
      return {
        canAccessKB: false,
        canViewTickets: false,
        canCreateTickets: false,
      }
  }
}
