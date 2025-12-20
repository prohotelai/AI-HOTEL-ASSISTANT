/**
 * API للأدمن - إدارة الموظفين
 * Admin API - Staff Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRole } from '@/lib/middleware/rbac'
import { 
  generateStaffId, 
  getStaffList, 
  deleteStaff 
} from '@/lib/auth/staffAuth'

/**
 * GET /api/admin/staff
 * الحصول على قائمة الموظفين
 */
export const GET = withRole(['owner', 'manager'])(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user.hotelId) {
      return NextResponse.json(
        { error: 'لا يوجد فندق مرتبط' },
        { status: 400 }
      )
    }

    const result = await getStaffList(user.hotelId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: result.staff
    })
  } catch (error) {
    console.error('Get staff list error:', error)
    return NextResponse.json(
      { error: 'فشل في جلب قائمة الموظفين' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/admin/staff
 * إنشاء موظف جديد
 */
export const POST = withRole(['owner', 'manager'])(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user.hotelId) {
      return NextResponse.json(
        { error: 'لا يوجد فندق مرتبط' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { name, email, role, department } = body

    // التحقق من البيانات
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'الاسم والبريد الإلكتروني والدور مطلوبة' },
        { status: 400 }
      )
    }

    // التحقق من صحة الدور
    const validRoles = ['owner', 'manager', 'reception', 'staff']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'الدور غير صحيح' },
        { status: 400 }
      )
    }

    // توليد معرف الموظف
    const result = await generateStaffId(
      {
        name,
        email,
        role,
        hotelId: user.hotelId,
        department
      },
      user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الموظف بنجاح',
      staffId: result.staffId,
      temporaryPassword: result.temporaryPassword,
      instructions: {
        ar: 'قم بإعطاء الموظف معرفه وكلمة المرور المؤقتة. سيُطلب منه تغيير كلمة المرور في أول تسجيل دخول.',
        en: 'Provide the employee with their ID and temporary password. They will be required to change the password on first login.'
      }
    })
  } catch (error) {
    console.error('Create staff error:', error)
    return NextResponse.json(
      { error: 'فشل في إنشاء الموظف' },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/admin/staff/[id]
 * حذف موظف
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRole(['owner', 'manager'])(async () => {
    try {
      const session = await getServerSession(authOptions)
      const user = session?.user as any

      if (!user.hotelId) {
        return NextResponse.json(
          { error: 'لا يوجد فندق مرتبط' },
          { status: 400 }
        )
      }

      const staffId = params.id

      const result = await deleteStaff(staffId, user.id, user.hotelId)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'تم حذف الموظف بنجاح'
      })
    } catch (error) {
      console.error('Delete staff error:', error)
      return NextResponse.json(
        { error: 'فشل في حذف الموظف' },
        { status: 500 }
      )
    }
  })(req)
}
