/**
 * Migration Script: Add Permanent QR Codes to Existing Hotels
 * 
 * This script:
 * 1. Finds all hotels without qrCode
 * 2. Generates permanent QR for each
 * 3. Updates Hotel records
 * 
 * Run: npx ts-node scripts/migrate-hotel-qr-codes.ts
 */

import { PrismaClient } from '@prisma/client'
import { generatePermanentHotelQR } from '../lib/services/hotelQrService.js'

const prisma = new PrismaClient()

async function migrateHotelQRCodes() {
  console.log('🔄 Starting hotel QR code migration...\n')

  try {
    // Find all hotels without QR codes
    const hotelsWithoutQR = await prisma.hotel.findMany({
      where: {
        OR: [
          { qrCode: null },
          { qrPayload: null }
        ]
      },
      select: {
        id: true,
        name: true,
        qrCode: true,
        qrPayload: true
      }
    })

    console.log(`📊 Found ${hotelsWithoutQR.length} hotels without QR codes\n`)

    if (hotelsWithoutQR.length === 0) {
      console.log('✅ All hotels already have QR codes!')
      return
    }

    let successCount = 0
    let errorCount = 0

    // Generate QR for each hotel
    for (const hotel of hotelsWithoutQR) {
      try {
        console.log(`Processing: ${hotel.name} (${hotel.id})`)
        
        const { qrCode, qrPayload } = await generatePermanentHotelQR(hotel.id)

        await prisma.hotel.update({
          where: { id: hotel.id },
          data: {
            qrCode,
            qrPayload
          }
        })

        console.log(`  ✓ Generated QR: ${qrCode.substring(0, 10)}...\n`)
        successCount++
      } catch (error) {
        console.error(`  ✗ Failed for ${hotel.name}:`, error)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`✅ Migration Complete!`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateHotelQRCodes()
  .then(() => {
    console.log('\n✨ Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error)
    process.exit(1)
  })
