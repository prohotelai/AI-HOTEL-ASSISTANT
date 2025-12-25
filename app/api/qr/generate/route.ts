export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/generate
 * DEPRECATED - QR codes are now permanent (generated on hotel creation)
 * This endpoint has been disabled
 */

import { NextRequest, NextResponse } from 'next/server';

async function handleQRGenerate(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'QR code generation is no longer available',
      message: 'Hotel QR codes are now permanent and generated automatically when a hotel is created. Use GET /api/qr/[hotelId] to retrieve your hotel\'s QR code.',
      deprecated: true,
      migration: {
        endpoint: 'GET /api/qr/[hotelId]',
        description: 'Retrieve your permanent hotel QR code'
      }
    },
    { status: 410 } // 410 Gone - resource no longer available
  );
}

export const POST = handleQRGenerate
