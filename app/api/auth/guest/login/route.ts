/**
 * API - تسجيل دخول النزلاء
 * Guest Login API
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateGuest, 
  generateGuestQRToken,
  verifyGuestQRToken 
} from '@/lib/auth/guestAuth'

/**
 * POST /api/auth/guest/login
 * تسجيل دخول النزيل برقم جواز السفر
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { passportNumber, hotelId } = body

    if (!passportNumber || !hotelId) {
      return NextResponse.json(
        { 
          error: 'رقم الجواز ومعرف الفندق مطلوبان',
          message: 'Passport number and hotel ID are required'
        },
        { status: 400 }
      )
    }

    const result = await authenticateGuest(passportNumber, hotelId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      guest: (result as any).guest
    })
  } catch (error) {
    console.error('Guest login error:', error)
    return NextResponse.json(
      { error: 'فشل في تسجيل الدخول' },
      { status: 500 }
    )
  }
}
