import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type PaginatedResult<T> = {
  items: T[]
  total: number
}

type TenantListOptions = {
  hotelId: string
  isSuperadmin: boolean
  search?: string
}

type StaffListOptions = {
  hotelId: string
  isSuperadmin: boolean
  search?: string
}

type TenantRecord = Awaited<ReturnType<typeof prisma.hotel.findMany>>[number]

type StaffRecord = Awaited<ReturnType<typeof prisma.user.findMany>>[number]

type StaffDetailResult = Awaited<ReturnType<typeof prisma.user.findUnique>>

export async function listTenants(options: TenantListOptions): Promise<PaginatedResult<TenantRecord>> {
  const where: Prisma.HotelWhereInput = {}

  if (!options.isSuperadmin) {
    where.id = options.hotelId
  }

  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { slug: { contains: options.search, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.hotel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hotel.count({ where }),
  ])

  return { items, total }
}

export async function getTenantDetail(id: string, isSuperadmin: boolean, hotelId: string) {
  const where: Prisma.HotelWhereUniqueInput = { id }
  if (!isSuperadmin) {
    where.id = hotelId
  }

  return prisma.hotel.findUnique({
    where,
    // bookings and tickets relations not in schema
  })
}

export async function listStaff(options: StaffListOptions) {
  const where: Prisma.UserWhereInput = {}

  if (!options.isSuperadmin) {
    where.hotelId = options.hotelId
  }

  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        hotelId: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return { items, total }
}

export async function getStaffDetail(id: string, isSuperadmin: boolean, hotelId: string) {
  const where: Prisma.UserWhereUniqueInput = { id }

  const staffMember = await prisma.user.findUnique({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hotelId: true,
      createdAt: true,
      conversations: {
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      // assignedTickets relation doesn't exist in User model yet
      /* assignedTickets: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }, */
    },
  })

  if (!staffMember) {
    return null
  }

  if (!isSuperadmin && staffMember.hotelId !== hotelId) {
    return null
  }

  return staffMember
}

export async function countBookingsForHotel(hotelId: string): Promise<number> {
  // Booking model not implemented
  return 0
}

export async function countTicketsForHotel(hotelId: string): Promise<number> {
  // Ticket model not implemented
  return 0
}

export async function getBookingDetail(id: string, hotelId: string): Promise<null> {
  // Booking model not implemented
  return null
}
