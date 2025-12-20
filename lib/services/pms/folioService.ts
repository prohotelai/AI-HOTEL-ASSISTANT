/**
 * Folio Service - Manage guest billing and charges
 * CRITICAL: All financial operations use Prisma transactions for ACID compliance
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { FolioStatus, PaymentStatus } from '@prisma/client'

export interface OpenFolioInput {
  bookingId: string
  guestId: string
  billingName?: string
  billingAddress?: string
  billingEmail?: string
  billingPhone?: string
  currency?: string
}

export interface PostChargeInput {
  description: string
  category: string // ROOM, F&B, LAUNDRY, MINIBAR, PHONE, INTERNET, PARKING, OTHER
  quantity: number | Decimal
  unitPrice: number | Decimal
  taxRate?: number | Decimal
  serviceDate?: Date
  referenceId?: string
  referenceType?: string
}

/**
 * Generate unique folio number
 */
async function generateFolioNumber(hotelId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `F-${year}-`
  
  // Get last folio number for this hotel in current year
  const lastFolio = await prisma.folio.findFirst({
    where: {
      hotelId,
      folioNumber: { startsWith: prefix }
    },
    orderBy: { createdAt: 'desc' },
    select: { folioNumber: true }
  })
  
  let nextNumber = 1
  if (lastFolio) {
    const match = lastFolio.folioNumber.match(/F-\d+-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(5, '0')}`
}

/**
 * Open a new folio for a booking
 * MUST be called on check-in
 */
export async function openFolio(
  hotelId: string,
  userId: string,
  input: OpenFolioInput
) {
  const { bookingId, guestId, currency = 'USD', ...billingInfo } = input
  
  return prisma.$transaction(async (tx) => {
    // Check if folio already exists for this booking
    const existingFolio = await tx.folio.findUnique({
      where: { bookingId }
    })
    
    if (existingFolio) {
      throw new Error(`Folio already exists for booking ${bookingId}`)
    }
    
    // Verify booking belongs to this hotel
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, hotelId }
    })
    
    if (!booking) {
      throw new Error('Booking not found or does not belong to this hotel')
    }
    
    // Generate folio number
    const folioNumber = await generateFolioNumber(hotelId)
    
    // Create folio
    const folio = await tx.folio.create({
      data: {
        hotelId,
        bookingId,
        guestId,
        folioNumber,
        status: FolioStatus.OPEN,
        currency,
        paymentStatus: PaymentStatus.UNPAID,
        ...billingInfo,
        subtotal: new Decimal(0),
        taxAmount: new Decimal(0),
        totalAmount: new Decimal(0),
        paidAmount: new Decimal(0),
        balanceDue: new Decimal(0)
      },
      include: {
        booking: { select: { id: true, checkInDate: true, checkOutDate: true } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    })
    
    return folio
  })
}

/**
 * Post a charge to a folio
 * All writes wrapped in transaction
 */
export async function addFolioItem(
  hotelId: string,
  folioId: string,
  userId: string,
  input: PostChargeInput
) {
  const {
    description,
    category,
    quantity,
    unitPrice,
    taxRate = 0,
    serviceDate = new Date(),
    referenceId,
    referenceType
  } = input
  
  return prisma.$transaction(async (tx) => {
    // Verify folio exists and is OPEN
    const folio = await tx.folio.findFirst({
      where: { id: folioId, hotelId }
    })
    
    if (!folio) {
      throw new Error('Folio not found')
    }
    
    if (folio.status !== FolioStatus.OPEN) {
      throw new Error(`Cannot add items to ${folio.status} folio`)
    }
    
    // Calculate amounts using Decimal for precision
    const qtyDecimal = new Decimal(quantity)
    const priceDecimal = new Decimal(unitPrice)
    const taxRateDecimal = new Decimal(taxRate)
    
    const totalPrice = qtyDecimal.mul(priceDecimal)
    const taxAmount = totalPrice.mul(taxRateDecimal).div(100)
    
    // Create folio item
    const folioItem = await tx.folioItem.create({
      data: {
        folioId,
        description,
        category,
        quantity: qtyDecimal,
        unitPrice: priceDecimal,
        totalPrice,
        taxRate: taxRateDecimal,
        taxAmount,
        serviceDate,
        postedAt: new Date(),
        postedBy: userId,
        referenceId,
        referenceType
      }
    })
    
    // Recalculate folio totals
    await recalculateFolioTotals(tx, folioId)
    
    return folioItem
  })
}

/**
 * Recalculate folio totals from all non-voided items
 * CRITICAL: Must be called after any item modification
 */
async function recalculateFolioTotals(
  tx: any,
  folioId: string
) {
  // Sum all non-voided items
  const totals = await tx.folioItem.aggregate({
    where: {
      folioId,
      isVoided: false
    },
    _sum: {
      totalPrice: true,
      taxAmount: true
    }
  })
  
  const subtotal = new Decimal(totals._sum.totalPrice || 0)
  const taxAmount = new Decimal(totals._sum.taxAmount || 0)
  const totalAmount = subtotal.add(taxAmount)
  
  // Get total paid
  const payments = await tx.payment.aggregate({
    where: { folioId },
    _sum: { amount: true }
  })
  
  const paidAmount = new Decimal(payments._sum.amount || 0)
  const balanceDue = totalAmount.sub(paidAmount)
  
  // Determine payment status
  let paymentStatus: PaymentStatus
  if (paidAmount.isZero()) {
    paymentStatus = PaymentStatus.UNPAID
  } else if (paidAmount.gte(totalAmount)) {
    paymentStatus = PaymentStatus.PAID
  } else {
    paymentStatus = PaymentStatus.PARTIALLY_PAID
  }
  
  // Update folio
  await tx.folio.update({
    where: { id: folioId },
    data: {
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount,
      balanceDue,
      paymentStatus
    }
  })
}

/**
 * Close a folio (on check-out)
 * MUST ensure balance is zero or handled
 */
export async function closeFolio(
  hotelId: string,
  folioId: string,
  userId: string,
  allowUnpaid: boolean = false
) {
  return prisma.$transaction(async (tx) => {
    const folio = await tx.folio.findFirst({
      where: { id: folioId, hotelId },
      include: { guest: { select: { id: true, totalSpent: true } } }
    })
    
    if (!folio) {
      throw new Error('Folio not found')
    }
    
    if (folio.status === FolioStatus.CLOSED) {
      throw new Error('Folio already closed')
    }
    
    // Check balance
    if (!allowUnpaid && folio.balanceDue.gt(0)) {
      throw new Error(`Cannot close folio with outstanding balance: ${folio.currency} ${folio.balanceDue}`)
    }
    
    // Close folio
    const closedFolio = await tx.folio.update({
      where: { id: folioId },
      data: {
        status: FolioStatus.CLOSED,
        closedAt: new Date(),
        closedBy: userId
      }
    })
    
    // Update guest totalSpent (ONLY for CLOSED folios)
    const updatedGuest = await tx.guest.update({
      where: { id: folio.guestId },
      data: {
        totalSpent: {
          increment: folio.totalAmount
        }
      }
    })
    
    // Auto-upgrade loyalty tier based on new totalSpent
    const totalSpentNum = Number(updatedGuest.totalSpent)
    let newTier = updatedGuest.loyaltyTier
    
    if (totalSpentNum >= 50000 && updatedGuest.loyaltyTier !== 'PLATINUM') {
      newTier = 'PLATINUM'
    } else if (totalSpentNum >= 25000 && updatedGuest.loyaltyTier !== 'GOLD' && updatedGuest.loyaltyTier !== 'PLATINUM') {
      newTier = 'GOLD'
    } else if (totalSpentNum >= 10000 && !updatedGuest.loyaltyTier) {
      newTier = 'SILVER'
    }
    
    if (newTier !== updatedGuest.loyaltyTier) {
      await tx.guest.update({
        where: { id: folio.guestId },
        data: { 
          loyaltyTier: newTier,
          vipStatus: (newTier === 'GOLD' || newTier === 'PLATINUM')
        }
      })
    }
    
    return closedFolio
  })
}

/**
 * Void a folio item (reversal transaction)
 */
export async function voidFolioItem(
  hotelId: string,
  folioItemId: string,
  userId: string,
  reason: string
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.folioItem.findUnique({
      where: { id: folioItemId },
      include: { folio: { select: { id: true, hotelId: true, status: true } } }
    })
    
    if (!item || item.folio.hotelId !== hotelId) {
      throw new Error('Folio item not found')
    }
    
    if (item.folio.status !== FolioStatus.OPEN) {
      throw new Error('Cannot void items on closed folio')
    }
    
    if (item.isVoided) {
      throw new Error('Item already voided')
    }
    
    // Mark item as voided
    await tx.folioItem.update({
      where: { id: folioItemId },
      data: {
        isVoided: true,
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason
      }
    })
    
    // Create reversal entry
    await tx.folioItem.create({
      data: {
        folioId: item.folioId,
        description: `VOID: ${item.description} (${reason})`,
        category: item.category,
        quantity: item.quantity.neg(),
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice.neg(),
        taxRate: item.taxRate,
        taxAmount: item.taxAmount.neg(),
        serviceDate: item.serviceDate,
        postedAt: new Date(),
        postedBy: userId,
        referenceId: item.id,
        referenceType: 'VOID'
      }
    })
    
    // Recalculate totals
    await recalculateFolioTotals(tx, item.folioId)
    
    return item
  })
}

/**
 * Get folio with all items
 */
export async function getFolio(hotelId: string, folioId: string) {
  const folio = await prisma.folio.findFirst({
    where: { id: folioId, hotelId },
    include: {
      booking: {
        select: {
          id: true,
          confirmationNumber: true,
          checkInDate: true,
          checkOutDate: true,
          roomId: true,
          room: { select: { roomNumber: true, roomType: { select: { name: true } } } }
        }
      },
      guest: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      },
      items: {
        orderBy: { postedAt: 'desc' }
      },
      payments: {
        orderBy: { paymentDate: 'desc' }
      }
    }
  })
  
  return folio
}

/**
 * List folios for a hotel with filters
 */
export async function listFolios(
  hotelId: string,
  filters: {
    status?: FolioStatus
    paymentStatus?: PaymentStatus
    guestId?: string
    bookingId?: string
    startDate?: Date
    endDate?: Date
  } = {}
) {
  const where: any = { hotelId }
  
  if (filters.status) where.status = filters.status
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus
  if (filters.guestId) where.guestId = filters.guestId
  if (filters.bookingId) where.bookingId = filters.bookingId
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = filters.startDate
    if (filters.endDate) where.createdAt.lte = filters.endDate
  }
  
  const folios = await prisma.folio.findMany({
    where,
    include: {
      booking: { select: { confirmationNumber: true } },
      guest: { select: { firstName: true, lastName: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return folios
}
