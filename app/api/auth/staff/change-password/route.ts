export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API - تغيير كلمة المرور للموظفين
 * Staff Password Change API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withAuth } from '@/lib/middleware/rbac'
import { changeStaffPassword, setInitialPassword } from '@/lib/auth/staffAuth'

/**
 * POST /api/auth/staff/change-password
 * تغيير كلمة المرور (عادي)
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { 
          error: 'كلمة المرور الحالية والجديدة مطلوبتان',
          message: 'Current password and new password are required'
        },
        { status: 400 }
      )
    }

    const result = await changeStaffPassword(
      user.id,
      currentPassword,
      newPassword
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'فشل في تغيير كلمة المرور' },
      { status: 500 }
    )
  }
})
