/**
 * Website Scan API
 * POST /api/onboarding/[hotelId]/scan
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { scanWebsite, saveScanToKnowledgeBase } from '@/lib/services/onboarding/websiteScanner'
import { logOnboardingEvent } from '@/lib/services/onboarding/onboardingService'
import { z } from 'zod'

const scanSchema = z.object({
  url: z.string().url('Invalid website URL'),
  saveToKb: z.boolean().optional().default(true),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })
    
    if (!token || token.hotelId !== params.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = scanSchema.parse(body)

    // Scan website
    const scanResult = await scanWebsite(validated.url, params.hotelId)

    // Save to knowledge base if requested
    let chunksCreated = 0
    if (validated.saveToKb) {
      chunksCreated = await saveScanToKnowledgeBase(params.hotelId, scanResult)
    }

    // Log event
    await logOnboardingEvent(
      params.hotelId,
      'website-scan',
      'completed',
      {
        url: validated.url,
        faqsFound: scanResult.faqs.length,
        servicesFound: scanResult.services.length,
        chunksCreated,
      }
    )

    return NextResponse.json({
      success: true,
      data: scanResult,
      chunksCreated,
    })
  } catch (error) {
    console.error('Website scan error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Website scan failed', message: String(error) },
      { status: 500 }
    )
  }
}
