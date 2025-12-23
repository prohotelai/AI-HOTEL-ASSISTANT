import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/staff/create-password
 * Create password for staff member (first-time setup)
 */
export async function POST(req: NextRequest) {
  try {
    const { staffId, password } = await req.json()

    if (!staffId || !password) {
      return NextResponse.json(
        { error: 'Staff ID and password required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // staffPassword field has been removed - skip password check
    // Assume first-time password creation

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Note: staffPassword field has been removed from schema
    // Password update would go here if field existed
    console.log('Staff password creation requested for:', staffId)

    return NextResponse.json({
      success: true,
      message: 'Password creation functionality has been temporarily disabled',
    })
  } catch (error) {
    console.error('Create password error:', error)
    return NextResponse.json(
      { error: 'Failed to create password' },
      { status: 500 }
    )
  }
}
