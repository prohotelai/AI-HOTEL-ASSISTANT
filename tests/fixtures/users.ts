// tests/fixtures/users.ts
export const mockUsers = {
  admin: {
    id: 'user-admin-1',
    email: 'admin@hotel.com',
    name: 'Admin User',
    role: 'ADMIN' as const,
    hotelId: 'hotel-1',
    createdAt: new Date('2024-01-01'),
    password: 'hashed-password-admin',
  },
  manager: {
    id: 'user-manager-1',
    email: 'manager@hotel.com',
    name: 'Manager User',
    role: 'MANAGER' as const,
    hotelId: 'hotel-1',
    createdAt: new Date('2024-01-02'),
    password: 'hashed-password-manager',
  },
  staff: {
    id: 'user-staff-1',
    email: 'staff@hotel.com',
    name: 'Staff User',
    role: 'STAFF' as const,
    hotelId: 'hotel-1',
    createdAt: new Date('2024-01-03'),
    password: 'hashed-password-staff',
  },
  guest: {
    id: 'user-guest-1',
    email: 'guest@hotel.com',
    name: 'Guest User',
    role: 'GUEST' as const,
    hotelId: 'hotel-1',
    createdAt: new Date('2024-01-04'),
    password: 'hashed-password-guest',
  },
}
