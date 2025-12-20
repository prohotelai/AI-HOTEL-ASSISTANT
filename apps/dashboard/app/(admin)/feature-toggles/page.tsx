import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { Flag, Plus, Power, Search, ToggleLeft } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export default async function FeatureTogglesPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/feature-toggles')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_MANAGE)
  const query = typeof searchParams?.q === 'string' ? searchParams.q : undefined

  // TODO: Create FeatureFlag model in Prisma schema and load flags
  const featureFlags: FeatureFlagRecord[] = []

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-3 text-blue-300/80">
          <Flag className="h-6 w-6" />
          <p className="text-xs uppercase tracking-[0.4em]">Feature Management</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Feature Toggles</h1>
            <p className="text-sm text-white/60">Control feature rollouts, A/B tests, and experimental capabilities.</p>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-400">
            <Plus className="mr-2 h-4 w-4" /> New feature flag
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Active Flags</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-white/50">TODO: Count enabled flags</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Rollout Progress</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-white/50">TODO: Track gradual rollouts</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Last Modified</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-white/50">TODO: Display recent change</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <form className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            type="search"
            defaultValue={query}
            placeholder="Search feature flags by key or description"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            name="q"
          />
          <Button type="submit" variant="ghost" className="text-xs text-white/70">
            Search
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/30 p-12 text-center">
          <Flag className="mx-auto h-12 w-12 text-white/30" />
          <p className="mt-4 text-sm text-white/60">No feature flags configured.</p>
          <p className="mt-2 text-xs text-white/50">
            TODO: Create FeatureFlag Prisma model with fields: key, name, description, enabled, rolloutPercentage, targetAudience, createdBy, updatedAt.
          </p>
          <p className="mt-3 text-xs text-white/50">
            Example flags: enable_voice_assistant, beta_multilang_widget, experimental_auto_escalation.
          </p>
          <Button className="mt-6 bg-blue-500 hover:bg-blue-400">
            <Plus className="mr-2 h-4 w-4" /> Create first flag
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-6">
        <div className="flex items-start gap-3 text-blue-100">
          <Power className="mt-0.5 h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Best Practices</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-100/80">
              <li>• Use descriptive keys with module prefix (e.g., chat.enable_ai_fallback)</li>
              <li>• Document expected behavior in description field</li>
              <li>• Test flags in staging before production rollout</li>
              <li>• Archive obsolete flags after full deployment</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

type FeatureFlagRecord = {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  rolloutPercentage: number
  targetAudience: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}
