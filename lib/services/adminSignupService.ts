/**
 * Admin Signup Service
 * 
 * Handles hotel admin registration with atomic transaction:
 * - Creates User (role: OWNER)
 * - Creates Hotel entity
 * - Links user to hotel
 * - Generates unique hotelId in format H-XXXXX
 * 
 * All-or-nothing: If any step fails, entire transaction rolls back
 */

import { prisma } from '@/lib/prisma'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { generatePermanentHotelQR } from './hotelQrService'

export interface AdminSignupInput {
  name: string
  email: string
  password: string
  hotelName: string
}

export interface AdminSignupResult {
  success: boolean
  userId: string
  hotelId: string
  email: string
}

/**
 * Generate unique hotelId
 * Format: H-{5 random chars} (e.g., H-AX2K9)
 */
function generateHotelId(): string {
  const randomPart = nanoid(5).toUpperCase()
  return `H-${randomPart}`
}

/**
 * Create hotel admin account with hotel entity in a single transaction
 * 
 * CRITICAL SAFETY:
 * - This creates both User AND Hotel atomically
 * - If any step fails, entire transaction rolls back
 * - No orphaned users or hotels left in database
 * 
 * User Setup:
 * - role = OWNER (cannot be changed via API)
 * - hotelId = newly created hotel's ID (required for all operations)
 * - password = bcrypt hashed (cost 12, stronger than default)
 * 
 * Hotel Setup:
 * - name = input.hotelName (immutable after signup)
 * - slug = URL-friendly version (derived from name)
 * - subscriptionPlan = STARTER (default free tier)
 * - subscriptionStatus = ACTIVE (billing enabled)
 * 
 * Validation:
 * - Email must be unique
 * - Password must be >= 8 chars (enforced)
 * - Hotel name must not be empty (enforced)
 * 
 * On failure:
 * - Entire transaction rolls back
 * - No orphaned records created
 * - Error thrown to caller (caught in API handler)
 */
export async function createHotelAdminSignup(
  input: AdminSignupInput
): Promise<AdminSignupResult> {
  // Validate inputs
  if (!input.email?.trim() || !input.password || !input.hotelName?.trim()) {
    throw new Error('Email, password, and hotel name are required')
  }

  if (input.password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(input.email)) {
    throw new Error('Invalid email format')
  }

  const emailLower = input.email.toLowerCase()

  console.log('Creating hotel admin signup for:', { email: emailLower, hotelName: input.hotelName })

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: emailLower },
    select: {
      id: true,
      email: true,
    }
  })

  if (existingUser) {
    throw new Error('An account with this email already exists')
  }

  // Hash password with bcrypt cost 12 (stronger for admin)
  const hashedPassword = await bcrypt.hash(input.password, 12)

  // Generate unique hotel ID
  let hotelId = generateHotelId()
  
  // Ensure uniqueness (extremely rare collision, but be safe)
  let existingHotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true }
  })
  
  while (existingHotel) {
    hotelId = generateHotelId()
    existingHotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true }
    })
  }

  console.log('Generated hotelId:', hotelId)

  // Generate permanent QR code OUTSIDE transaction
  // (Prisma transactions should not contain non-Prisma async operations)
  console.log('Generating QR code...')
  const { qrCode, qrPayload } = await generatePermanentHotelQR(hotelId)
  console.log('QR code generated')

  // Create user and hotel in atomic transaction
  // If hotel creation fails, user creation rolls back
  const result = await prisma.$transaction(async (tx) => {
    console.log('Creating hotel...')
    // 1. Create Hotel with permanent QR
    const hotel = await tx.hotel.create({
      data: {
        id: hotelId,
        name: input.hotelName.trim(),
        slug: generateSlug(input.hotelName),
        // Set default plan to STARTER
        subscriptionPlan: SubscriptionPlan.STARTER,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        // Permanent QR identity
        qrCode,
        qrPayload,
      }
    })

    console.log('Hotel created:', hotel.id)

    // 2. Create User linked to Hotel
    console.log('Creating user...')
    const user = await tx.user.create({
      data: {
        name: input.name?.trim() || null,
        email: emailLower,
        password: hashedPassword,
        role: 'OWNER' as any, // Use string directly, avoiding enum type issues
        hotelId: hotel.id,
      }
    })

    console.log('User created:', user.id)

    return { user, hotel }
  })

  console.log('Hotel admin signup successful:', {
    userId: result.user.id,
    hotelId: result.hotel.id,
    email: result.user.email,
    hotelName: result.hotel.name,
  })

  return {
    success: true,
    userId: result.user.id,
    hotelId: result.hotel.id,
    email: result.user.email,
  }
}

/**
 * Generate URL-friendly slug from hotel name
 * Example: "Sunset Beach Hotel" → "sunset-beach-hotel"
 */
function generateSlug(hotelName: string): string {
  return hotelName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
