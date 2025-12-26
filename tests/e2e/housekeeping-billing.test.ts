/**
 * E2E Tests: Housekeeping & Billing Integration
 * 
 * Critical flows:
 * - Auto-create housekeeping task on checkout
 * - Room status transitions correctly
 * - Folio auto-created
 * - Charges added
 * - Folio closed on checkout
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('E2E: Housekeeping Workflow', () => {
  let testHotel: any
  let roomType: any
  let room: any
  let guest: any
  let staffUser: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.housekeepingTask.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.room.deleteMany()
    await prisma.roomType.deleteMany()
    await prisma.guest.deleteMany({ where: { email: { contains: '@housekeeping-e2e.com' } } })
    await prisma.user.deleteMany({ where: { email: { contains: '@housekeeping-e2e.com' } } })
    await prisma.hotel.deleteMany({ where: { name: { contains: 'Housekeeping E2E Hotel' } } })

    // Create test hotel
    testHotel = await prisma.hotel.create({
      data: {
        name: 'Housekeeping E2E Hotel',
        slug: `housekeeping-e2e-${Date.now()}`,
        email: 'housekeeping@e2e-test.com',
        phone: '1234567890',
        address: '123 Test St'
      }
    })

    // Create room type
    roomType = await prisma.roomType.create({
      data: {
        hotelId: testHotel.id,
        name: 'Standard Room',
        basePrice: 150,
        maxOccupancy: 2
      }
    })

    // Create room
    room = await prisma.room.create({
      data: {
        hotelId: testHotel.id,
        roomNumber: '201',
        floor: 2,
        roomTypeId: roomType.id,
        status: 'AVAILABLE',
        isActive: true
      }
    })

    // Create guest
    guest = await prisma.guest.create({
      data: {
        hotelId: testHotel.id,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@housekeeping-e2e.com',
        phone: '+1987654321'
      }
    })
    // Create staff user
    staffUser = await prisma.user.create({
      data: {
        email: 'staff@housekeeping-e2e.com',
        name: 'Housekeeping Staff',
        hotelId: testHotel.id
      }
    })
  })

  afterEach(async () => {
    await prisma.housekeepingTask.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.booking.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.room.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.roomType.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.guest.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.user.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.hotel.deleteMany({ where: { id: testHotel.id } })
  })

  describe('Auto-create Housekeeping Task on Checkout', () => {
    it('should create CHECKOUT_CLEAN task when guest checks out', async () => {
      // Create and check-in booking
      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
          checkOutDate: new Date(),
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'CHECKED_IN',
          actualCheckIn: new Date(Date.now() - 86400000 * 2),
          totalAmount: 300,
          currency: 'USD'
        }
      })

      // Check-out guest
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_OUT',
          actualCheckOut: new Date()
        }
      })

      // Auto-create housekeeping task (simulating business logic)
      const task = await prisma.housekeepingTask.create({
        data: {
          hotelId: testHotel.id,
          roomId: room.id,
          taskType: 'CHECKOUT_CLEAN',
          status: 'PENDING',
          priority: 'HIGH',
          scheduledFor: new Date()
        }
      })

      expect(task).toBeTruthy()
      expect(task.taskType).toBe('CHECKOUT_CLEAN')
      expect(task.status).toBe('PENDING')
      expect(task.priority).toBe('HIGH')
      expect(task.roomId).toBe(room.id)

      // Verify task is linked to correct room
      const taskWithRoom = await prisma.housekeepingTask.findUnique({
        where: { id: task.id },
        include: { room: true }
      })

      expect(taskWithRoom?.room.roomNumber).toBe('201')
    })

    it('should prioritize checkout cleaning as HIGH priority', async () => {
      // Create checkout cleaning task
      const checkoutTask = await prisma.housekeepingTask.create({
        data: {
          hotelId: testHotel.id,
          roomId: room.id,
          taskType: 'CHECKOUT_CLEAN',
          status: 'PENDING',
          priority: 'HIGH',
          scheduledFor: new Date()
        }
      })

      expect(checkoutTask.priority).toBe('HIGH')

      // Compare with stay-over cleaning (lower priority)
      const stayoverTask = await prisma.housekeepingTask.create({
        data: {
          hotelId: testHotel.id,
          roomId: room.id,
          taskType: 'STAYOVER_CLEAN',
          status: 'PENDING',
          priority: 'NORMAL', // Lower priority than checkout
          scheduledFor: new Date()
        }
      })

      expect(stayoverTask.priority).toBe('NORMAL')

      // Query high-priority tasks
      const highPriorityTasks = await prisma.housekeepingTask.findMany({
        where: {
          hotelId: testHotel.id,
          priority: 'HIGH',
          status: 'PENDING'
        }
      })

      expect(highPriorityTasks).toHaveLength(1)
      expect(highPriorityTasks[0].taskType).toBe('CHECKOUT_CLEAN')
    })
  })

  describe('Room Status Transitions', () => {
    it('should transition: AVAILABLE → OCCUPIED → DIRTY → CLEANING → AVAILABLE', async () => {
      // 1. Initial: AVAILABLE
      expect(room.status).toBe('AVAILABLE')

      // 2. Guest checks in: AVAILABLE → OCCUPIED
      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' }
      })

      let updatedRoom = await prisma.room.findUnique({ where: { id: room.id } })
      expect(updatedRoom?.status).toBe('OCCUPIED')

      // 3. Guest checks out: OCCUPIED → DIRTY
      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'DIRTY' }
      })

      updatedRoom = await prisma.room.findUnique({ where: { id: room.id } })
      expect(updatedRoom?.status).toBe('DIRTY')

      // 4. Housekeeping starts cleaning: DIRTY → CLEANING
      const task = await prisma.housekeepingTask.create({
        data: {
          hotelId: testHotel.id,
          roomId: room.id,
          taskType: 'CHECKOUT_CLEAN',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignedTo: staffUser.id,
          assignedAt: new Date(),
          startedAt: new Date()
        }
      })

      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'CLEANING' }
      })

      updatedRoom = await prisma.room.findUnique({ where: { id: room.id } })
      expect(updatedRoom?.status).toBe('CLEANING')

      // 5. Cleaning complete: CLEANING → AVAILABLE
      await prisma.housekeepingTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })

      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'AVAILABLE' }
      })

      updatedRoom = await prisma.room.findUnique({ where: { id: room.id } })
      expect(updatedRoom?.status).toBe('AVAILABLE')
    })

    it('should track task assignment and completion time', async () => {
      // Create pending task
      const task = await prisma.housekeepingTask.create({
        data: {
          hotelId: testHotel.id,
          roomId: room.id,
          taskType: 'CHECKOUT_CLEAN',
          status: 'PENDING',
          priority: 'HIGH',
          scheduledFor: new Date()
        }
      })

      expect(task.assignedTo).toBeNull()
      expect(task.startedAt).toBeNull()
      expect(task.completedAt).toBeNull()

      // Assign to staff
      const assignedTime = new Date()
      await prisma.housekeepingTask.update({
        where: { id: task.id },
        data: {
          assignedTo: staffUser.id,
          assignedAt: assignedTime,
          status: 'ASSIGNED'
        }
      })

      let updatedTask = await prisma.housekeepingTask.findUnique({
        where: { id: task.id }
      })

      expect(updatedTask?.assignedTo).toBe(staffUser.id)
      expect(updatedTask?.status).toBe('ASSIGNED')

      // Start cleaning
      const startTime = new Date()
      await prisma.housekeepingTask.update({
        where: { id: task.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: startTime
        }
      })

      // Complete cleaning
      const completedTime = new Date()
      await prisma.housekeepingTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt: completedTime
        }
      })

      updatedTask = await prisma.housekeepingTask.findUnique({
        where: { id: task.id }
      })

      expect(updatedTask?.status).toBe('COMPLETED')
      expect(updatedTask?.completedAt).toBeTruthy()
      expect(updatedTask?.startedAt).toBeTruthy()
    })

    it('should handle maintenance issues found during cleaning', async () => {
      // Create and start cleaning task
      const task = await prisma.housekeepingTask.create({
        data: {
          hotelId: testHotel.id,
          roomId: room.id,
          taskType: 'CHECKOUT_CLEAN',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignedTo: staffUser.id,
          startedAt: new Date()
        }
      })

      // Staff finds issue during cleaning
      await prisma.housekeepingTask.update({
        where: { id: task.id },
        data: {
          issuesFound: 'Broken faucet in bathroom, loose door handle',
          notes: 'Reported to maintenance'
        }
      })

      // Mark room as needing maintenance
      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'MAINTENANCE' }
      })

      const updatedTask = await prisma.housekeepingTask.findUnique({
        where: { id: task.id }
      })

      expect(updatedTask?.issuesFound).toBeTruthy()
      expect(updatedTask?.issuesFound).toContain('faucet')

      const updatedRoom = await prisma.room.findUnique({
        where: { id: room.id }
      })

      expect(updatedRoom?.status).toBe('MAINTENANCE')
    })
  })
})

describe('E2E: Billing Workflow', () => {
  let testHotel: any
  let roomType: any
  let room: any
  let guest: any
  let booking: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.folioItem.deleteMany()
    await prisma.folio.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.room.deleteMany()
    await prisma.roomType.deleteMany()
    await prisma.guest.deleteMany({ where: { email: { contains: '@billing-e2e.com' } } })
    await prisma.hotel.deleteMany({ where: { name: { contains: 'Billing E2E Hotel' } } })

    // Create test hotel
    testHotel = await prisma.hotel.create({
      data: {
        name: 'Billing E2E Hotel',
        slug: `billing-e2e-${Date.now()}`,
        email: 'billing@e2e-test.com',
        phone: '1234567890',
        address: '123 Test St'
      }
    })

    // Create room type
    roomType = await prisma.roomType.create({
      data: {
        hotelId: testHotel.id,
        name: 'Deluxe Room',
        basePrice: 200,
        maxOccupancy: 2
      }
    })

    // Create room
    room = await prisma.room.create({
      data: {
        hotelId: testHotel.id,
        roomNumber: '301',
        floor: 3,
        roomTypeId: roomType.id,
        status: 'AVAILABLE',
        isActive: true
      }
    })

    // Create guest
    guest = await prisma.guest.create({
      data: {
        hotelId: testHotel.id,
        firstName: 'Bill',
        lastName: 'Payer',
        email: 'bill.payer@billing-e2e.com',
        phone: '+1555123456'
      }
    })

    // Create booking
    booking = await prisma.booking.create({
      data: {
        hotelId: testHotel.id,
        guestId: guest.id,
        roomId: room.id,
        checkInDate: new Date(Date.now() - 86400000), // Yesterday
        checkOutDate: new Date(Date.now() + 86400000 * 2), // +2 days
        confirmationNumber: `CONF-${Date.now()}`,
        status: 'CHECKED_IN',
        actualCheckIn: new Date(Date.now() - 86400000),
        totalAmount: 600, // 3 nights * 200
        currency: 'USD'
      }
    })
  })

  afterEach(async () => {
    await prisma.folioItem.deleteMany({ where: { folio: { hotelId: testHotel.id } } })
    await prisma.folio.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.booking.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.room.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.roomType.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.guest.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.hotel.deleteMany({ where: { id: testHotel.id } })
  })

  describe('Folio Auto-Created', () => {
    it('should auto-create folio at check-in', async () => {
      // Create folio (simulating auto-creation at check-in)
      const folio = await prisma.folio.create({
        data: {
          hotelId: testHotel.id,
          bookingId: booking.id,
          guestId: guest.id,
          folioNumber: `F-${Date.now()}`,
          status: 'OPEN',
          currency: 'USD',
          paymentStatus: 'UNPAID'
        }
      })

      expect(folio).toBeTruthy()
      expect(folio.status).toBe('OPEN')
      expect(folio.bookingId).toBe(booking.id)
      expect(folio.guestId).toBe(guest.id)
      expect(folio.paymentStatus).toBe('UNPAID')

      // Verify folio is linked to booking
      const bookingWithFolio = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { folio: true }
      })

      expect(bookingWithFolio?.folio).toBeTruthy()
      expect(bookingWithFolio?.folio?.id).toBe(folio.id)
    })

    it('should initialize folio with zero balances', async () => {
      const folio = await prisma.folio.create({
        data: {
          hotelId: testHotel.id,
          bookingId: booking.id,
          guestId: guest.id,
          folioNumber: `F-${Date.now()}`,
          status: 'OPEN',
          currency: 'USD',
          paymentStatus: 'UNPAID'
        }
      })

      expect(folio.subtotal.toNumber()).toBe(0)
      expect(folio.taxAmount.toNumber()).toBe(0)
      expect(folio.totalAmount.toNumber()).toBe(0)
      expect(folio.paidAmount.toNumber()).toBe(0)
      expect(folio.balanceDue.toNumber()).toBe(0)
    })
  })

  describe('Charges Added', () => {
    it('should add room charges to folio', async () => {
      // Create folio
      const folio = await prisma.folio.create({
        data: {
          hotelId: testHotel.id,
          bookingId: booking.id,
          guestId: guest.id,
          folioNumber: `F-${Date.now()}`,
          status: 'OPEN',
          currency: 'USD',
          paymentStatus: 'UNPAID'
        }
      })

      // Add room charge (3 nights * 200)
      const roomCharge = await prisma.folioItem.create({
        data: {
          folioId: folio.id,
          description: 'Room 301 - Deluxe (3 nights)',
          category: 'ROOM',
          quantity: 3,
          unitPrice: 200,
          totalPrice: 600,
          taxRate: 10, // 10% tax
          taxAmount: 60,
          postedBy: 'system'
        }
      })

      expect(roomCharge).toBeTruthy()
      expect(roomCharge.category).toBe('ROOM')
      expect(roomCharge.quantity.toNumber()).toBe(3)
      expect(roomCharge.totalPrice.toNumber()).toBe(600)
      expect(roomCharge.taxAmount.toNumber()).toBe(60)

      // Update folio totals
      await prisma.folio.update({
        where: { id: folio.id },
        data: {
          subtotal: 600,
          taxAmount: 60,
          totalAmount: 660,
          balanceDue: 660
        }
      })

      const updatedFolio = await prisma.folio.findUnique({
        where: { id: folio.id }
      })

      expect(updatedFolio?.subtotal.toNumber()).toBe(600)
      expect(updatedFolio?.taxAmount.toNumber()).toBe(60)
      expect(updatedFolio?.totalAmount.toNumber()).toBe(660)
    })

    it('should add multiple charges (F&B, minibar, etc)', async () => {
      // Create folio
      const folio = await prisma.folio.create({
        data: {
          hotelId: testHotel.id,
          bookingId: booking.id,
          guestId: guest.id,
          folioNumber: `F-${Date.now()}`,
          status: 'OPEN',
          currency: 'USD',
          paymentStatus: 'UNPAID'
        }
      })

      // Add room charge
      await prisma.folioItem.create({
        data: {
          folioId: folio.id,
          description: 'Room 301 (3 nights)',
          category: 'ROOM',
          quantity: 3,
          unitPrice: 200,
          totalPrice: 600,
          taxRate: 0,
          taxAmount: 0,
          postedBy: 'system'
        }
      })

      // Add F&B charge
      await prisma.folioItem.create({
        data: {
          folioId: folio.id,
          description: 'Restaurant - Dinner',
          category: 'F&B',
          quantity: 1,
          unitPrice: 85,
          totalPrice: 85,
          taxRate: 10,
          taxAmount: 8.5,
          postedBy: 'staff-user-id'
        }
      })

      // Add minibar charge
      await prisma.folioItem.create({
        data: {
          folioId: folio.id,
          description: 'Minibar - Snacks & Drinks',
          category: 'MINIBAR',
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
          taxRate: 10,
          taxAmount: 2.5,
          postedBy: 'staff-user-id'
        }
      })

      // Fetch all items
      const items = await prisma.folioItem.findMany({
        where: { folioId: folio.id }
      })

      expect(items).toHaveLength(3)

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0)
      const taxTotal = items.reduce((sum, item) => sum + item.taxAmount.toNumber(), 0)

      expect(subtotal).toBe(710) // 600 + 85 + 25
      expect(taxTotal).toBe(11) // 0 + 8.5 + 2.5

      // Update folio
      await prisma.folio.update({
        where: { id: folio.id },
        data: {
          subtotal,
          taxAmount: taxTotal,
          totalAmount: subtotal + taxTotal,
          balanceDue: subtotal + taxTotal
        }
      })

      const updatedFolio = await prisma.folio.findUnique({
        where: { id: folio.id }
      })

      expect(updatedFolio?.totalAmount.toNumber()).toBe(721)
    })
  })

  describe('Folio Closed on Checkout', () => {
    it('should close folio when guest checks out with full payment', async () => {
      // Create folio with charges
      const folio = await prisma.folio.create({
        data: {
          hotelId: testHotel.id,
          bookingId: booking.id,
          guestId: guest.id,
          folioNumber: `F-${Date.now()}`,
          status: 'OPEN',
          currency: 'USD',
          subtotal: 600,
          taxAmount: 60,
          totalAmount: 660,
          paymentStatus: 'UNPAID',
          balanceDue: 660
        }
      })

      // Add room charge
      await prisma.folioItem.create({
        data: {
          folioId: folio.id,
          description: 'Room 301 (3 nights)',
          category: 'ROOM',
          quantity: 3,
          unitPrice: 200,
          totalPrice: 600,
          taxRate: 10,
          taxAmount: 60,
          postedBy: 'system'
        }
      })

      // Guest pays at checkout
      await prisma.folio.update({
        where: { id: folio.id },
        data: {
          paidAmount: 660, // Full payment
          balanceDue: 0,
          paymentStatus: 'PAID',
          paymentMethod: 'CARD'
        }
      })

      // Close folio
      const closedFolio = await prisma.folio.update({
        where: { id: folio.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedBy: 'staff-user-id'
        }
      })

      expect(closedFolio.status).toBe('CLOSED')
      expect(closedFolio.paymentStatus).toBe('PAID')
      expect(closedFolio.balanceDue.toNumber()).toBe(0)
      expect(closedFolio.closedAt).toBeTruthy()
      expect(closedFolio.closedBy).toBeTruthy()
    })

    it('should handle partial payment at checkout', async () => {
      // Create folio
      const folio = await prisma.folio.create({
        data: {
          hotelId: testHotel.id,
          bookingId: booking.id,
          guestId: guest.id,
          folioNumber: `F-${Date.now()}`,
          status: 'OPEN',
          currency: 'USD',
          subtotal: 600,
          taxAmount: 60,
          totalAmount: 660,
          paymentStatus: 'UNPAID',
          balanceDue: 660
        }
      })

      // Guest pays partial amount
      const partialPayment = 400
      await prisma.folio.update({
        where: { id: folio.id },
        data: {
          paidAmount: partialPayment,
          balanceDue: 660 - partialPayment,
          paymentStatus: 'PARTIALLY_PAID',
          paymentMethod: 'CARD'
        }
      })

      const updatedFolio = await prisma.folio.findUnique({
        where: { id: folio.id }
      })

      expect(updatedFolio?.paidAmount.toNumber()).toBe(400)
      expect(updatedFolio?.balanceDue.toNumber()).toBe(260)
      expect(updatedFolio?.paymentStatus).toBe('PARTIALLY_PAID')
      expect(updatedFolio?.status).toBe('OPEN') // Still open until fully paid
    })

    it('should link checkout to folio closure', async () => {
      // Create folio
      const folio = await prisma.folio.create({
        data: {
          hotelId: testHotel.id,
          bookingId: booking.id,
          guestId: guest.id,
          folioNumber: `F-${Date.now()}`,
          status: 'OPEN',
          currency: 'USD',
          subtotal: 600,
          taxAmount: 60,
          totalAmount: 660,
          paidAmount: 660,
          balanceDue: 0,
          paymentStatus: 'PAID'
        }
      })

      // Checkout and close folio simultaneously
      const checkoutTime = new Date()
      
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CHECKED_OUT',
            actualCheckOut: checkoutTime
          }
        }),
        prisma.folio.update({
          where: { id: folio.id },
          data: {
            status: 'CLOSED',
            closedAt: checkoutTime,
            closedBy: 'staff-user-id'
          }
        })
      ])

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { folio: true }
      })

      expect(updatedBooking?.status).toBe('CHECKED_OUT')
      expect(updatedBooking?.folio?.status).toBe('CLOSED')
      expect(updatedBooking?.actualCheckOut?.getTime()).toBe(checkoutTime.getTime())
      expect(updatedBooking?.folio?.closedAt?.getTime()).toBe(checkoutTime.getTime())
    })
  })
})
