#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRBAC() {
  try {
    // Get hotel
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
      console.error('❌ No hotel found');
      process.exit(1);
    }
    
    console.log('🏨 Hotel:', hotel.name);
    
    // Seed permissions if not already seeded
    let permCount = await prisma.permission.count();
    if (permCount === 0) {
      console.log('📝 Seeding permissions...');
      
      const permissions = [
        { key: 'pms:read', name: 'Read PMS', group: 'pms', resource: 'pms', action: 'read' },
        { key: 'pms:bookings.read', name: 'Read Bookings', group: 'pms', resource: 'bookings', action: 'read' },
        { key: 'pms:bookings.create', name: 'Create Booking', group: 'pms', resource: 'bookings', action: 'create' },
        { key: 'admin:access', name: 'Admin Access', group: 'system', resource: 'admin', action: 'access' },
        { key: 'staff:access', name: 'Staff Access', group: 'system', resource: 'staff', action: 'access' },
      ];
      
      for (const perm of permissions) {
        await prisma.permission.upsert({
          where: { key: perm.key },
          update: {},
          create: perm
        });
      }
      permCount = await prisma.permission.count();
    }
    
    // Seed default roles
    let roleCount = await prisma.role.count();
    if (roleCount === 0) {
      console.log('👤 Seeding roles...');
      
      const roles = [
        { name: 'Admin', key: 'admin', level: 4, description: 'Administrator' },
        { name: 'Manager', key: 'manager', level: 3, description: 'Hotel Manager' },
        { name: 'Staff', key: 'staff', level: 1, description: 'General Staff' },
        { name: 'Guest', key: 'guest', level: 0, description: 'Hotel Guest' },
      ];
      
      for (const role of roles) {
        await prisma.role.create({
          data: {
            ...role,
            hotelId: hotel.id,
            id: role.key + '-' + hotel.id.substring(0, 8)
          }
        });
      }
      roleCount = await prisma.role.count();
    }
    
    console.log('\n✅ Database Status:');
    console.log('  Hotels:', await prisma.hotel.count());
    console.log('  Users:', await prisma.user.count());
    console.log('  Roles:', roleCount);
    console.log('  Permissions:', permCount);
    console.log('  ✅ RBAC system is ready!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedRBAC();
