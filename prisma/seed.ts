import { PrismaClient } from '@prisma/client'
import { SystemRole } from '@/lib/types/roles'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create demo hotel
  const demoHotel = await prisma.hotel.upsert({
    where: { slug: 'demo-hotel' },
    update: {},
    create: {
      name: 'Demo Grand Hotel',
      slug: 'demo-hotel',
      description: 'A luxury demonstration hotel',
      email: 'info@demograndhotel.com',
      phone: '+1 (555) 123-4567',
      address: '123 Demo Street, Demo City, DC 12345',
      widgetColor: '#3B82F6',
      widgetTitle: 'Chat with Demo Grand Hotel',
    },
  })

  console.log('Created demo hotel:', demoHotel.name)

  // Create demo admin user
  const hashedPassword = await bcrypt.hash('demo1234', 10)
  const demoUser = await prisma.user.upsert({
    where: { email: 'admin@demograndhotel.com' },
    update: {},
    create: {
      name: 'Demo Admin',
      email: 'admin@demograndhotel.com',
      password: hashedPassword,
      role: SystemRole.OWNER,
      hotelId: demoHotel.id,
    },
  })

  console.log('Created demo user:', demoUser.email)

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
