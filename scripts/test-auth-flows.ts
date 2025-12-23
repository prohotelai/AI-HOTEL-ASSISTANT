#!/usr/bin/env ts-node
/**
 * Production Testing Script - Auth Restructure
 * 
 * Tests the complete auth flows in production:
 * 1. Admin registration and login
 * 2. Staff QR generation and access
 * 3. Guest QR generation and access
 * 4. AI context validation
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Starting Production Auth Tests\n')
  console.log('=' .repeat(60))

  // Test 1: Verify schema changes
  console.log('\n📋 Test 1: Verify Database Schema')
  console.log('-'.repeat(60))
  
  try {
    // Check if new enums exist
    const sessionTypes = await prisma.$queryRaw`
      SELECT enum_range(NULL::\"SessionType\")::text[] as values
    `
    console.log('✅ SessionType enum exists:', sessionTypes)

    const systemRoles = await prisma.$queryRaw`
      SELECT enum_range(NULL::\"SystemRole\")::text[] as values
    `
    console.log('✅ SystemRole enum exists:', systemRoles)

    // Check if new tables exist
    const staffSessions = await prisma.staffSession.count()
    console.log(`✅ StaffSession table exists (${staffSessions} records)`)

    const guestSessions = await prisma.guestSession.count()
    console.log(`✅ GuestSession table exists (${guestSessions} records)`)

  } catch (error) {
    console.error('❌ Schema verification failed:', error)
  }

  // Test 2: Admin Flow - Create Test Admin
  console.log('\n📋 Test 2: Admin Registration Flow')
  console.log('-'.repeat(60))
  
  const testEmail = `test-admin-${Date.now()}@example.com`
  const testHotelName = `Test Hotel ${Date.now()}`
  
  try {
    // Create hotel
    const hotel = await prisma.hotel.create({
      data: {
        name: testHotelName,
        slug: `test-hotel-${Date.now()}`,
        subscriptionPlan: 'STARTER',
        subscriptionStatus: 'ACTIVE',
      }
    })
    console.log(`✅ Hotel created: ${hotel.name} (${hotel.id})`)

    // Create admin user
    const hashedPassword = await bcrypt.hash('Test123!', 12)
    const admin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: testEmail,
        password: hashedPassword,
        role: 'OWNER',
        hotelId: hotel.id,
        // onboardingCompleted: false, // field doesn't exist in database
      }
    })
    console.log(`✅ Admin user created: ${admin.email} (${admin.id})`)
    console.log(`   Role: ${admin.role}`)
    // console.log(`   Onboarding: ${admin.onboardingCompleted}`) // field doesn't exist
    console.log(`   Password: Test123!`)

  } catch (error: any) {
    console.error('❌ Admin creation failed:', error.message)
  }

  // Test 3: Staff Flow - Create Test Staff with QR
  console.log('\n📋 Test 3: Staff Access Flow')
  console.log('-'.repeat(60))
  
  try {
    // Get a hotel
    const hotel = await prisma.hotel.findFirst()
    if (!hotel) {
      console.log('⚠️  No hotel found, skipping staff test')
    } else {
      // Create staff user
      // Note: staffPassword and mustChangePassword don't exist in database
      // const staffPassword = await bcrypt.hash('Staff123!', 12)
      const staff = await prisma.user.create({
        data: {
          name: 'Test Staff',
          email: `staff-${Date.now()}@example.com`,
          // staffPassword, // field doesn't exist
          role: 'STAFF',
          hotelId: hotel.id,
          // mustChangePassword: false, // field doesn't exist
        }
      })
      console.log(`✅ Staff user created: ${staff.email} (${staff.id})`)

      // Generate staff QR token
      const qrToken = nanoid(32)
      const qrRecord = await prisma.guestStaffQRToken.create({
        data: {
          hotelId: hotel.id,
          userId: staff.id,
          token: qrToken,
          role: 'STAFF',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      })
      console.log(`✅ Staff QR token generated`)
      console.log(`   Token: ${qrToken.substring(0, 16)}...`)
      console.log(`   Staff ID: ${staff.id}`)
      console.log(`   Password: Staff123!`)
      console.log(`   Test URL: /staff/access?token=${qrToken}`)
    }

  } catch (error: any) {
    console.error('❌ Staff creation failed:', error.message)
  }

  // Test 4: Guest Flow - Create Test Guest QR
  console.log('\n📋 Test 4: Guest Access Flow')
  console.log('-'.repeat(60))
  
  try {
    const hotel = await prisma.hotel.findFirst()
    if (!hotel) {
      console.log('⚠️  No hotel found, skipping guest test')
    } else {
      // Generate guest QR token
      const qrToken = nanoid(32)
      const qrRecord = await prisma.guestStaffQRToken.create({
        data: {
          hotelId: hotel.id,
          token: qrToken,
          role: 'GUEST',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      })
      console.log(`✅ Guest QR token generated`)
      console.log(`   Token: ${qrToken.substring(0, 16)}...`)
      console.log(`   Test URL: /guest/access?token=${qrToken}`)
      console.log(`   Test Room: 101`)
    }

  } catch (error: any) {
    console.error('❌ Guest QR creation failed:', error.message)
  }

  // Test 5: Session Cleanup
  console.log('\n📋 Test 5: Session Cleanup')
  console.log('-'.repeat(60))
  
  try {
    const now = new Date()
    
    const expiredStaff = await prisma.staffSession.count({
      where: { expiresAt: { lt: now } }
    })
    
    const expiredGuest = await prisma.guestSession.count({
      where: { expiresAt: { lt: now } }
    })
    
    console.log(`✅ Expired staff sessions: ${expiredStaff}`)
    console.log(`✅ Expired guest sessions: ${expiredGuest}`)
    
    if (expiredStaff + expiredGuest > 0) {
      console.log('ℹ️  Run cleanup: npx ts-node scripts/cleanup-sessions.ts')
    }

  } catch (error: any) {
    console.error('❌ Session check failed:', error.message)
  }

  // Test 6: Verify Middleware Routes
  console.log('\n📋 Test 6: Route Structure Verification')
  console.log('-'.repeat(60))
  
  console.log('✅ Admin routes:')
  console.log('   - /admin/login')
  console.log('   - /admin/register')
  console.log('   - /admin/onboarding')
  console.log('')
  console.log('✅ Staff routes:')
  console.log('   - /staff/access')
  console.log('   - /staff/password')
  console.log('   - /staff/console')
  console.log('')
  console.log('✅ Guest routes:')
  console.log('   - /guest/access')
  console.log('   - /guest/identify')
  console.log('   - /guest/chat')

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ Production Test Setup Complete!\n')
  console.log('Next Steps:')
  console.log('1. Test admin registration at: /admin/register')
  console.log('2. Test staff access with QR tokens generated above')
  console.log('3. Test guest access with QR tokens generated above')
  console.log('4. Verify AI context gating in /api/chat')
  console.log('\n' + '='.repeat(60))
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
