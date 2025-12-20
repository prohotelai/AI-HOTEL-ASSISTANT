/**
 * API - تعيين كلمة المرور الأولية للموظف
 * Staff Initial Password Setup API
 */

import { NextRequest, NextResponse } from 'next/server'
import { setInitialPassword } from '@/lib/auth/staffAuth'

/**
 * POST /api/auth/staff/set-initial-password
 * تعيين كلمة المرور في أول تسجيل دخول
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, temporaryPassword, newPassword } = body

    if (!userId || !temporaryPassword || !newPassword) {
      return NextResponse.json(
        { 
          error: 'جميع الحقول مطلوبة',
          message: 'All fields are required'
        },
        { status: 400 }
      )
    }

    const result = await setInitialPassword(
      userId,
      temporaryPassword,
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
      message: 'تم تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
    })
  } catch (error) {
    console.error('Set initial password error:', error)
    return NextResponse.json(
      { error: 'فشل في تعيين كلمة المرور' },
      { status: 500 }
    )
  }
}
