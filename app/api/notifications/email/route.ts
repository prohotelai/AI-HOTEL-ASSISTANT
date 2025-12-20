export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import {
  initializeEmailService,
  getEmailService,
  type CheckInData,
  type CheckoutInvoiceData,
  type WorkOrderAssignmentData
} from '@/lib/email/service'

// Initialize email service at module load
const emailService = initializeEmailService({
  provider: (process.env.EMAIL_PROVIDER || 'smtp') as 'smtp' | 'resend',
  from: process.env.EMAIL_FROM || 'noreply@hotelassistant.com',
  hotelName: 'Hotel Assistant'
})

// Send check-in confirmation
export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    if (!action || !['check-in', 'checkout', 'work-order', 'booking', 'inventory-alert'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.hotelId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Send email based on action
    let success = false

    switch (action) {
      case 'check-in':
        const checkInData: CheckInData = {
          guestName: data.guestName,
          email: data.email,
          hotelName: data.hotelName,
          checkInDate: data.checkInDate,
          roomNumber: data.roomNumber,
          roomType: data.roomType,
          numberOfGuests: data.numberOfGuests,
          specialRequests: data.specialRequests,
          hotelAddress: data.hotelAddress,
          hotelPhone: data.hotelPhone,
          checkInTime: data.checkInTime
        }
        await getEmailService().sendCheckInConfirmation(checkInData)
        success = true
        break

      case 'checkout':
        const checkoutData: CheckoutInvoiceData = {
          guestName: data.guestName,
          email: data.email,
          hotelName: data.hotelName,
          checkOutDate: data.checkOutDate,
          roomNumber: data.roomNumber,
          numberOfNights: data.numberOfNights,
          subtotal: data.subtotal,
          tax: data.tax,
          total: data.total,
          paymentMethod: data.paymentMethod,
          bookingId: data.bookingId
        }
        await getEmailService().sendCheckoutInvoice(checkoutData)
        success = true
        break

      case 'work-order':
        const workOrderData: WorkOrderAssignmentData = {
          staffName: data.staffName,
          email: data.email,
          hotelName: data.hotelName,
          workOrderId: data.workOrderId,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          location: data.location,
          dueDate: data.dueDate,
          estimatedTime: data.estimatedTime
        }
        await getEmailService().sendWorkOrderAssignment(workOrderData)
        success = true
        break

      case 'booking':
        const bookingData = {
          guestName: data.guestName,
          email: data.email,
          hotelName: data.hotelName,
          bookingId: data.bookingId,
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          roomNumber: data.roomNumber,
          totalPrice: data.totalPrice,
          numberOfGuests: data.numberOfGuests,
          specialRequests: data.specialRequests
        }
        await getEmailService().sendBookingConfirmation(bookingData)
        success = true
        break

      case 'inventory-alert':
        const inventoryData = {
          email: data.email,
          hotelName: data.hotelName,
          itemName: data.itemName,
          quantity: data.quantity,
          minimumThreshold: data.minimumThreshold,
          category: data.category
        }
        await getEmailService().sendLowInventoryAlert(inventoryData)
        success = true
        break
    }

    if (success) {
      return NextResponse.json({ success: true, message: `${action} email sent successfully` })
    }

    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  } catch (error) {
    console.error('Email service error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}

// Batch send emails
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.hotelId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emails } = await request.json()

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 })
    }

    let successful = 0
    let failed = 0

    for (const email of emails) {
      try {
        // Create payload based on email action
        const payload = {
          action: email.action,
          data: email.data
        }

        // Use the POST endpoint's logic
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          successful++
        } else {
          failed++
        }
      } catch (err) {
        failed++
        console.error('Error sending email:', err)
      }
    }

    return NextResponse.json({
      success: true,
      successful,
      failed,
      total: emails.length
    })
  } catch (error) {
    console.error('Batch email error:', error)
    return NextResponse.json({ error: 'Failed to process batch emails' }, { status: 500 })
  }
}
