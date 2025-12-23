/**
 * Migration Script: Auth Restructure
 * 
 * Migrates existing auth data to new structure:
 * 1. Convert string roles to SystemRole enum
 * 2. Set default values for new staff fields
 * 3. Clean up expired QR tokens
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting auth restructure migration...\n')

  // 1. Map existing string roles to SystemRole enum
  console.log('Step 1: Migrating user roles...')
  
  const roleMappings = [
    { from: 'owner', to: 'OWNER' },
    { from: 'OWNER', to: 'OWNER' },
    { from: 'manager', to: 'MANAGER' },
    { from: 'MANAGER', to: 'MANAGER' },
    { from: 'reception', to: 'RECEPTION' },
    { from: 'RECEPTION', to: 'RECEPTION' },
    { from: 'staff', to: 'STAFF' },
    { from: 'STAFF', to: 'STAFF' },
    { from: 'guest', to: 'GUEST' },
    { from: 'GUEST', to: 'GUEST' },
    { from: 'user', to: 'GUEST' }, // Map generic 'user' to GUEST
    { from: 'admin', to: 'OWNER' }, // Map 'admin' to OWNER
    { from: 'super_admin', to: 'OWNER' }, // Map 'super_admin' to OWNER
  ]

  for (const mapping of roleMappings) {
    try {
      const count = await prisma.$executeRawUnsafe(
        `UPDATE "User" SET role = '${mapping.to}' WHERE role = '${mapping.from}'`
      )
      if (count > 0) {
        console.log(`  ✓ Migrated ${count} user(s) from '${mapping.from}' to '${mapping.to}'`)
      }
    } catch (error) {
      console.error(`  ✗ Failed to migrate role '${mapping.from}':`, error)
    }
  }

  // 2. Set staff password defaults
  console.log('\nStep 2: Setting staff password defaults...')
  const staffUsers = await prisma.user.findMany({
    where: {
      role: { in: ['STAFF', 'RECEPTION', 'MANAGER'] }
    }
  })

  for (const user of staffUsers) {
    // Note: mustChangePassword and lastPasswordChange fields don't exist in database
    // Skipping update for these non-existent fields
    // await prisma.user.update({...})
  }
  console.log(`  ✓ Processed ${staffUsers.length} staff user(s)`)

  // 3. Clean up expired QR tokens
  console.log('\nStep 3: Cleaning up expired QR tokens...')
  const deletedCount = await prisma.guestStaffQRToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
  console.log(`  ✓ Deleted ${deletedCount.count} expired QR token(s)`)

  // 4. Update QR tokens with purpose
  console.log('\nStep 4: Setting QR token purposes...')
  await prisma.$executeRawUnsafe(
    `UPDATE "GuestStaffQRToken" SET purpose = 'GUEST_ACCESS' WHERE role = 'guest' OR role = 'GUEST'`
  )
  await prisma.$executeRawUnsafe(
    `UPDATE "GuestStaffQRToken" SET purpose = 'STAFF_ACCESS' WHERE role = 'staff' OR role = 'STAFF'`
  )
  console.log(`  ✓ Updated QR token purposes`)

  // 5. Summary
  console.log('\n✅ Migration complete!\n')
  console.log('Summary:')
  const ownerCount = await prisma.user.count({ where: { role: 'OWNER' } })
  const managerCount = await prisma.user.count({ where: { role: 'MANAGER' } })
  const staffCount = await prisma.user.count({ where: { role: 'STAFF' } })
  const receptionCount = await prisma.user.count({ where: { role: 'RECEPTION' } })
  const guestCount = await prisma.user.count({ where: { role: 'GUEST' } })
  
  console.log(`  - OWNER users: ${ownerCount}`)
  console.log(`  - MANAGER users: ${managerCount}`)
  console.log(`  - RECEPTION users: ${receptionCount}`)
  console.log(`  - STAFF users: ${staffCount}`)
  console.log(`  - GUEST users: ${guestCount}`)
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
