import { NextRequest, NextResponse } from 'next/server'
import { validateGuestIdentity, getGuestCheckoutDate } from '@/lib/services/guestSessionService'
import { badRequest, notFound, internalError } from '@/lib/api/errorHandler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/guest/validate
 * Validate guest identity via passport or national ID
 * - Check guest exists in hotel
 * - Check document matches
 * - Verify current date is within stay period
 * - Returns guest info if valid, error if not
 *
 * Request: { hotelId, documentType, documentNumber }
 * Response: { success, guest: { firstName, lastName, roomNumber, checkOutDate } }
 * 
 * Error Handling:
 * - 400: Invalid input (missing fields, bad format)
 * - 404: Guest not found or no active booking
 * - 500: Database errors (wrapped in try/catch)
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body with error handling
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      return badRequest(
        'Invalid JSON in request body',
        { endpoint: '/api/guest/validate', method: 'POST' }
      )
    }

    const { hotelId, documentType, documentNumber } = body

    // Validate required fields
    if (!hotelId || !documentType || !documentNumber) {
      return badRequest(
        'Missing required fields: hotelId, documentType, documentNumber',
        { endpoint: '/api/guest/validate', method: 'POST', hotelId },
        {
          missing: [
            !hotelId && 'hotelId',
            !documentType && 'documentType',
            !documentNumber && 'documentNumber'
          ].filter(Boolean)
        }
      )
    }

    // Validate document type
    if (!['passport', 'national_id'].includes(documentType)) {
      return badRequest(
        'Invalid documentType. Must be "passport" or "national_id"',
        { endpoint: '/api/guest/validate', method: 'POST', hotelId }
      )
    }

    // Validate document number format (basic)
    if (typeof documentNumber !== 'string' || documentNumber.trim().length < 3) {
      return badRequest(
        'Document number must be at least 3 characters',
        { endpoint: '/api/guest/validate', method: 'POST', hotelId }
      )
    }

    // Get guest details for display (verification step)
    // DB operation: wrapped in service layer
    const guestInfo = await getGuestCheckoutDate(
      hotelId,
      documentType as 'passport' | 'national_id',
      documentNumber.trim()
    )

    if (!guestInfo) {
      // Guest not found or no active booking
      return notFound(
        'No guest with this document ID found or you do not have an active booking',
        { endpoint: '/api/guest/validate', method: 'POST', hotelId }
      )
    }

    return NextResponse.json({
      success: true,
      guest: {
        guestName: guestInfo.guestName,
        roomNumber: guestInfo.roomNumber,
        checkInDate: guestInfo.checkInDate,
        checkOutDate: guestInfo.checkOutDate
      }
    })
  } catch (error: any) {
    return internalError(
      error,
      { endpoint: '/api/guest/validate', method: 'POST' },
      'Guest validation failed. Please try again.'
    )
  }
}
