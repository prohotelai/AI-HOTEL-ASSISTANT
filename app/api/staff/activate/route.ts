/**
 * Staff Activation API Endpoints
 * 
 * POST /api/staff/activate/validate
 *   - Validate staffId exists and is PENDING
 *   - Check hotelId matches
 *   - Return staff details or error
 * 
 * POST /api/staff/activate
 *   - Create user account with password
 *   - Link user to staff record
 *   - Set status to ACTIVE
 *   - Return auth credentials
 * 
 * Error Handling:
 * - All DB operations wrapped in try/catch
 * - 400 for invalid input
 * - 404 for not found
 * - 409 for invalid status
 * - 500 for internal errors (never exposed raw)
 * - Comprehensive logging with hotelId, endpoint, method
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateStaffForActivation,
  activateStaff,
  getStaffForActivation
} from '@/lib/services/staffActivationService'
import { badRequest, notFound, conflict, internalError } from '@/lib/api/errorHandler'
import { signIn } from 'next-auth/react'

/**
 * POST /api/staff/activate/validate
 * Validate staffId exists and can be activated
 */
export async function POST(req: NextRequest) {
  // Check if this is validate or activate based on query params
  const url = new URL(req.url)
  const isValidate = url.searchParams.get('validate') === 'true'

  try {
    // Parse request body with error handling
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      return badRequest(
        'Invalid JSON in request body',
        { endpoint: '/api/staff/activate', method: 'POST' }
      )
    }

    const { hotelId, staffId } = body

    // Validate required fields
    if (!hotelId || !staffId) {
      return badRequest(
        'Missing required fields: hotelId and staffId',
        { endpoint: '/api/staff/activate', method: 'POST', hotelId },
        {
          missing: [
            !hotelId && 'hotelId',
            !staffId && 'staffId'
          ].filter(Boolean)
        }
      )
    }

    if (isValidate) {
      // VALIDATE only - check if staff can be activated
      // DB operation: wrapped in try/catch
      const staff = await getStaffForActivation(hotelId, staffId)

      if (!staff) {
        return notFound(
          'Staff record not found',
          { endpoint: '/api/staff/activate', method: 'POST', hotelId, staffId }
        )
      }

      if (!staff.canActivate) {
        return conflict(
          `Staff account cannot be activated. Current status: ${staff.status}`,
          { endpoint: '/api/staff/activate', method: 'POST', hotelId, staffId, status: staff.status }
        )
      }

      // Return staff info (name, email, role) for confirmation
      return NextResponse.json({
        success: true,
        staff: {
          id: staff.id,
          staffId: staff.staffId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          staffRole: staff.staffRole
        }
      })
    }

    return badRequest(
      'Invalid request. Use ?validate=true to check staff status',
      { endpoint: '/api/staff/activate', method: 'POST', hotelId }
    )
  } catch (error: any) {
    return internalError(
      error,
      { endpoint: '/api/staff/activate', method: 'POST' },
      'Staff validation failed. Please try again.'
    )
  }
}
