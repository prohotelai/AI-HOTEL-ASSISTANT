export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API - توليد رمز QR للنزيل
 * Generate Guest QR Token API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRole } from '@/lib/middleware/rbac'
import { generateGuestQRToken } from '@/lib/auth/guestAuth'

/**
 * POST /api/auth/guest/qr-token
 * توليد رمز QR للنزيل بعد الإسكان
 */
export const POST = withRole(['owner', 'manager', 'reception'])(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    const body = await req.json()
    const { guestId, stayId } = body

    if (!guestId || !stayId) {
      return NextResponse.json(
        { 
          error: 'معرف النزيل ومعرف الإقامة مطلوبان',
          message: 'Guest ID and stay ID are required'
        },
        { status: 400 }
      )
    }

    const result = await generateGuestQRToken(
      guestId,
      user.hotelId
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم توليد رمز QR بنجاح',
      token: (result as any).token,
      qrCode: (result as any).qrCode,
      instructions: {
        ar: 'قم بطباعة أو إرسال رمز QR للنزيل. يمكنه مسحه للدخول بسرعة.',
        en: 'Print or send the QR code to the guest. They can scan it for quick access.'
      }
    })
  } catch (error) {
    console.error('Generate guest QR token error:', error)
    return NextResponse.json(
      { error: 'فشل في توليد رمز QR' },
      { status: 500 }
    )
  }
})
