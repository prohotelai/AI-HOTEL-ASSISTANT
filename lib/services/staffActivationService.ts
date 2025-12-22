/**
 * Staff Activation Service
 * Handles staff account activation via QR code flow
 * 
 * Security:
 * - Validates staffId exists in hotel
 * - Verifies status = PENDING
 * - Checks hotelId matches (from QR)
 * - Creates User account with hashed password
 * - Links User to Staff record
 * - Sets status to ACTIVE
 * - Prevents re-activation if already ACTIVE
 */

import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { StaffStatus } from '@prisma/client'

/**
 * Validate staff for activation
 * Returns staff details if valid, throws error if invalid
 * 
 * @param hotelId - Hotel from QR code
 * @param staffId - Staff ID (like ST-00001)
 * @returns Staff record if valid for activation
 */
export async function validateStaffForActivation(
  hotelId: string,
  staffId: string
) {
  // Get staff by staffId, enforcing hotel scoping
  const staff = await prisma.staff.findFirst({
    where: {
      staffId,
      hotelId // Must match QR hotelId
    }
  })

  if (!staff) {
    throw new Error('Staff record not found in this hotel')
  }

  // Check status is PENDING
  if (staff.status !== StaffStatus.PENDING) {
    throw new Error(
      `Staff account is already activated. Current status: ${staff.status}`
    )
  }

  // Check no User already linked
  if (staff.userId) {
    throw new Error('This staff record already has a user account')
  }

  return staff
}

/**
 * Activate staff account
 * Creates User, links to staff, sets status to ACTIVE
 * 
 * @param hotelId - Hotel from QR code
 * @param staffId - Staff ID (like ST-00001)
 * @param password - Password for new account (will be hashed)
 * @returns Created user with auth fields
 */
export async function activateStaff(
  hotelId: string,
  staffId: string,
  password: string
) {
  // Validate staff is eligible for activation
  const staff = await validateStaffForActivation(hotelId, staffId)

  // Hash password
  const hashedPassword = await hash(password, 10)

  // Atomic transaction: Create User and link to Staff
  const result = await prisma.$transaction(async (tx) => {
    // Check staff still exists and hasn't been modified
    const currentStaff = await tx.staff.findFirst({
      where: { id: staff.id, hotelId }
    })

    if (!currentStaff) {
      throw new Error('Staff record no longer exists')
    }

    if (currentStaff.status !== StaffStatus.PENDING) {
      throw new Error('Staff record is no longer in PENDING status')
    }

    // Create User account
    const user = await tx.user.create({
      data: {
        email: staff.email,
        name: `${staff.firstName} ${staff.lastName}`,
        password: hashedPassword,
        role: 'STAFF', // Set role to STAFF
        hotelId,
        emailVerified: new Date() // No email verification required
      }
    })

    // Update Staff: Link user and set status to ACTIVE
    const updatedStaff = await tx.staff.update({
      where: { id: staff.id },
      data: {
        userId: user.id,
        status: StaffStatus.ACTIVE,
        updatedAt: new Date()
      }
    })

    return { user, staff: updatedStaff }
  })

  return result.user
}

/**
 * Get staff for activation form (read-only validation)
 * Used to check if staffId exists without activating
 * 
 * @param hotelId - Hotel from QR code
 * @param staffId - Staff ID to look up
 */
export async function getStaffForActivation(
  hotelId: string,
  staffId: string
) {
  const staff = await prisma.staff.findFirst({
    where: {
      staffId,
      hotelId
    },
    select: {
      id: true,
      staffId: true,
      firstName: true,
      lastName: true,
      email: true,
      staffRole: true,
      status: true,
      userId: true
    }
  })

  if (!staff) {
    return null
  }

  // Check if already activated
  const canActivate = staff.status === StaffStatus.PENDING && !staff.userId

  return {
    ...staff,
    canActivate
  }
}
