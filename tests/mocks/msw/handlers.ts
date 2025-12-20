import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/signin', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: {
          id: 'test-user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'STAFF',
        },
        token: 'mock-jwt-token',
      })
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post('/api/auth/signout', () => {
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/auth/magic-link', async ({ request }) => {
    const body = await request.json() as { email: string }
    
    return HttpResponse.json({
      success: true,
      message: 'Magic link sent to email',
    })
  }),

  http.post('/api/auth/callback/credentials', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'staff@hotel.com' && body.password === 'password') {
      return HttpResponse.json({
        ok: true,
        user: {
          id: 'staff-1',
          email: 'staff@hotel.com',
          name: 'Staff Member',
          role: 'STAFF',
        },
      })
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  // Bookings endpoints
  http.get('/api/bookings', () => {
    return HttpResponse.json([
      {
        id: 'booking-1',
        guestName: 'John Doe',
        email: 'john@example.com',
        checkInDate: '2024-01-15T14:00:00Z',
        checkOutDate: '2024-01-20T11:00:00Z',
        roomNumber: '101',
        status: 'CONFIRMED',
        totalPrice: 500,
      },
    ])
  }),

  http.post('/api/bookings', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json(
      {
        id: 'booking-new-1',
        ...body,
        status: 'PENDING',
      },
      { status: 201 }
    )
  }),

  http.get('/api/bookings/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      guestName: 'John Doe',
      email: 'john@example.com',
      checkInDate: '2024-01-15T14:00:00Z',
      checkOutDate: '2024-01-20T11:00:00Z',
      roomNumber: '101',
      status: 'CONFIRMED',
      totalPrice: 500,
    })
  }),

  // Rooms endpoints
  http.get('/api/rooms', () => {
    return HttpResponse.json([
      {
        id: 'room-1',
        roomNumber: '101',
        roomType: 'DOUBLE',
        status: 'OCCUPIED',
        pricePerNight: 100,
      },
      {
        id: 'room-2',
        roomNumber: '102',
        roomType: 'SINGLE',
        status: 'VACANT',
        pricePerNight: 75,
      },
    ])
  }),

  // Staff endpoints
  http.get('/api/staff', () => {
    return HttpResponse.json([
      {
        id: 'staff-1',
        name: 'John Smith',
        email: 'john@hotel.com',
        role: 'HOUSEKEEPING',
        status: 'ACTIVE',
      },
      {
        id: 'staff-2',
        name: 'Jane Doe',
        email: 'jane@hotel.com',
        role: 'FRONT_DESK',
        status: 'ACTIVE',
      },
    ])
  }),

  http.post('/api/staff', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json(
      {
        id: `staff-${Date.now()}`,
        ...body,
        status: 'ACTIVE',
      },
      { status: 201 }
    )
  }),

  // Housekeeping endpoints
  http.get('/api/housekeeping/tasks', () => {
    return HttpResponse.json([
      {
        id: 'task-1',
        roomNumber: '101',
        type: 'CLEANING',
        priority: 'HIGH',
        status: 'PENDING',
        assignedTo: 'staff-1',
      },
      {
        id: 'task-2',
        roomNumber: '102',
        type: 'LINEN_CHANGE',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assignedTo: 'staff-2',
      },
    ])
  }),

  http.put('/api/housekeeping/tasks/:id', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      id: 'task-1',
      ...body,
    })
  }),

  // Payment endpoints
  http.post('/api/payments/process', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      id: `payment-${Date.now()}`,
      amount: body.amount,
      status: 'SUCCESS',
      transactionId: 'txn-12345',
    })
  }),

  http.post('/api/payments/refund', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      id: `refund-${Date.now()}`,
      amount: body.amount,
      status: 'SUCCESS',
    })
  }),

  // Analytics endpoints
  http.get('/api/analytics/summary', () => {
    return HttpResponse.json({
      totalRevenue: 50000,
      totalBookings: 250,
      occupancyRate: 0.85,
      averageRating: 4.5,
      newGuests: 45,
    })
  }),

  // Email endpoints
  http.post('/api/notifications/email', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      id: `email-${Date.now()}`,
      to: body.to,
      subject: body.subject,
      status: 'SENT',
    })
  }),

  // Widget endpoints
  http.post('/api/widget/validate-qr', async ({ request }) => {
    const body = await request.json()
    
    if (body.qrCode) {
      return HttpResponse.json({
        valid: true,
        type: 'CHECKIN',
        guestName: 'John Doe',
        roomNumber: '101',
      })
    }

    return HttpResponse.json(
      { valid: false, error: 'Invalid QR code' },
      { status: 400 }
    )
  }),
]
