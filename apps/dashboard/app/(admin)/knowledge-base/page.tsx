import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function KnowledgeBasePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-8">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-yellow-500 mb-4">Knowledge Base Feature</h1>
        <p className="text-gray-300 mb-4">
          The Knowledge Base feature is not yet fully implemented. This feature requires additional 
          database models (KnowledgeBaseDocument, KnowledgeBaseChunk, etc.) that are not yet configured.
        </p>
        <p className="text-gray-400 text-sm">
          Status: Database schema pending | Expected: Phase 7
        </p>
      </div>
    </div>
  )
}
