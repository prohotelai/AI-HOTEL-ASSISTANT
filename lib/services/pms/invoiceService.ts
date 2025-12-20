/**
 * Invoice Service - Generate and manage invoices from folios
 * PHASE 5: Minimal implementation (read-only stub, no PDF generation yet)
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { InvoiceStatus, FolioStatus } from '@prisma/client'

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(hotelId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  
  // Get last invoice number for this hotel in current year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      hotelId,
      invoiceNumber: { startsWith: prefix }
    },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true }
  })
  
  let nextNumber = 1
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/INV-\d+-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(5, '0')}`
}

/**
 * Generate invoice from a closed folio
 * CRITICAL: Only closed folios can be invoiced
 */
export async function generateInvoiceFromFolio(
  hotelId: string,
  folioId: string,
  options: {
    dueDate?: Date
    notes?: string
    termsAndConditions?: string
  } = {}
) {
  return prisma.$transaction(async (tx) => {
    // Get folio with all items
    const folio = await tx.folio.findFirst({
      where: { id: folioId, hotelId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true
          }
        },
        items: {
          where: { isVoided: false },
          orderBy: { postedAt: 'asc' }
        }
      }
    })
    
    if (!folio) {
      throw new Error('Folio not found')
    }
    
    if (folio.status !== FolioStatus.CLOSED) {
      throw new Error('Can only generate invoice from CLOSED folio')
    }
    
    // Check if invoice already exists for this folio
    const existingInvoice = await tx.invoice.findFirst({
      where: { folioId: folio.id }
    })
    
    if (existingInvoice) {
      return existingInvoice // Idempotent
    }
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(hotelId)
    
    // Calculate due date (default: 30 days from issue)
    const dueDate = options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    // Build billTo JSON
    const billTo = {
      name: folio.billingName || `${folio.guest.firstName} ${folio.guest.lastName}`,
      address: folio.billingAddress || folio.guest.address || '',
      email: folio.billingEmail || folio.guest.email || '',
      phone: folio.billingPhone || folio.guest.phone || ''
    }
    
    // Create invoice
    const invoice = await tx.invoice.create({
      data: {
        hotelId,
        folioId: folio.id,
        invoiceNumber,
        status: InvoiceStatus.ISSUED,
        currency: folio.currency,
        subtotal: folio.subtotal,
        taxAmount: folio.taxAmount,
        totalAmount: folio.totalAmount,
        paidAmount: folio.paidAmount,
        balanceDue: folio.balanceDue,
        issueDate: new Date(),
        dueDate,
        billTo,
        notes: options.notes,
        termsAndConditions: options.termsAndConditions
      },
      include: {
        folio: {
          include: {
            items: {
              where: { isVoided: false },
              orderBy: { postedAt: 'asc' }
            }
          }
        }
      }
    })
    
    return invoice
  })
}

/**
 * Get invoice with full details
 */
export async function getInvoice(hotelId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, hotelId },
    include: {
      folio: {
        include: {
          items: {
            where: { isVoided: false },
            orderBy: { postedAt: 'asc' }
          },
          guest: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          booking: {
            select: {
              confirmationNumber: true,
              checkInDate: true,
              checkOutDate: true,
              room: {
                select: {
                  roomNumber: true
                }
              }
            }
          }
        }
      },
      payments: {
        orderBy: { paymentDate: 'desc' }
      }
    }
  })
  
  return invoice
}

/**
 * List invoices for a hotel with filters
 */
export async function listInvoices(
  hotelId: string,
  filters: {
    status?: InvoiceStatus
    startDate?: Date
    endDate?: Date
    unpaidOnly?: boolean
  } = {}
) {
  const where: any = { hotelId }
  
  if (filters.status) {
    where.status = filters.status
  }
  
  if (filters.unpaidOnly) {
    where.balanceDue = { gt: 0 }
  }
  
  if (filters.startDate || filters.endDate) {
    where.issueDate = {}
    if (filters.startDate) where.issueDate.gte = filters.startDate
    if (filters.endDate) where.issueDate.lte = filters.endDate
  }
  
  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      folio: {
        select: {
          folioNumber: true,
          guest: {
            select: { firstName: true, lastName: true }
          }
        }
      }
    },
    orderBy: { issueDate: 'desc' }
  })
  
  return invoices
}

/**
 * Mark invoice as paid
 * NOTE: This should be called automatically when payment is recorded
 */
export async function markInvoicePaid(
  hotelId: string,
  invoiceId: string
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, hotelId }
    })
    
    if (!invoice) {
      throw new Error('Invoice not found')
    }
    
    // Calculate paid amount from payments
    const payments = await tx.payment.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true }
    })
    
    const paidAmount = new Decimal(payments._sum.amount || 0)
    const balanceDue = invoice.totalAmount.sub(paidAmount)
    
    // Determine status
    let status: InvoiceStatus
    if (balanceDue.lte(0)) {
      status = InvoiceStatus.PAID
    } else if (paidAmount.gt(0)) {
      // Partially paid, check if overdue
      status = new Date() > invoice.dueDate ? InvoiceStatus.OVERDUE : InvoiceStatus.ISSUED
    } else {
      // Unpaid, check if overdue
      status = new Date() > invoice.dueDate ? InvoiceStatus.OVERDUE : InvoiceStatus.ISSUED
    }
    
    // Update invoice
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount,
        balanceDue,
        status,
        paidDate: balanceDue.lte(0) ? new Date() : null
      }
    })
    
    return updatedInvoice
  })
}

/**
 * Cancel invoice
 */
export async function cancelInvoice(
  hotelId: string,
  invoiceId: string,
  reason?: string
) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId, hotelId },
    data: {
      status: InvoiceStatus.CANCELLED,
      notes: reason ? `CANCELLED: ${reason}` : 'CANCELLED'
    }
  })
  
  return invoice
}

/**
 * Generate PDF (stub for Phase 5)
 * TODO: Implement actual PDF generation in Phase 6
 */
export async function generateInvoicePDF(
  hotelId: string,
  invoiceId: string
): Promise<{ url: string; generatedAt: Date }> {
  // STUB: Return placeholder
  // In Phase 6, this should:
  // 1. Fetch invoice with full details
  // 2. Generate PDF using a template engine (e.g., pdfmake, puppeteer)
  // 3. Upload to S3/storage
  // 4. Update invoice.pdfUrl and invoice.pdfGeneratedAt
  // 5. Return URL
  
  throw new Error('PDF generation not implemented yet (Phase 6)')
}

/**
 * Export invoice as JSON (for integration purposes)
 */
export async function exportInvoiceJSON(
  hotelId: string,
  invoiceId: string
) {
  const invoice = await getInvoice(hotelId, invoiceId)
  
  if (!invoice) {
    throw new Error('Invoice not found')
  }
  
  // Return JSON-serializable format
  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    currency: invoice.currency,
    subtotal: invoice.subtotal.toString(),
    taxAmount: invoice.taxAmount.toString(),
    totalAmount: invoice.totalAmount.toString(),
    paidAmount: invoice.paidAmount.toString(),
    balanceDue: invoice.balanceDue.toString(),
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paidDate: invoice.paidDate?.toISOString() || null,
    billTo: invoice.billTo,
    lineItems: invoice.folio.items.map(item => ({
      description: item.description,
      category: item.category,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
      taxRate: item.taxRate.toString(),
      taxAmount: item.taxAmount.toString(),
      serviceDate: item.serviceDate.toISOString()
    })),
    payments: invoice.payments.map(payment => ({
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate.toISOString(),
      transactionId: payment.transactionId
    }))
  }
}
