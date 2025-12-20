export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Widget Key Generation API
 * POST /api/onboarding/[hotelId]/widget/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { generateWidgetKey } from '@/lib/services/onboarding/onboardingService'
import { widgetConfigSchema } from '@/lib/validation/onboarding'

export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })

    if (!token || !token.hotelId || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hotelId } = params

    // Enforce tenant boundary
    if (token.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = widgetConfigSchema.parse(body)

    const { key, keyPrefix } = await generateWidgetKey(
      hotelId,
      token.id as string,
      validated.label
    )

    return NextResponse.json({
      success: true,
      key,
      keyPrefix,
      snippet: generateWidgetSnippet(key, hotelId),
    })
  } catch (error: any) {
    console.error('Widget key generation error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate widget key' },
      { status: 500 }
    )
  }
}

function generateWidgetSnippet(key: string, hotelId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return `<!-- AI Hotel Assistant Widget -->
<script>
  (function() {
    window.aiHotelConfig = {
      widgetKey: '${key}',
      hotelId: '${hotelId}',
      apiUrl: '${appUrl}/api'
    };
    var script = document.createElement('script');
    script.src = '${appUrl}/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`
}
