export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Knowledge Base Import API
 * POST /api/onboarding/[hotelId]/kb/import
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { importKnowledgeBase, importFromUrl } from '@/lib/services/onboarding/knowledgeBaseImporter'
import { logOnboardingEvent } from '@/lib/services/onboarding/onboardingService'
import { z } from 'zod'

const importSchema = z.object({
  content: z.string().min(1, 'Content required'),
  source: z.enum(['file', 'url', 'manual']),
  sourceUrl: z.string().url().optional(),
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
    const validated = importSchema.parse(body)

    let result

    // Import from URL
    if (validated.source === 'url' && validated.sourceUrl) {
      result = await importFromUrl(validated.sourceUrl, params.hotelId)
    } else {
      // Import from content
      result = await importKnowledgeBase(params.hotelId, validated.content, {
        source: validated.source,
      })
    }

    // Log event
    await logOnboardingEvent(
      params.hotelId,
      'knowledge-base',
      'import-completed',
      {
        source: validated.source,
        chunksCreated: result.chunksCreated,
        vectorsIndexed: result.vectorsIndexed,
        errors: result.errors,
      }
    )

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('KB import error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Import failed', message: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/onboarding/[hotelId]/kb/import - Rollback last import
 */
export async function DELETE(
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

    const { rollbackLastImport } = await import('@/lib/services/onboarding/knowledgeBaseImporter')
    const deletedCount = await rollbackLastImport(params.hotelId)

    await logOnboardingEvent(
      params.hotelId,
      'knowledge-base',
      'rollback',
      { deletedCount }
    )

    return NextResponse.json({
      success: true,
      deletedCount,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Rollback failed', message: String(error) },
      { status: 500 }
    )
  }
}
