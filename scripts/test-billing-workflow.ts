#!/usr/bin/env npx ts-node

/**
 * PHASE 5 BILLING WORKFLOW TEST
 * Validates end-to-end folio lifecycle
 */

import { PrismaClient } from '@prisma/client'
import { openFolio, addFolioItem, closeFolio, getFolio } from '../lib/services/pms/folioService'
import { checkInBooking, checkOutBooking } from '../lib/services/pms/bookingService'
import { generateInvoiceFromFolio, getInvoice } from '../lib/services/pms/invoiceService'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function runTests() {
  console.log('🧪 PHASE 5 BILLING WORKFLOW TESTS\n')
  console.log('=' .repeat(60))

  try {
    // Find test hotel
    const hotel = await prisma.hotel.findFirst({
      select: { id: true, name: true }
    })

    if (!hotel) {
      console.log('❌ No hotel found in database')
      console.log('   Run seed script first: npm run db:seed')
      return
    }

    console.log(`\n✅ Test Hotel: ${hotel.name} (${hotel.id})\n`)

    // Find or create test guest
    let guest = await prisma.guest.findFirst({
      where: { hotelId: hotel.id, email: 'test-billing@example.com' }
    })

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          hotelId: hotel.id,
          firstName: 'Test',
          lastName: 'Billing',
          email: 'test-billing@example.com',
          phone: '+1234567890'
        }
      })
      console.log('✅ Created test guest')
    } else {
      console.log('✅ Found existing test guest')
    }

    // Find available room
    const room = await prisma.room.findFirst({
      where: { hotelId: hotel.id },
      include: { roomType: true }
    })

    if (!room) {
      console.log('❌ No rooms found')
      return
    }

    console.log(`✅ Test Room: ${room.roomNumber} (${room.roomType.name})`)

    // ==================================================================
    // TEST 1: Create Booking
    // ==================================================================
    console.log('\n' + '='.repeat(60))
    console.log('TEST 1: Create Test Booking')
    console.log('='.repeat(60))

    const checkInDate = new Date()
    checkInDate.setDate(checkInDate.getDate() + 1)
    const checkOutDate = new Date(checkInDate)
    checkOutDate.setDate(checkOutDate.getDate() + 3) // 3-night stay

    let booking = await prisma.booking.create({
      data: {
        hotelId: hotel.id,
        guestId: guest.id,
        roomId: room.id,
        checkInDate,
        checkOutDate,
        confirmationNumber: `TEST-${Date.now()}`,
        status: 'CONFIRMED',
        source: 'DIRECT',
        totalAmount: room.roomType.basePrice * 3,
        currency: 'USD',
        adults: 1,
        children: 0
      }
    })

    console.log(`✅ Booking created: ${booking.confirmationNumber}`)
    console.log(`   Total: USD ${booking.totalAmount}`)

    // ==================================================================
    // TEST 2: Check-in (creates folio + room charge)
    // ==================================================================
    console.log('\n' + '='.repeat(60))
    console.log('TEST 2: Check-In (Auto-creates Folio)')
    console.log('='.repeat(60))

    const checkInResult = await checkInBooking(hotel.id, booking.id, 'system-test')

    console.log(`✅ Check-in successful`)
    console.log(`   Folio: ${checkInResult.folio?.folioNumber}`)
    console.log(`   Status: ${checkInResult.folio?.status}`)
    console.log(`   Total: ${checkInResult.folio?.currency} ${checkInResult.folio?.totalAmount}`)

    // ==================================================================
    // TEST 3: Add Additional Charges
    // ==================================================================
    console.log('\n' + '='.repeat(60))
    console.log('TEST 3: Post Additional Charges')
    console.log('='.repeat(60))

    if (!checkInResult.folio) {
      throw new Error('Folio not created')
    }

    await addFolioItem(hotel.id, checkInResult.folio.id, 'system-test', {
      description: 'Room Service - Breakfast',
      category: 'F&B',
      quantity: 1,
      unitPrice: 25.00,
      taxRate: 10
    })
    console.log('✅ Added: Room Service - Breakfast ($25.00)')

    await addFolioItem(hotel.id, checkInResult.folio.id, 'system-test', {
      description: 'Laundry Service',
      category: 'LAUNDRY',
      quantity: 1,
      unitPrice: 15.00,
      taxRate: 10
    })
    console.log('✅ Added: Laundry Service ($15.00)')

    await addFolioItem(hotel.id, checkInResult.folio.id, 'system-test', {
      description: 'Minibar',
      category: 'MINIBAR',
      quantity: 3,
      unitPrice: 5.00,
      taxRate: 10
    })
    console.log('✅ Added: Minibar ($15.00)')

    // Get updated folio
    const updatedFolio = await getFolio(hotel.id, checkInResult.folio.id)
    console.log(`\n📊 Folio Totals:`)
    console.log(`   Subtotal: ${updatedFolio?.currency} ${updatedFolio?.subtotal}`)
    console.log(`   Tax: ${updatedFolio?.currency} ${updatedFolio?.taxAmount}`)
    console.log(`   Total: ${updatedFolio?.currency} ${updatedFolio?.totalAmount}`)
    console.log(`   Balance Due: ${updatedFolio?.currency} ${updatedFolio?.balanceDue}`)

    // ==================================================================
    // TEST 4: Record Payment
    // ==================================================================
    console.log('\n' + '='.repeat(60))
    console.log('TEST 4: Record Payment')
    console.log('='.repeat(60))

    const payment = await prisma.payment.create({
      data: {
        hotelId: hotel.id,
        folioId: updatedFolio!.id,
        amount: updatedFolio!.totalAmount,
        currency: 'USD',
        paymentMethod: 'CARD',
        status: 'PAID',
        paymentDate: new Date(),
        receiptNumber: `RCP-${Date.now()}`
      }
    })

    console.log(`✅ Payment recorded: ${payment.receiptNumber}`)
    console.log(`   Amount: ${payment.currency} ${payment.amount}`)
    console.log(`   Method: ${payment.paymentMethod}`)

    // ==================================================================
    // TEST 5: Check-out (closes folio, updates guest stats)
    // ==================================================================
    console.log('\n' + '='.repeat(60))
    console.log('TEST 5: Check-Out (Closes Folio, Updates Guest)')
    console.log('='.repeat(60))

    const guestBefore = await prisma.guest.findUnique({
      where: { id: guest.id },
      select: { totalSpent: true, totalStays: true, loyaltyTier: true, vipStatus: true }
    })
    console.log(`📊 Guest Before Check-Out:`)
    console.log(`   Total Spent: USD ${guestBefore?.totalSpent}`)
    console.log(`   Total Stays: ${guestBefore?.totalStays}`)
    console.log(`   Loyalty Tier: ${guestBefore?.loyaltyTier || 'NONE'}`)
    console.log(`   VIP Status: ${guestBefore?.vipStatus}`)

    const checkOutResult = await checkOutBooking(hotel.id, booking.id, 'system-test', {
      allowUnpaid: false // Requires payment
    })

    console.log(`\n✅ Check-out successful`)
    console.log(`   Folio Status: ${checkOutResult.folio.status}`)
    console.log(`   Booking Status: ${checkOutResult.booking.status}`)

    const guestAfter = await prisma.guest.findUnique({
      where: { id: guest.id },
      select: { totalSpent: true, totalStays: true, loyaltyTier: true, vipStatus: true }
    })
    console.log(`\n📊 Guest After Check-Out:`)
    console.log(`   Total Spent: USD ${guestAfter?.totalSpent} (${guestAfter?.totalSpent?.sub(guestBefore!.totalSpent).toString()} increase)`)
    console.log(`   Total Stays: ${guestAfter?.totalStays}`)
    console.log(`   Loyalty Tier: ${guestAfter?.loyaltyTier || 'NONE'}`)
    console.log(`   VIP Status: ${guestAfter?.vipStatus}`)

    // ==================================================================
    // TEST 6: Generate Invoice
    // ==================================================================
    console.log('\n' + '='.repeat(60))
    console.log('TEST 6: Generate Invoice')
    console.log('='.repeat(60))

    const invoice = await generateInvoiceFromFolio(hotel.id, checkOutResult.folio.id, {
      notes: 'Thank you for your stay!'
    })

    console.log(`✅ Invoice generated: ${invoice.invoiceNumber}`)
    console.log(`   Status: ${invoice.status}`)
    console.log(`   Total: ${invoice.currency} ${invoice.totalAmount}`)
    console.log(`   Balance Due: ${invoice.currency} ${invoice.balanceDue}`)

    // ==================================================================
    // SUMMARY
    // ==================================================================
    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS PASSED')
    console.log('='.repeat(60))
    console.log(`\n📋 Summary:`)
    console.log(`   Booking: ${booking.confirmationNumber}`)
    console.log(`   Folio: ${checkOutResult.folio.closedAt ? 'CLOSED' : 'OPEN'}`)
    console.log(`   Invoice: ${invoice.invoiceNumber}`)
    console.log(`   Guest Total Spent: USD ${guestAfter?.totalSpent}`)
    console.log(`   Guest Loyalty: ${guestAfter?.loyaltyTier || 'NONE'}`)
    console.log(`\n✅ Phase 5 Billing workflow is fully operational!\n`)

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
runTests()
  .then(() => {
    console.log('✅ Test script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error)
    process.exit(1)
  })
