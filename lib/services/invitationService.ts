/**
 * Staff Invitation Service
 * Handles staff invitation flow with magic links and email
 * 
 * NOTE: All invitation service functions are currently stubbed because the
 * StaffInvitation model does not exist in the Prisma schema.
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { randomBytes, createHash } from 'crypto'

// Stubbed - StaffInvitation model not in schema
enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

interface StaffInvitation {
  id: string
  hotelId: string
  email: string
  firstName: string
  lastName: string
  departmentId?: string | null
  position?: string | null
  role?: string | null
  token: string
  tokenHash: string
  expiresAt: Date
  status: InvitationStatus
  invitedBy: string
  createdAt: Date
  updatedAt: Date
  acceptedAt?: Date | null
  hotel?: { id: string; name: string } // Optional relation
}

// ============================================
// TYPES
// ============================================

export interface SendInvitationInput {
  hotelId: string
  email: string
  firstName: string
  lastName: string
  departmentId?: string
  position?: string
  role?: string
  invitedBy: string
}

export interface AcceptInvitationInput {
  token: string
  password: string
  phoneNumber?: string
  dateOfBirth?: Date
}

export interface InvitationValidationResult {
  valid: boolean
  invitation?: StaffInvitation
  error?: string
}

// ============================================
// MAGIC LINK GENERATION
// ============================================

/**
 * Generate a secure random token for magic link
 */
export function generateInvitationToken(): string {
  // Generate 32 random bytes and convert to hex (64 characters)
  return randomBytes(32).toString('hex')
}

/**
 * Hash token for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate magic link URL
 */
export function generateMagicLink(token: string, baseUrl: string): string {
  return `${baseUrl}/staff/accept-invitation?token=${token}`
}

// ============================================
// INVITATION OPERATIONS
// ============================================

/**
 * Send staff invitation with magic link
 */
export async function sendStaffInvitation(
  input: SendInvitationInput
): Promise<{ invitation: StaffInvitation; magicLink: string; token: string }> {
  // Stubbed - StaffInvitation model not in schema
  throw new Error('Staff invitation system not yet implemented')
  
  /* Original code commented out - requires StaffInvitation model
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  })

  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  // Check for pending invitation
  const pendingInvitation = await prisma.staffInvitation.findFirst({
    where: {
      email: input.email,
      hotelId: input.hotelId,
      status: 'PENDING'
    }
  })

  if (pendingInvitation) {
    throw new Error('Pending invitation already exists for this email')
  }

  // Generate token and expiration (24 hours)
  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  // Create invitation
  const invitation = await prisma.staffInvitation.create({
    data: {
      hotelId: input.hotelId,
      email: input.email,
      token,
      firstName: input.firstName,
      lastName: input.lastName,
      departmentId: input.departmentId,
      position: input.position,
      role: input.role || 'staff',
      expiresAt,
      invitedBy: input.invitedBy
    },
    include: {
      hotel: true
    }
  })

  // Generate magic link
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const magicLink = generateMagicLink(token, baseUrl)

  // Emit event for email sending
  eventBus.emit('staff.invitation.sent', {
    invitationId: invitation.id,
    email: invitation.email,
    hotelId: invitation.hotelId,
    magicLink,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    hotelName: invitation.hotel.name,
    expiresAt: invitation.expiresAt,
    timestamp: new Date()
  })

  return { invitation, magicLink, token }
  */
}

/**
 * Resend invitation (generates new token)
 */
export async function resendStaffInvitation(
  invitationId: string
): Promise<{ invitation: StaffInvitation; magicLink: string; token: string }> {
  // Stubbed - StaffInvitation model not in schema
  throw new Error('Staff invitation system not yet implemented')
  
  /* Original code commented out
  const existingInvitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: { hotel: true }
  })

  if (!existingInvitation) {
    throw new Error('Invitation not found')
  }

  if (existingInvitation.status === 'ACCEPTED') {
    throw new Error('Invitation already accepted')
  }

  // Generate new token and expiration
  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  // Update invitation
  const invitation = await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: {
      token,
      expiresAt,
      status: 'PENDING',
      sentAt: new Date()
    },
    include: { hotel: true }
  })

  // Generate magic link
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const magicLink = generateMagicLink(token, baseUrl)

  // Emit event
  eventBus.emit('staff.invitation.resent', {
    invitationId: invitation.id,
    email: invitation.email,
    hotelId: invitation.hotelId,
    magicLink,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    hotelName: invitation.hotel.name,
    expiresAt: invitation.expiresAt,
    timestamp: new Date()
  })

  return { invitation, magicLink, token }
  */
}

/**
 * Validate invitation token
 */
export async function validateInvitationToken(
  token: string
): Promise<InvitationValidationResult> {
  // Stubbed - StaffInvitation model not in schema
  return { valid: false, error: 'Staff invitation system not yet implemented' }
  
  /* Original code commented out
  const invitation = await prisma.staffInvitation.findUnique({
    where: { token },
    include: { hotel: true }
  })

  if (!invitation) {
    return {
      valid: false,
      error: 'Invalid invitation token'
    }
  }

  if (invitation.status === 'ACCEPTED') {
    return {
      valid: false,
      error: 'Invitation already accepted'
    }
  }

  if (invitation.status === 'CANCELLED') {
    return {
      valid: false,
      error: 'Invitation has been cancelled'
    }
  }

  if (new Date() > invitation.expiresAt) {
    // Auto-expire
    await prisma.staffInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' }
    })

    return {
      valid: false,
      error: 'Invitation has expired'
    }
  }

  return {
    valid: true,
    invitation
  }
  */
}

/**
 * Accept invitation and create user + staff profile
 */
export async function acceptStaffInvitation(
  input: AcceptInvitationInput
): Promise<{ user: any; staffProfile: any; invitation: StaffInvitation }> {
  // Stubbed - StaffInvitation model not in schema
  throw new Error('Staff invitation system not yet implemented')
  
  /* Original code commented out
  // Validate token
  const validation = await validateInvitationToken(input.token)
  if (!validation.valid || !validation.invitation) {
    throw new Error(validation.error || 'Invalid invitation')
  }

  const invitation = validation.invitation

  // Hash password
  const bcrypt = require('bcryptjs')
  const hashedPassword = await bcrypt.hash(input.password, 10)

  // Create user and staff profile in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email: invitation.email,
        name: `${invitation.firstName} ${invitation.lastName}`,
        password: hashedPassword,
        role: invitation.role,
        hotelId: invitation.hotelId,
        emailVerified: new Date() // Auto-verify via invitation
      }
    })

    // Create staff profile
    const staffProfile = await tx.staffProfile.create({
      data: {
        userId: user.id,
        hotelId: invitation.hotelId,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        phoneNumber: input.phoneNumber,
        dateOfBirth: input.dateOfBirth,
        departmentId: invitation.departmentId,
        position: invitation.position,
        employmentStatus: 'ACTIVE',
        startDate: new Date()
      },
      include: {
        user: true,
        department: true
      }
    })

    // Mark invitation as accepted
    const updatedInvitation = await tx.staffInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    })

    return { user, staffProfile, invitation: updatedInvitation }
  })

  // Emit event
  eventBus.emit('staff.invitation.accepted', {
    invitationId: invitation.id,
    userId: result.user.id,
    staffProfileId: result.staffProfile.id,
    email: invitation.email,
    hotelId: invitation.hotelId,
    timestamp: new Date()
  })

  return result
  */
}

/**
 * Cancel invitation
 */
export async function cancelStaffInvitation(invitationId: string): Promise<StaffInvitation> {
  // Stubbed - StaffInvitation model not in schema
  throw new Error('Staff invitation system not yet implemented')
  
  /* Original code commented out
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId }
  })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status === 'ACCEPTED') {
    throw new Error('Cannot cancel accepted invitation')
  }

  const updatedInvitation = await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: { status: 'CANCELLED' }
  })

  // Emit event
  eventBus.emit('staff.invitation.cancelled', {
    invitationId: invitation.id,
    email: invitation.email,
    hotelId: invitation.hotelId,
    timestamp: new Date()
  })

  return updatedInvitation
  */
}

/**
 * List invitations for hotel
 */
export async function listStaffInvitations(
  hotelId: string,
  status?: InvitationStatus
): Promise<StaffInvitation[]> {
  // Stubbed - StaffInvitation model not in schema
  return []
  
  /* Original code commented out
  const where: any = { hotelId }
  if (status) where.status = status

  return prisma.staffInvitation.findMany({
    where,
    orderBy: { sentAt: 'desc' }
  })
  */
}

/**
 * Get invitation by ID
 */
export async function getStaffInvitation(invitationId: string): Promise<StaffInvitation | null> {
  // Stubbed - StaffInvitation model not in schema
  return null
  
  /* Original code commented out
  return prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: { hotel: true }
  })
  */
}

/**
 * Cleanup expired invitations (can be run as cron job)
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  // Stubbed - StaffInvitation model not in schema
  return 0
  
  /* Original code commented out
  const result = await prisma.staffInvitation.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: 'EXPIRED'
    }
  })

  return result.count
  */
}
