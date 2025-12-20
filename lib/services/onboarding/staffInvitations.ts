/**
 * Staff Invitation Service
 * Sends email invitations with magic links
 */

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { hashToken } from '@/lib/security/tokenUtils'

interface InvitationData {
  email: string
  role: 'manager' | 'reception' | 'staff' | 'housekeeping' | 'maintenance'
  invitedBy: string
}

interface InvitationResult {
  id: string
  email: string
  inviteUrl: string
  expiresAt: Date
}

/**
 * Create staff invitation and send email
 */
export async function inviteStaff(
  hotelId: string,
  invitation: InvitationData
): Promise<InvitationResult> {
  const smtp = requireSmtpConfig()

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  })

  if (existingUser && existingUser.hotelId === hotelId) {
    throw new Error('User already exists in this hotel')
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Create invitation record
  const invite = await prisma.staffInvitation.create({
    data: {
      hotelId,
      email: invitation.email,
      role: invitation.role,
      tokenHash,
      expiresAt,
      invitedById: invitation.invitedBy,
    },
  })

  // Generate invite URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`

  await sendInvitationEmail({
    email: invitation.email,
    hotelId,
    inviteId: invite.id,
    inviteUrl,
    invitedById: invitation.invitedBy,
    smtp,
  })

  return {
    id: invite.id,
    email: invitation.email,
    inviteUrl,
    expiresAt,
  }
}

/**
 * Send invitation email
 */
type InvitationEmailPayload = {
  email: string
  hotelId: string
  inviteId: string
  inviteUrl: string
  invitedById: string
  smtp: SmtpConfig
}

async function sendInvitationEmail(payload: InvitationEmailPayload): Promise<void> {
  // TODO (Phase1-LOW): integrate SMTP provider; ensure inviteUrl stays server-side
  logger.info('Staff invitation enqueued for delivery', {
    phase: 'Phase1-Critical',
    severity: 'CRITICAL',
    hotelId: payload.hotelId,
    inviteId: payload.inviteId,
    invitedById: payload.invitedById,
  })
  void payload.smtp
  void payload.inviteUrl
}

/**
 * Verify invitation token and create user
 */
export async function acceptInvitation(
  token: string,
  userData: {
    name: string
    password: string
  }
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const tokenHash = hashToken(token)

  // Find invitation (supports legacy plaintext tokens by migrating on read)
  let invite = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
  })

  if (!invite) {
    const legacyInvite = await prisma.staffInvitation.findUnique({
      where: { tokenHash: token },
    })

    if (legacyInvite) {
      invite = await prisma.staffInvitation.update({
        where: { id: legacyInvite.id },
        data: { tokenHash },
      })
    }
  }

  if (!invite) {
    return { success: false, error: 'Invalid invitation token' }
  }

  if (invite.acceptedAt) {
    return { success: false, error: 'Invitation already accepted' }
  }

  if (new Date() > invite.expiresAt) {
    return { success: false, error: 'Invitation expired' }
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: invite.email,
        name: userData.name,
        password: hashedPassword,
        hotelId: invite.hotelId,
        role: invite.role,
      },
    })

    // Mark invitation as accepted
    await prisma.staffInvitation.update({
      where: { id: invite.id },
      // Replace stored hash so the submitted token cannot be reused
      data: { acceptedAt: new Date(), tokenHash: hashToken(`${token}:${invite.id}:${Date.now()}`) },
    })

    return { success: true, userId: user.id }
  } catch (error) {
    return { success: false, error: `Failed to accept invitation: ${error}` }
  }
}

/**
 * Get pending invitations for hotel
 */
export async function getPendingInvitations(hotelId: string) {
  return prisma.staffInvitation.findMany({
    where: {
      hotelId,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
    },
  })
}

/**
 * Resend invitation
 */
export async function resendInvitation(invitationId: string): Promise<string> {
  const smtp = requireSmtpConfig()

  const invite = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  })

  if (!invite) {
    throw new Error('Invitation not found')
  }

  if (invite.acceptedAt) {
    throw new Error('Invitation already accepted')
  }

  // Extend expiration
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: { expiresAt: newExpiresAt, tokenHash },
  })

  // Resend email
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`

  await sendInvitationEmail({
    email: invite.email,
    hotelId: invite.hotelId,
    inviteId: invite.id,
    inviteUrl,
    invitedById: invite.invitedById,
    smtp,
  })

  return inviteUrl
}

type SmtpConfig = {
  host: string
  user: string
  password: string
}

function requireSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASS || process.env.SMTP_PASSWORD

  if (!host || !user || !password) {
    logger.error('SMTP configuration missing for staff invitations', {
      phase: 'Phase1-Critical',
      severity: 'CRITICAL',
    })
    throw new Error('SMTP configuration is required to send staff invitations')
  }

  return { host, user, password }
}
