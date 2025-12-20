/**
 * AI Read Model: Folio
 * 
 * SAFETY: Read-only folio summaries for AI agents
 * - NO write access
 * - NO payment details
 * - Summary view only
 * - Hotel scoping enforced
 */

import { prisma } from '@/lib/prisma'
import { FolioStatus } from '@prisma/client'

export interface FolioReadModel {
  id: string
  folioNumber: string
  status: FolioStatus
  guestName: string
  bookingConfirmation: string
  currency: string
  subtotal: string
  taxAmount: string
  totalAmount: string
  balanceDue: string
  itemCount: number
  openedAt: string
  closedAt?: string
}

/**
 * Get folio summary for AI (read-only)
 * CRITICAL: No payment details exposed
 */
export async function getFolioForAI(
  hotelId: string,
  folioId: string
): Promise<FolioReadModel | null> {
  const folio = await prisma.folio.findFirst({
    where: { id: folioId, hotelId },
    select: {
      id: true,
      folioNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      balanceDue: true,
      createdAt: true,
      closedAt: true,
      guest: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      booking: {
        select: {
          confirmationNumber: true
        }
      },
      items: {
        where: { isVoided: false },
        select: { id: true }
      }
    }
  })

  if (!folio) return null

  return {
    id: folio.id,
    folioNumber: folio.folioNumber,
    status: folio.status,
    guestName: `${folio.guest.firstName} ${folio.guest.lastName}`,
    bookingConfirmation: folio.booking.confirmationNumber,
    currency: folio.currency,
    subtotal: folio.subtotal.toString(),
    taxAmount: folio.taxAmount.toString(),
    totalAmount: folio.totalAmount.toString(),
    balanceDue: folio.balanceDue.toString(),
    itemCount: folio.items.length,
    openedAt: folio.createdAt.toISOString(),
    closedAt: folio.closedAt?.toISOString()
  }
}

/**
 * Get open folios for AI dashboard
 */
export async function getOpenFoliosForAI(hotelId: string): Promise<FolioReadModel[]> {
  const folios = await prisma.folio.findMany({
    where: {
      hotelId,
      status: FolioStatus.OPEN
    },
    select: {
      id: true,
      folioNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      balanceDue: true,
      createdAt: true,
      closedAt: true,
      guest: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      booking: {
        select: {
          confirmationNumber: true
        }
      },
      items: {
        where: { isVoided: false },
        select: { id: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return folios.map(folio => ({
    id: folio.id,
    folioNumber: folio.folioNumber,
    status: folio.status,
    guestName: `${folio.guest.firstName} ${folio.guest.lastName}`,
    bookingConfirmation: folio.booking.confirmationNumber,
    currency: folio.currency,
    subtotal: folio.subtotal.toString(),
    taxAmount: folio.taxAmount.toString(),
    totalAmount: folio.totalAmount.toString(),
    balanceDue: folio.balanceDue.toString(),
    itemCount: folio.items.length,
    openedAt: folio.createdAt.toISOString(),
    closedAt: folio.closedAt?.toISOString()
  }))
}

/**
 * Get folios with outstanding balance (for AI insights)
 */
export async function getUnpaidFoliosForAI(hotelId: string): Promise<FolioReadModel[]> {
  const folios = await prisma.folio.findMany({
    where: {
      hotelId,
      balanceDue: { gt: 0 }
    },
    select: {
      id: true,
      folioNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      balanceDue: true,
      createdAt: true,
      closedAt: true,
      guest: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      booking: {
        select: {
          confirmationNumber: true
        }
      },
      items: {
        where: { isVoided: false },
        select: { id: true }
      }
    },
    orderBy: { balanceDue: 'desc' },
    take: 50
  })

  return folios.map(folio => ({
    id: folio.id,
    folioNumber: folio.folioNumber,
    status: folio.status,
    guestName: `${folio.guest.firstName} ${folio.guest.lastName}`,
    bookingConfirmation: folio.booking.confirmationNumber,
    currency: folio.currency,
    subtotal: folio.subtotal.toString(),
    taxAmount: folio.taxAmount.toString(),
    totalAmount: folio.totalAmount.toString(),
    balanceDue: folio.balanceDue.toString(),
    itemCount: folio.items.length,
    openedAt: folio.createdAt.toISOString(),
    closedAt: folio.closedAt?.toISOString()
  }))
}

/**
 * Get folio statistics for AI insights
 */
export async function getFolioStatsForAI(hotelId: string) {
  const [openCount, totalRevenue, unpaidCount] = await Promise.all([
    prisma.folio.count({
      where: { hotelId, status: FolioStatus.OPEN }
    }),
    prisma.folio.aggregate({
      where: { hotelId, status: FolioStatus.CLOSED },
      _sum: { totalAmount: true }
    }),
    prisma.folio.count({
      where: { hotelId, balanceDue: { gt: 0 } }
    })
  ])

  return {
    openFolios: openCount,
    totalRevenue: totalRevenue._sum.totalAmount?.toString() || '0',
    unpaidFolios: unpaidCount
  }
}
