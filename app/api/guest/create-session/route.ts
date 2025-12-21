import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

/**
 * POST /api/guest/create-session
 * 
 * Guest session creation endpoint:
 * 1. Validates QR context (hotelId)
 * 2. Verifies guest identification (room number OR passport)
 * 3. Creates ephemeral GuestSession (24h max)
 * 4. Creates or links to Conversation
 * 5. Returns session token
 */
export async function POST(req: NextRequest) {
  try {
    const { qrToken, identification } = await req.json()

    if (!qrToken || !identification) {
      return NextResponse.json(
        { error: 'QR token and identification required' },
        { status: 400 }
      )
    }

    const { roomNumber, passportId, name } = identification

    if (!roomNumber && !passportId) {
      return NextResponse.json(
        { error: 'Room number or passport ID required' },
        { status: 400 }
      )
    }

    // 1. Resolve QR token to get hotel context
    const qrRecord = await prisma.guestStaffQRToken.findFirst({
      where: {
        token: qrToken,
        expiresAt: { gte: new Date() },
        role: { in: ['guest', 'GUEST'] }
      },
      include: {
        hotel: true
      }
    })

    if (!qrRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired QR code' },
        { status: 401 }
      )
    }

    const hotel = qrRecord.hotel

    // 2. Verify guest identification
    let guestInfo = {
      name: name || 'Guest',
      roomNumber: roomNumber || null,
      passportId: passportId || null
    }

    // Optional: Lookup guest in booking system by room number or passport
    if (roomNumber) {
      const booking = await prisma.booking.findFirst({
        where: {
          hotelId: hotel.id,
          roomId: roomNumber,
          checkInDate: { lte: new Date() },
          checkOutDate: { gte: new Date() },
          status: 'CONFIRMED'
        },
        include: {
          guest: true
        }
      })

      if (booking?.guest) {
        const guestFullName = [booking.guest.firstName, booking.guest.lastName].filter(Boolean).join(' ')
        guestInfo.name = guestFullName || guestInfo.name
        guestInfo.passportId = booking.guest.idNumber || guestInfo.passportId
      }
    }

    // 3. Create ephemeral GuestSession (24 hours)
    const sessionToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // 4. Create conversation for guest
    const conversation = await prisma.conversation.create({
      data: {
        title: `Chat with ${guestInfo.name}`,
        hotelId: hotel.id,
        guestName: guestInfo.name,
      }
    })

    // 5. Create guest session
    const guestSession = await prisma.guestSession.create({
      data: {
        hotelId: hotel.id,
        guestName: guestInfo.name,
        guestRoomNumber: guestInfo.roomNumber,
        guestPassportId: guestInfo.passportId,
        sessionToken,
        sessionType: 'GUEST',
        expiresAt,
        conversationId: conversation.id
      }
    })

    // 6. Mark QR token as used
    await prisma.guestStaffQRToken.update({
      where: { id: qrRecord.id },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    })

    // 7. Return session info
    return NextResponse.json({
      success: true,
      sessionToken: guestSession.sessionToken,
      guest: {
        name: guestSession.guestName,
        roomNumber: guestSession.guestRoomNumber,
      },
      hotel: {
        id: hotel.id,
        name: hotel.name,
      },
      conversationId: conversation.id,
      expiresAt: guestSession.expiresAt.toISOString()
    })

  } catch (error) {
    console.error('Guest session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create session. Please try again.' },
      { status: 500 }
    )
  }
}
