/**
 * POST /api/onboarding/steps/[stepName]/skip
 * 
 * Skip a step and continue
 * - Marks step as skipped (not completed)
 * - Can be resumed later from dashboard
 */

import { NextRequest } from 'next/server'
import { createStepHandler } from '@/lib/services/onboarding/stepHandlerFactory'

export const dynamic = 'force-dynamic'

export const POST = createStepHandler('hotel-details', {
  action: 'skip',
  handler: async () => 'skipped',
})
