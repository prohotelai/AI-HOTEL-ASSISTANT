// POST /api/pms-adapter/enable
// POST /api/pms-adapter/disable
import { POST_enable, POST_disable } from '@/modules/pms-adapter/api/pms.routes'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  if (action === 'disable') {
    return POST_disable(request as any)
  }
  
  return POST_enable(request as any)
}
