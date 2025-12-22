import { NextRequest, NextResponse } from 'next/server'
import { validateGuestIdentity, createGuestSession } from '@/lib/services/guestSessionService'
import { badRequest, notFound, internalError } from '@/lib/api/errorHandler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/guest/session/create
 * Create authenticated guest session
 * - Validates guest identity (second time, for security)
 * - Creates temporary session with token
 * - Session expires at checkout date or 24h (whichever is sooner)
 * - Returns session token for chat access
 *
 * Request: { hotelId, documentType, documentNumber }
 * Response: { success, sessionId, sessionToken, redirectUrl }
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
        { endpoint: '/api/guest/session/create', method: 'POST' }
      )
    }

    const { hotelId, documentType, documentNumber } = body

    // Validate required fields
    if (!hotelId || !documentType || !documentNumber) {
      return badRequest(
        'Missing required fields: hotelId, documentType, documentNumber',
        { endpoint: '/api/guest/session/create', method: 'POST', hotelId },
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
        { endpoint: '/api/guest/session/create', method: 'POST', hotelId }
      )
    }

    // Validate guest identity (second validation for security)
    // DB operation: wrapped in service layer
    const validatedGuest = await validateGuestIdentity(
      hotelId,
      documentType as 'passport' | 'national_id',
      documentNumber.trim()
    )

    if (!validatedGuest) {
      return notFound(
        'Could not verify your identity or active booking',
        { endpoint: '/api/guest/session/create', method: 'POST', hotelId }
      )
    }

    // Create ephemeral session
    // DB operation: wrapped in service layer
    const sessionResult = await createGuestSession(hotelId, validatedGuest)

    return NextResponse.json({
      success: true,
      sessionId: sessionResult.sessionId,
      sessionToken: sessionResult.sessionToken,
      redirectUrl: `/guest/chat?sessionId=${sessionResult.sessionId}`,
      expiresAt: sessionResult.expiresAt
    })
  } catch (error: any) {
    return internalError(
      error,
      { endpoint: '/api/guest/session/create', method: 'POST' },
      'Session creation failed. Please try again.'
    )
  }
}
