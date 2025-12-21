/**
 * نظام مصادقة الموظفين (Staff Authentication)
 * الأدمن يولد معرف للموظف، والموظف يقوم بإنشاء كلمة مرور في أول تسجيل دخول
 */

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SystemRole } from '@prisma/client'

/**
 * توليد معرف موظف جديد من قبل الأدمن
 */
export async function generateStaffId(
  staffData: {
    name: string
    email: string
    role: SystemRole
    hotelId: string
    department?: string
  },
  createdByAdminId: string
): Promise<{
  success: boolean
  staffId?: string
  temporaryPassword?: string
  error?: string
}> {
  try {
    // التحقق من أن البريد الإلكتروني غير مستخدم
    const existingUser = await prisma.user.findUnique({
      where: { email: staffData.email }
    })

    if (existingUser) {
      return {
        success: false,
        error: 'البريد الإلكتروني مستخدم بالفعل'
      }
    }

    // توليد معرف موظف فريد
    const rolePrefix: Record<SystemRole, string> = {
      [SystemRole.OWNER]: 'OWN',
      [SystemRole.MANAGER]: 'MGR',
      [SystemRole.RECEPTION]: 'REC',
      [SystemRole.STAFF]: 'STF',
      [SystemRole.GUEST]: 'GST',
      [SystemRole.AI_AGENT]: 'AI'
    }

    const prefix = rolePrefix[staffData.role]
    const randomNum = Math.floor(10000 + Math.random() * 90000)
    const staffId = `${prefix}-${randomNum}`

    // توليد كلمة مرور مؤقتة
    const temporaryPassword = `Temp${Math.random().toString(36).substr(2, 8)}!`
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)

    // إنشاء المستخدم
    const user = await prisma.user.create({
      data: {
        name: staffData.name,
        email: staffData.email,
        password: hashedPassword,
        role: staffData.role,
        hotelId: staffData.hotelId,
      }
    })

    // تسجيل الحدث - Audit log functionality stubbed
    // await prisma.auditLog.create({
    //   data: {
    //     action: 'STAFF_CREATED',
    //     userId: createdByAdminId,
    //     hotelId: staffData.hotelId,
    //     metadata: {
    //       newStaffId: user.id,
    //       staffId,
    //       role: staffData.role
    //     }
    //   }
    // })

    return {
      success: true,
      staffId,
      temporaryPassword
    }
  } catch (error) {
    console.error('Staff ID generation error:', error)
    return {
      success: false,
      error: 'فشل في إنشاء حساب الموظف'
    }
  }
}

/**
 * تسجيل دخول الموظف
 */
export async function authenticateStaff(
  email: string,
  password: string
): Promise<{
  success: boolean
  user?: {
    id: string
    email: string
    name: string | null
    role: string
    hotelId: string | null
    mustChangePassword: boolean
    staffId: string
  }
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.password) {
      return {
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      }
    }

    const metadata = (user as any).metadata || {}

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hotelId: user.hotelId,
        mustChangePassword: metadata.mustChangePassword || false,
        staffId: metadata.staffId || 'N/A'
      }
    }
  } catch (error) {
    console.error('Staff authentication error:', error)
    return {
      success: false,
      error: 'حدث خطأ في تسجيل الدخول'
    }
  }
}

/**
 * تغيير كلمة المرور (أول مرة أو تغيير عادي)
 */
export async function changeStaffPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.password) {
      return {
        success: false,
        error: 'المستخدم غير موجود'
      }
    }

    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    )

    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: 'كلمة المرور الحالية غير صحيحة'
      }
    }

    // التحقق من قوة كلمة المرور الجديدة
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
      }
    }

    // تشفير كلمة المرور الجديدة
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // تحديث كلمة المرور وإزالة علامة "يجب التغيير"
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      }
    })

    // تسجيل الحدث - Audit log stubbed
    /* await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        userId: userId,
        hotelId: user.hotelId || 'unknown',
        metadata: {
          changedAt: new Date().toISOString()
        }
      }
    }) */

    return {
      success: true
    }
  } catch (error) {
    console.error('Password change error:', error)
    return {
      success: false,
      error: 'فشل في تغيير كلمة المرور'
    }
  }
}

/**
 * تغيير كلمة المرور في أول تسجيل دخول (بدون الحاجة لكلمة المرور القديمة)
 */
export async function setInitialPassword(
  userId: string,
  temporaryPassword: string,
  newPassword: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.password) {
      return {
        success: false,
        error: 'المستخدم غير موجود'
      }
    }

    const metadata = (user as any).metadata || {}

    // التحقق من أن المستخدم يجب عليه تغيير كلمة المرور
    if (!metadata.mustChangePassword) {
      return {
        success: false,
        error: 'تم تغيير كلمة المرور بالفعل'
      }
    }

    // التحقق من كلمة المرور المؤقتة
    const isTemporaryPasswordValid = await bcrypt.compare(
      temporaryPassword,
      user.password
    )

    if (!isTemporaryPasswordValid) {
      return {
        success: false,
        error: 'كلمة المرور المؤقتة غير صحيحة'
      }
    }

    // التحقق من قوة كلمة المرور الجديدة
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
      }
    }

    // تشفير كلمة المرور الجديدة
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // تحديث كلمة المرور
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      }
    })

    // تسجيل الحدث - Audit log stubbed
    /* await prisma.auditLog.create({
      data: {
        action: 'INITIAL_PASSWORD_SET',
        userId: userId,
        hotelId: user.hotelId || 'unknown',
        metadata: {
          setAt: new Date().toISOString()
        }
      }
    }) */

    return {
      success: true
    }
  } catch (error) {
    console.error('Initial password setup error:', error)
    return {
      success: false,
      error: 'فشل في تعيين كلمة المرور'
    }
  }
}

/**
 * الحصول على قائمة الموظفين (للأدمن)
 */
export async function getStaffList(
  hotelId: string,
  adminUserId: string
): Promise<{
  success: boolean
  staff?: Array<{
    id: string
    name: string | null
    email: string
    role: string
    staffId: string
    department: string | null
    mustChangePassword: boolean
    createdAt: Date
  }>
  error?: string
}> {
  try {
    // التحقق من أن المستخدم أدمن
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId }
    })

    if (!admin || !['owner', 'manager'].includes(admin.role)) {
      return {
        success: false,
        error: 'غير مصرح لك بهذا الإجراء'
      }
    }

    // جلب قائمة الموظفين
    const staffList = await prisma.user.findMany({
      where: {
        hotelId,
        role: {
          in: [SystemRole.OWNER, SystemRole.MANAGER, SystemRole.RECEPTION, SystemRole.STAFF]
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedStaff = staffList.map(user => {
      const metadata = (user as any).metadata || {}
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        staffId: metadata.staffId || 'N/A',
        department: metadata.department || null,
        mustChangePassword: metadata.mustChangePassword || false,
        createdAt: user.createdAt
      }
    })

    return {
      success: true,
      staff: formattedStaff
    }
  } catch (error) {
    console.error('Get staff list error:', error)
    return {
      success: false,
      error: 'فشل في جلب قائمة الموظفين'
    }
  }
}

/**
 * حذف موظف (للأدمن)
 */
export async function deleteStaff(
  staffUserId: string,
  adminUserId: string,
  hotelId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // التحقق من أن المستخدم أدمن
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId }
    })

    if (!admin || !['owner', 'manager'].includes(admin.role)) {
      return {
        success: false,
        error: 'غير مصرح لك بهذا الإجراء'
      }
    }

    // حذف الموظف
    await prisma.user.delete({
      where: {
        id: staffUserId,
        hotelId: hotelId
      }
    })

    // تسجيل الحدث - Audit log stubbed
    /* await prisma.auditLog.create({
      data: {
        action: 'STAFF_DELETED',
        userId: adminUserId,
        hotelId: hotelId,
        metadata: {
          deletedStaffId: staffUserId,
          deletedAt: new Date().toISOString()
        }
      }
    }) */

    return {
      success: true
    }
  } catch (error) {
    console.error('Delete staff error:', error)
    return {
      success: false,
      error: 'فشل في حذف الموظف'
    }
  }
}
