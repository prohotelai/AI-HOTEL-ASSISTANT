/**
 * Staff Management Service
 * Handles staff record creation, retrieval, and management
 * 
 * Security:
 * - Staff records are created WITHOUT User accounts
 * - User activation happens separately (not in this service)
 * - All operations are hotel-scoped (enforce hotelId)
 * - Only HOTEL_ADMIN and HR can create/manage staff
 */

import { prisma } from '@/lib/prisma'
import { StaffRole, StaffStatus } from '@prisma/client'

/**
 * Generate unique staffId for a hotel
 * Format: ST-XXXXX (e.g., ST-00001)
 */
async function generateStaffId(hotelId: string): Promise<string> {
  const lastStaff = await prisma.staff.findFirst({
    where: { hotelId },
    orderBy: { createdAt: 'desc' },
    select: { staffId: true }
  })

  // Extract number from last staffId, increment
  let nextNumber = 1
  if (lastStaff) {
    const match = lastStaff.staffId.match(/ST-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  // Format as ST-XXXXX with zero padding
  return `ST-${String(nextNumber).padStart(5, '0')}`
}

/**
 * Create a new staff record
 * Does NOT create a User account (happens later during activation)
 * 
 * @param hotelId - Hotel this staff belongs to
 * @param createdBy - User ID of admin creating this record
 * @param input - Staff details
 * @returns Created staff record (with staffId)
 */
export async function createStaff(
  hotelId: string,
  createdBy: string,
  input: {
    firstName: string
    lastName: string
    email: string
    staffRole: StaffRole
    phone?: string
    dateOfBirth?: Date
    address?: string
    department?: string
    hireDate?: Date
    notes?: string
  }
) {
  // Validate hotel exists
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId }
  })

  if (!hotel) {
    throw new Error('Hotel not found')
  }

  // Check email uniqueness within hotel
  const existingStaff = await prisma.staff.findFirst({
    where: {
      hotelId,
      email: input.email
    }
  })

  if (existingStaff) {
    throw new Error(`Staff with email ${input.email} already exists in this hotel`)
  }

  // Generate staffId
  const staffId = await generateStaffId(hotelId)

  // Create staff record (NO User account yet)
  const staff = await prisma.staff.create({
    data: {
      hotelId,
      staffId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      staffRole: input.staffRole,
      status: StaffStatus.PENDING, // Always starts as PENDING
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
      department: input.department,
      hireDate: input.hireDate,
      notes: input.notes,
      createdBy
    }
  })

  return staff
}

/**
 * List all staff members for a hotel
 * 
 * @param hotelId - Hotel to list staff for
 * @param options - Filter/pagination options
 */
export async function listStaffByHotel(
  hotelId: string,
  options?: {
    status?: StaffStatus
    role?: StaffRole
    limit?: number
    offset?: number
  }
) {
  const whereClause: any = { hotelId }

  if (options?.status) {
    whereClause.status = options.status
  }

  if (options?.role) {
    whereClause.staffRole = options.role
  }

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where: whereClause,
      orderBy: [{ staffId: 'asc' }],
      take: options?.limit || 100,
      skip: options?.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true
          }
        }
      }
    }),
    prisma.staff.count({ where: whereClause })
  ])

  return {
    staff,
    total,
    limit: options?.limit || 100,
    offset: options?.offset || 0
  }
}

/**
 * Get a single staff member by ID
 * 
 * @param staffId - Staff record ID
 * @param hotelId - Hotel to scope to (for security)
 */
export async function getStaffById(staffId: string, hotelId: string) {
  const staff = await prisma.staff.findFirst({
    where: {
      id: staffId,
      hotelId // Enforce hotel scoping
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          role: true
        }
      }
    }
  })

  if (!staff) {
    throw new Error('Staff member not found')
  }

  return staff
}

/**
 * Get staff by staffId (e.g., ST-00001)
 * 
 * @param staffId - The staffId like "ST-00001"
 * @param hotelId - Hotel to scope to
 */
export async function getStaffByStaffId(staffId: string, hotelId: string) {
  const staff = await prisma.staff.findFirst({
    where: {
      staffId, // e.g., "ST-00001"
      hotelId // Enforce hotel scoping
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          role: true
        }
      }
    }
  })

  if (!staff) {
    throw new Error(`Staff member ${staffId} not found`)
  }

  return staff
}

/**
 * Update staff status (e.g., PENDING -> ACTIVE)
 * 
 * @param id - Staff record ID
 * @param hotelId - Hotel to scope to
 * @param status - New status
 * @param updatedBy - User ID of admin making this change
 */
export async function updateStaffStatus(
  id: string,
  hotelId: string,
  status: StaffStatus,
  updatedBy: string
) {
  const staff = await prisma.staff.findFirst({
    where: { id, hotelId }
  })

  if (!staff) {
    throw new Error('Staff member not found')
  }

  return prisma.staff.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date()
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  })
}

/**
 * Update staff record details
 * Does NOT modify email (email is unique per hotel, requires separate handling)
 */
export async function updateStaffDetails(
  id: string,
  hotelId: string,
  input: {
    firstName?: string
    lastName?: string
    phone?: string
    dateOfBirth?: Date
    address?: string
    department?: string
    notes?: string
    staffRole?: StaffRole
  }
) {
  const staff = await prisma.staff.findFirst({
    where: { id, hotelId }
  })

  if (!staff) {
    throw new Error('Staff member not found')
  }

  return prisma.staff.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
      department: input.department,
      notes: input.notes,
      staffRole: input.staffRole,
      updatedAt: new Date()
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  })
}

/**
 * Deactivate a staff member (soft delete)
 * 
 * @param id - Staff record ID
 * @param hotelId - Hotel to scope to
 * @param deactivatedBy - User ID of admin deactivating
 */
export async function deactivateStaff(
  id: string,
  hotelId: string,
  deactivatedBy: string
) {
  const staff = await prisma.staff.findFirst({
    where: { id, hotelId }
  })

  if (!staff) {
    throw new Error('Staff member not found')
  }

  return prisma.staff.update({
    where: { id },
    data: {
      status: StaffStatus.INACTIVE,
      deactivatedAt: new Date(),
      deactivatedBy,
      updatedAt: new Date()
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  })
}

/**
 * Link a User account to a staff record
 * Called when staff activates their account
 * 
 * @param staffId - Staff record ID
 * @param userId - User record ID
 * @param hotelId - Hotel to scope to
 */
export async function linkUserToStaff(
  staffId: string,
  userId: string,
  hotelId: string
) {
  // Verify staff exists
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, hotelId }
  })

  if (!staff) {
    throw new Error('Staff member not found')
  }

  // Verify user exists and belongs to same hotel
  const user = await prisma.user.findFirst({
    where: { id: userId, hotelId }
  })

  if (!user) {
    throw new Error('User not found or does not belong to this hotel')
  }

  // Link user to staff
  return prisma.staff.update({
    where: { id: staffId },
    data: {
      userId,
      status: StaffStatus.ACTIVE, // Automatically activate when user is linked
      updatedAt: new Date()
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          role: true
        }
      }
    }
  })
}

/**
 * Get active staff count for a hotel
 */
export async function getStaffCountByHotel(hotelId: string) {
  const counts = await prisma.staff.groupBy({
    by: ['status'],
    where: { hotelId },
    _count: true
  })

  return counts.reduce(
    (acc, item) => {
      acc[item.status] = item._count
      return acc
    },
    {} as Record<string, number>
  )
}

// =============================
// Staff Profiles & HR Utilities
// =============================

function buildProfileInclude() {
  return {
    user: {
      select: {
        id: true,
        email: true,
        name: true
      }
    },
    department: true,
    hrNotes: {
      orderBy: { createdAt: 'desc' }
    },
    performanceMetrics: {
      orderBy: { recordedAt: 'desc' }
    },
    activities: true,
    documents: true,
    calendarEvents: true
  }
}

async function logActivity(
  staffProfileId: string,
  type: string,
  title: string,
  createdBy?: string,
  description?: string
) {
  const client = prisma as any
  if (!client.staffActivity?.create) return null

  return client.staffActivity.create({
    data: {
      staffProfileId,
      type,
      title,
      description,
      createdBy,
      createdAt: new Date()
    }
  })
}

export async function createStaffProfile(input: {
  userId: string
  hotelId: string
  firstName: string
  lastName: string
  employeeId?: string
  position?: string
  employmentStatus?: string
  startDate?: Date
  createdBy?: string
}) {
  const client = prisma as any

  const profile = await client.staffProfile.create({
    data: {
      userId: input.userId,
      hotelId: input.hotelId,
      firstName: input.firstName,
      lastName: input.lastName,
      employeeId: input.employeeId,
      position: input.position,
      employmentStatus: input.employmentStatus || 'ACTIVE',
      startDate: input.startDate || new Date()
    },
    include: buildProfileInclude()
  })

  await logActivity(profile.id, 'PROFILE_UPDATED', 'Staff profile created', input.createdBy)
  return profile
}

export async function getStaffProfile(profileId: string) {
  const client = prisma as any
  return client.staffProfile.findUnique({
    where: { id: profileId },
    include: buildProfileInclude()
  })
}

export async function listStaffProfiles(options: {
  hotelId: string
  departmentId?: string
  employmentStatus?: string
  limit?: number
  offset?: number
  search?: string
}) {
  const client = prisma as any
  const take = options.limit ?? 50
  const skip = options.offset ?? 0

  const where: any = {
    hotelId: options.hotelId
  }

  if (options.departmentId) {
    where.departmentId = options.departmentId
  }

  if (options.employmentStatus) {
    where.employmentStatus = options.employmentStatus
  }

  if (options.search) {
    const term = options.search
    where.OR = [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } }
    ]
  }

  const [profiles, total] = await Promise.all([
    client.staffProfile.findMany({
      where,
      include: buildProfileInclude(),
      orderBy: { createdAt: 'desc' },
      take,
      skip
    }),
    client.staffProfile.count({ where })
  ])

  return { profiles, total, limit: take, offset: skip }
}

export async function updateStaffProfile(
  profileId: string,
  data: Record<string, any>,
  updatedBy?: string
) {
  const client = prisma as any

  const profile = await client.staffProfile.update({
    where: { id: profileId },
    data,
    include: buildProfileInclude()
  })

  await logActivity(profileId, 'PROFILE_UPDATED', 'Profile updated', updatedBy)
  return profile
}

export async function deleteStaffProfile(profileId: string) {
  const client = prisma as any
  return client.staffProfile.delete({ where: { id: profileId } })
}

export async function createDepartment(
  hotelId: string,
  name: string,
  description?: string,
  color?: string
) {
  const client = prisma as any
  return client.department.create({
    data: { hotelId, name, description, color }
  })
}

export async function listDepartments(hotelId: string) {
  const client = prisma as any
  return client.department.findMany({
    where: { hotelId },
    include: { _count: { select: { staffProfiles: true } } },
    orderBy: { name: 'asc' }
  })
}

export async function deleteDepartment(departmentId: string) {
  const client = prisma as any
  const staffCount = await client.staffProfile.count({ where: { departmentId } })
  if (staffCount > 0) {
    throw new Error('Cannot delete department with active staff members')
  }
  return client.department.delete({ where: { id: departmentId } })
}

export async function createHRNote(
  staffProfileId: string,
  title: string,
  content: string,
  createdBy?: string,
  isConfidential?: boolean,
  tags?: string[],
  attachments?: string[]
) {
  const client = prisma as any
  const note = await client.hRNote.create({
    data: {
      staffProfileId,
      title,
      content,
      createdBy,
      isConfidential: isConfidential ?? false,
      tags: tags ?? [],
      attachments: attachments ?? []
    }
  })

  await logActivity(staffProfileId, 'NOTE_ADDED', 'HR note added', createdBy)
  return note
}

export async function getHRNotes(staffProfileId: string) {
  const client = prisma as any
  return client.hRNote.findMany({ where: { staffProfileId } })
}

export async function logPerformanceMetric(
  staffProfileId: string,
  name: string,
  value: number,
  periodStart?: Date,
  periodEnd?: Date,
  recordedBy?: string,
  target?: number,
  unit?: string
) {
  const client = prisma as any
  const metric = await client.performanceMetric.create({
    data: {
      staffProfileId,
      name,
      value,
      target,
      unit,
      periodStart,
      periodEnd,
      recordedBy
    }
  })

  await logActivity(staffProfileId, 'METRIC_LOGGED', 'Performance metric logged', recordedBy)
  return metric
}

export async function getPerformanceMetrics(
  staffProfileId: string,
  startDate: Date,
  endDate: Date
) {
  const client = prisma as any
  return client.performanceMetric.findMany({
    where: {
      staffProfileId,
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate }
    },
    orderBy: { periodStart: 'desc' }
  })
}

export async function uploadStaffDocument(
  staffProfileId: string,
  title: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  uploadedBy?: string,
  category?: string
) {
  const client = prisma as any
  const document = await client.staffDocument.create({
    data: {
      staffProfileId,
      title,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      uploadedBy,
      category
    }
  })

  await logActivity(staffProfileId, 'DOCUMENT_UPLOADED', 'Document uploaded', uploadedBy)
  return document
}

export async function getStaffDocuments(staffProfileId: string) {
  const client = prisma as any
  return client.staffDocument.findMany({ where: { staffProfileId } })
}

export async function createCalendarEvent(
  staffProfileId: string,
  title: string,
  startTime: Date,
  endTime: Date,
  createdBy?: string,
  eventType?: string
) {
  const client = prisma as any
  return client.calendarEvent.create({
    data: {
      staffProfileId,
      title,
      startTime,
      endTime,
      createdBy,
      eventType
    }
  })
}

export async function getCalendarEvents(
  staffProfileId: string,
  startDate: Date,
  endDate: Date
) {
  const client = prisma as any
  return client.calendarEvent.findMany({
    where: {
      staffProfileId,
      startTime: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { startTime: 'asc' }
  })
}

export async function createPerformanceReview(
  staffProfileId: string,
  reviewerId: string,
  score: number,
  notes?: string
) {
  const client = prisma as any
  return client.performanceReview.create({
    data: { staffProfileId, reviewerId, score, notes }
  })
}

export async function getStaffStatistics(hotelId: string) {
  const client = prisma as any
  const [totalStaff, activeStaff, departments] = await Promise.all([
    client.staffProfile.count({ where: { hotelId } }),
    client.staffProfile.count({ where: { hotelId, employmentStatus: 'ACTIVE' } }),
    client.department.count({ where: { hotelId } })
  ])

  const recentActivities = client.staffActivity?.findMany
    ? await client.staffActivity.findMany({
        where: { staffProfile: { hotelId } },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    : []

  const pendingReviews = client.performanceReview?.findMany
    ? await client.performanceReview.findMany({ where: { staffProfile: { hotelId } } })
    : []

  return { totalStaff, activeStaff, departments, recentActivities, performanceReviews: pendingReviews }
}
