import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Building2, ExternalLink, Plus, Search, TrendingUp } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export default async function AffiliatesPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/affiliates')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)
  const query = typeof searchParams?.q === 'string' ? searchParams.q : undefined

  // TODO: Create Affiliate model in Prisma schema and implement proper data loading
  const affiliates: AffiliateRecord[] = []

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-3 text-blue-300/80">
          <Building2 className="h-6 w-6" />
          <p className="text-xs uppercase tracking-[0.4em]">Affiliate Network</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Partners & Referrals</h1>
            <p className="text-sm text-white/60">Manage affiliate relationships, commissions, and performance tracking.</p>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-400">
            <Plus className="mr-2 h-4 w-4" /> Add affiliate
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Active Partners</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-white/50">TODO: Count active affiliates</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Total Referrals</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-white/50">TODO: Sum referral bookings</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Commission Owed</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-white/50">TODO: Calculate pending</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Conversion Rate</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-white/50">TODO: Compute rate</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <form className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            type="search"
            defaultValue={query}
            placeholder="Search affiliates by name or code"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            name="q"
          />
          <Button type="submit" variant="ghost" className="text-xs text-white/70">
            Search
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/30 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-white/30" />
          <p className="mt-4 text-sm text-white/60">No affiliates configured yet.</p>
          <p className="mt-2 text-xs text-white/50">
            TODO: Implement Affiliate Prisma model with fields: name, code, commissionRate, status, referralCount, totalEarnings.
          </p>
          <Button className="mt-6 bg-blue-500 hover:bg-blue-400">
            <Plus className="mr-2 h-4 w-4" /> Create first affiliate
          </Button>
        </div>
      </section>
    </div>
  )
}

type AffiliateRecord = {
  id: string
  name: string
  code: string
  commissionRate: number
  status: string
  referralCount: number
  totalEarnings: number
  createdAt: Date
}
