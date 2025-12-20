import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Bell, Globe, Key, Palette, Save, Settings as SettingsIcon, Zap } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/settings')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      email: true,
      phone: true,
      address: true,
      widgetColor: true,
      widgetTitle: true,
      openaiKey: true,
      pineconeKey: true,
      stripeKey: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!hotel) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-8 text-rose-100">
        <p className="font-semibold">Hotel not found</p>
        <p className="mt-2 text-sm">Could not load settings for this hotel.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-3 text-blue-300/80">
          <SettingsIcon className="h-6 w-6" />
          <p className="text-xs uppercase tracking-[0.4em]">Configuration</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Hotel Settings</h1>
            <p className="text-sm text-white/60">Configure branding, integrations, and operational preferences.</p>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 text-white">
            <Globe className="h-5 w-5 text-blue-300" />
            <h2 className="text-lg font-semibold">General</h2>
          </div>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Hotel Name</label>
              <input
                type="text"
                defaultValue={hotel.name}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Slug</label>
              <input
                type="text"
                defaultValue={hotel.slug}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Description</label>
              <textarea
                defaultValue={hotel.description ?? ''}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 text-white">
            <Palette className="h-5 w-5 text-blue-300" />
            <h2 className="text-lg font-semibold">Branding</h2>
          </div>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Widget Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  defaultValue={hotel.widgetColor ?? '#3B82F6'}
                  className="h-10 w-20 rounded-xl border border-white/10 bg-black/40"
                />
                <input
                  type="text"
                  defaultValue={hotel.widgetColor ?? '#3B82F6'}
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Widget Title</label>
              <input
                type="text"
                defaultValue={hotel.widgetTitle ?? 'Chat with us'}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Logo URL</label>
              <input
                type="url"
                defaultValue={hotel.logo ?? ''}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 text-white">
            <Zap className="h-5 w-5 text-blue-300" />
            <h2 className="text-lg font-semibold">Integrations</h2>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">OpenAI API</p>
                <p className="text-xs text-white/50">Power AI assistant with GPT models</p>
              </div>
              <div className="flex items-center gap-2">
                {hotel.openaiKey && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Configured</span>
                )}
                <Button variant="outline" className="border-white/20 bg-white/10 text-white">
                  <Key className="mr-2 h-4 w-4" /> {hotel.openaiKey ? 'Update' : 'Configure'}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">PMS Provider</p>
                <p className="text-xs text-white/50">Sync bookings from property management system</p>
              </div>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white">
                <Key className="mr-2 h-4 w-4" /> Configure
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Vector Database (Pinecone)</p>
                <p className="text-xs text-white/50">Store embeddings for semantic search</p>
              </div>
              <div className="flex items-center gap-2">
                {hotel.pineconeKey && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Configured</span>
                )}
                <Button variant="outline" className="border-white/20 bg-white/10 text-white">
                  <Key className="mr-2 h-4 w-4" /> {hotel.pineconeKey ? 'Update' : 'Configure'}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Stripe</p>
                <p className="text-xs text-white/50">Payment processing and billing</p>
              </div>
              <div className="flex items-center gap-2">
                {hotel.stripeKey && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Configured</span>
                )}
                <Button variant="outline" className="border-white/20 bg-white/10 text-white">
                  <Key className="mr-2 h-4 w-4" /> {hotel.stripeKey ? 'Update' : 'Configure'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 text-white">
            <Bell className="h-5 w-5 text-blue-300" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="mt-6 space-y-4">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <input
                type="checkbox"
                defaultChecked={true}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Ticket Created</p>
                <p className="text-xs text-white/50">Email notification when new ticket is opened</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <input
                type="checkbox"
                defaultChecked={true}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Ticket Escalated</p>
                <p className="text-xs text-white/50">Alert managers when tickets are escalated</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <input
                type="checkbox"
                defaultChecked={false}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Booking Synced</p>
                <p className="text-xs text-white/50">Notify on successful PMS sync</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" className="border-white/20 bg-white/10 text-white">
            Reset to defaults
          </Button>
          <Button className="bg-blue-500 hover:bg-blue-400">
            <Save className="mr-2 h-4 w-4" /> Save changes
          </Button>
        </div>

        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-6">
          <p className="text-xs text-yellow-100/80">
            TODO: Implement PUT /api/admin/settings endpoint to persist configuration changes with validation and audit logging.
          </p>
        </div>
      </section>
    </div>
  )
}
