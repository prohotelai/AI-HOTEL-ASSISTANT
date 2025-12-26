import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'

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
  hotel?: { id: string; name: string }
}

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
  invitation?: any
  error?: string
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateMagicLink(token: string, baseUrl: string): string {
  return `${baseUrl}/staff/accept-invitation?token=${token}`
}

export async function sendStaffInvitation(
  input: SendInvitationInput
): Promise<{ invitation: any; magicLink: string; token: string }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  })

  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  const pendingInvitation = await prisma.staffInvitation.findFirst({
    where: {
      email: input.email,
      hotelId: input.hotelId,
      acceptedAt: null
    }
  })

  if (pendingInvitation) {
    throw new Error('Pending invitation already exists for this email')
  }

  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const invitation = await prisma.staffInvitation.create({
    data: {
      hotelId: input.hotelId,
      email: input.email,
      tokenHash: hashToken(token),
      role: input.role || 'staff',
      expiresAt,
      invitedById: input.invitedBy
    },
    include: {
      hotel: true
    }
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const magicLink = generateMagicLink(token, baseUrl)

  if (eventBus?.emit) {
    eventBus.emit('staff.invitation.sent', {
      invitationId: invitation.id,
      email: invitation.email,
      hotelId: invitation.hotelId,
      magicLink,
      hotelName: invitation.hotel?.name,
      expiresAt: invitation.expiresAt,
      timestamp: new Date()
    })
  }

  return { invitation, magicLink, token }
}

export async function resendStaffInvitation(
  invitationId: string
): Promise<{ invitation: any; magicLink: string; token: string }> {
  const existingInvitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: { hotel: true }
  })

  if (!existingInvitation) {
    throw new Error('Invitation not found')
  }

  if (existingInvitation.acceptedAt) {
    throw new Error('Invitation already accepted')
  }

  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const invitation = await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: {
      tokenHash: hashToken(token),
      expiresAt
    },
    include: { hotel: true }
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const magicLink = generateMagicLink(token, baseUrl)

  if (eventBus?.emit) {
    eventBus.emit('staff.invitation.resent', {
      invitationId: invitation.id,
      email: invitation.email,
      hotelId: invitation.hotelId,
      magicLink,
      hotelName: invitation.hotel?.name,
      expiresAt: invitation.expiresAt,
      timestamp: new Date()
    })
  }

  return { invitation, magicLink, token }
}

export async function validateInvitationToken(
  token: string
): Promise<InvitationValidationResult> {
  const tokenHash = hashToken(token)
  const invitation = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
    include: { hotel: true }
  })

  if (!invitation) {
    return {
      valid: false,
      error: 'Invalid invitation token'
    }
  }

  if (invitation.acceptedAt) {
    return {
      valid: false,
      error: 'Invitation already accepted'
    }
  }

  if (invitation.expiresAt < new Date()) {
    return {
      valid: false,
      error: 'Invitation has expired'
    }
  }

  return {
    valid: true,
    invitation
  }
}

export async function acceptStaffInvitation(
  input: AcceptInvitationInput
): Promise<{ user: any; staffProfile: any; invitation: any }> {
  const validation = await validateInvitationToken(input.token)
  if (!validation.valid || !validation.invitation) {
    throw new Error(validation.error || 'Invalid invitation')
  }

  const invitation = validation.invitation
  const hashedPassword = await bcrypt.hash(input.password, 10)

  const user = await prisma.user.create({
    data: {
      email: invitation.email,
      name: invitation.email.split('@')[0],
      password: hashedPassword,
      role: invitation.role || 'STAFF',
      hotelId: invitation.hotelId,
      emailVerified: new Date()
    }
  })

  const updatedInvitation = await prisma.staffInvitation.update({
    where: { id: invitation.id },
    data: {
      acceptedAt: new Date()
    }
  })

  if (eventBus?.emit) {
    eventBus.emit('staff.invitation.accepted', {
      invitationId: invitation.id,
      userId: user.id,
      email: invitation.email,
      hotelId: invitation.hotelId,
      timestamp: new Date()
    })
  }

  return { user, staffProfile: null, invitation: updatedInvitation }
}

export async function cancelStaffInvitation(invitationId: string): Promise<any> {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId }
  })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.acceptedAt) {
    throw new Error('Cannot cancel accepted invitation')
  }

  const updatedInvitation = await prisma.staffInvitation.delete({
    where: { id: invitationId }
  })

  if (eventBus?.emit) {
    eventBus.emit('staff.invitation.cancelled', {
      invitationId: invitation.id,
      email: invitation.email,
      hotelId: invitation.hotelId,
      timestamp: new Date()
    })
  }

  return updatedInvitation
}

export async function listStaffInvitations(
  hotelId: string
): Promise<any[]> {
  return prisma.staffInvitation.findMany({
    where: {
      hotelId
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function cleanupExpiredInvitations(): Promise<number> {
  const result = await prisma.staffInvitation.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })

  return result.count
}

export { InvitationStatus }
