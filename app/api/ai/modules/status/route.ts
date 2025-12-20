/**
 * AI Modules Status API Endpoint
 * Returns available AI modules and their status
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyQRAuth } from '@/lib/auth/qrAuth'

type AIModule = {
  id: string
  name: string
  description: string
  icon: string
  status: 'available' | 'busy' | 'error'
  requiredPermission: string
  lastUsed?: string
}

const AI_MODULES: AIModule[] = [
  {
    id: 'night-audit',
    name: 'Night Audit',
    description: 'Automated night audit for financial reconciliation',
    icon: '🌙',
    status: 'available',
    requiredPermission: 'ai:night-audit',
    lastUsed: '2024-01-15 23:30',
  },
  {
    id: 'task-routing',
    name: 'Task Routing',
    description: 'Automatically assign tasks to team members',
    icon: '🎯',
    status: 'available',
    requiredPermission: 'ai:task-routing',
    lastUsed: '2024-01-15 14:20',
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping Scheduling',
    description: 'Optimize cleaning schedules based on occupancy',
    icon: '🧹',
    status: 'available',
    requiredPermission: 'ai:housekeeping',
  },
  {
    id: 'forecasting',
    name: 'Forecasting',
    description: 'Occupancy & revenue predictions',
    icon: '📊',
    status: 'available',
    requiredPermission: 'ai:forecasting',
  },
  {
    id: 'maintenance-prediction',
    name: 'Maintenance Prediction',
    description: 'Predict maintenance issues before they happen',
    icon: '🔧',
    status: 'available',
    requiredPermission: 'ai:maintenance',
  },
  {
    id: 'billing-detection',
    name: 'Billing Detection',
    description: 'Automatic billing error detection',
    icon: '💳',
    status: 'available',
    requiredPermission: 'ai:billing',
  },
  {
    id: 'guest-messaging',
    name: 'Guest Messaging',
    description: 'AI-powered guest communication assistant',
    icon: '💬',
    status: 'available',
    requiredPermission: 'ai:messaging',
  },
  {
    id: 'room-status',
    name: 'Room Status Detection',
    description: 'Computer vision-based room status detection',
    icon: '📷',
    status: 'available',
    requiredPermission: 'ai:room-status',
  },
]

export async function GET(request: NextRequest) {
  try {
    // Verify QR authentication
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const qrSession = await verifyQRAuth(authToken)
    if (!qrSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Filter modules by user permissions
    const userPermissions = qrSession.permissions || []
    const availableModules = AI_MODULES.filter((module) => {
      return userPermissions.includes(module.requiredPermission)
    })

    // If no specific permissions, return all modules for staff
    if (qrSession.user.role === 'staff' && availableModules.length === 0) {
      return NextResponse.json(AI_MODULES)
    }

    return NextResponse.json(availableModules)
  } catch (error) {
    console.error('Error fetching AI modules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
