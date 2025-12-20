/**
 * Export utilities for PDF and CSV generation
 * Supports: rooms, bookings, invoices, tasks, work orders
 */

export interface ExportOptions {
  filename: string
  sheetName?: string
  columns?: string[]
}

// CSV Export
export function generateCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): string {
  if (data.length === 0) {
    return ''
  }

  const columns = options.columns || Object.keys(data[0])
  const headers = columns.join(',')

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col]
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      })
      .join(',')
  )

  return [headers, ...rows].join('\n')
}

// CSV Download Helper
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): void {
  const csv = generateCSV(data, options)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${options.filename}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// JSON Export (for structured data)
export function downloadJSON<T>(data: T, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.json`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Booking Export
export interface BookingExport {
  bookingId: string
  guestName: string
  email: string
  phone: string
  checkInDate: string
  checkOutDate: string
  roomNumber: string
  roomType: string
  numberOfGuests: number
  totalPrice: number
  status: string
}

export function downloadBookings(bookings: BookingExport[], hotelName: string): void {
  downloadCSV(bookings, {
    filename: `${hotelName}-bookings-${new Date().toISOString().split('T')[0]}`,
    columns: [
      'bookingId',
      'guestName',
      'email',
      'phone',
      'checkInDate',
      'checkOutDate',
      'roomNumber',
      'roomType',
      'numberOfGuests',
      'totalPrice',
      'status'
    ]
  })
}

// Room Export
export interface RoomExport {
  roomNumber: string
  roomType: string
  status: string
  lastCleaned: string
  nextMaintenance: string
  capacity: number
  price: number
}

export function downloadRooms(rooms: RoomExport[], hotelName: string): void {
  downloadCSV(rooms, {
    filename: `${hotelName}-rooms-${new Date().toISOString().split('T')[0]}`,
    columns: ['roomNumber', 'roomType', 'status', 'lastCleaned', 'nextMaintenance', 'capacity', 'price']
  })
}

// Work Order Export
export interface WorkOrderExport {
  id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  assignedTo: string
  createdDate: string
  dueDate: string
  completedDate?: string
  cost?: number
}

export function downloadWorkOrders(workOrders: WorkOrderExport[], hotelName: string): void {
  downloadCSV(workOrders, {
    filename: `${hotelName}-work-orders-${new Date().toISOString().split('T')[0]}`,
    columns: [
      'id',
      'title',
      'description',
      'category',
      'status',
      'priority',
      'assignedTo',
      'createdDate',
      'dueDate',
      'completedDate',
      'cost'
    ]
  })
}

// Invoice Export
export interface InvoiceExport {
  invoiceId: string
  bookingId: string
  guestName: string
  issueDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  status: string
}

export function downloadInvoices(invoices: InvoiceExport[], hotelName: string): void {
  downloadCSV(invoices, {
    filename: `${hotelName}-invoices-${new Date().toISOString().split('T')[0]}`,
    columns: ['invoiceId', 'bookingId', 'guestName', 'issueDate', 'dueDate', 'subtotal', 'tax', 'total', 'status']
  })
}

// Housekeeping Task Export
export interface HousekeepingTaskExport {
  taskId: string
  roomNumber: string
  taskType: string
  status: string
  assignedTo: string
  dueTime: string
  completedTime?: string
  notes?: string
}

export function downloadHousekeepingTasks(
  tasks: HousekeepingTaskExport[],
  hotelName: string
): void {
  downloadCSV(tasks, {
    filename: `${hotelName}-housekeeping-${new Date().toISOString().split('T')[0]}`,
    columns: ['taskId', 'roomNumber', 'taskType', 'status', 'assignedTo', 'dueTime', 'completedTime', 'notes']
  })
}

// Analytics Export
export interface AnalyticsExport {
  date: string
  revenue: number
  bookings: number
  occupancy: number
  avgRate: number
  guestCount: number
}

export function downloadAnalytics(data: AnalyticsExport[], hotelName: string, period: string): void {
  downloadCSV(data, {
    filename: `${hotelName}-analytics-${period}-${new Date().toISOString().split('T')[0]}`,
    columns: ['date', 'revenue', 'bookings', 'occupancy', 'avgRate', 'guestCount']
  })
}

// Server-side PDF generation (to be used in API routes)
export async function generatePDF(
  htmlContent: string,
  filename: string
): Promise<Buffer> {
  // This would use a library like puppeteer or pdfkit
  // For now, we'll export the interface
  throw new Error('PDF generation requires server-side implementation')
}

// Helper to format data for export
export function formatDateForExport(date: Date | string): string {
  if (typeof date === 'string') return date
  return date.toISOString().split('T')[0]
}

export function formatCurrencyForExport(amount: number): string {
  return amount.toFixed(2)
}

// Batch export multiple data types
export interface BatchExportData {
  bookings?: BookingExport[]
  rooms?: RoomExport[]
  workOrders?: WorkOrderExport[]
  invoices?: InvoiceExport[]
  housekeepingTasks?: HousekeepingTaskExport[]
}

export function downloadBatchExport(
  data: BatchExportData,
  hotelName: string
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${hotelName}-export-${timestamp}`

  const batchData = {
    exportDate: new Date().toISOString(),
    hotelName,
    ...data
  }

  downloadJSON(batchData, filename)
}
