import './styles.css'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { LogOut, Menu, Moon, ShieldCheck, Sun, UserCircle2 } from 'lucide-react'
import { ReactNode } from 'react'
import { authOptions } from '@/lib/auth'
import { assertPermission, hasPermission, Permission } from '@/lib/rbac'
import { Button } from '@/components/ui/button'

const PRIMARY_NAVIGATION = [
  { href: '/dashboard/admin', label: 'Overview', permission: Permission.ADMIN_VIEW },
  { href: '/dashboard/admin/tenants', label: 'Tenants', permission: Permission.ADMIN_VIEW },
  { href: '/dashboard/admin/staff', label: 'Staff', permission: Permission.ADMIN_VIEW },
  { href: '/dashboard/admin/bookings', label: 'Bookings', permission: Permission.ADMIN_VIEW },
  { href: '/dashboard/admin/tickets', label: 'Tickets', permission: Permission.ADMIN_VIEW },
  { href: '/dashboard/admin/knowledge-base', label: 'Knowledge Base', permission: Permission.KNOWLEDGE_BASE_VIEW },
  { href: '/dashboard/admin/pms', label: 'PMS Integration', permission: Permission.ADMIN_VIEW },
  { href: '/dashboard/admin/affiliates', label: 'Affiliates', permission: Permission.ADMIN_VIEW },
  { href: '/dashboard/admin/audit-log', label: 'Audit Log', permission: Permission.ADMIN_MANAGE },
  { href: '/dashboard/admin/feature-toggles', label: 'Feature Toggles', permission: Permission.ADMIN_MANAGE },
  { href: '/dashboard/admin/settings', label: 'Settings', permission: Permission.ADMIN_VIEW },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin')
  }

  const context = assertPermission(session, Permission.ADMIN_VIEW)
  const role = session.user.role?.toLowerCase() ?? 'staff'
  const isSuperadmin = role === 'superadmin'

  const navigation = PRIMARY_NAVIGATION.filter((item) =>
    item.permission === Permission.ADMIN_VIEW
      ? true
      : hasPermission(role, item.permission) || isSuperadmin
  )

  const displayName = session.user.name ?? session.user.email ?? 'Administrator'

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-50">
        <AdminShell
          navigation={navigation}
          displayName={displayName}
          role={role}
          isSuperadmin={isSuperadmin}
          hotelId={context.hotelId}
        >
          {children}
        </AdminShell>
      </body>
    </html>
  )
}

type AdminShellProps = {
  navigation: { href: string; label: string }[]
  displayName: string
  role: string
  isSuperadmin: boolean
  hotelId: string
  children: ReactNode
}

function AdminShell({ navigation, displayName, role, isSuperadmin, hotelId, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <input type="checkbox" id="admin-nav-toggle" className="peer hidden" />
      <aside className="fixed inset-y-0 left-0 z-40 w-72 -translate-x-full border-r border-white/10 bg-black/60 backdrop-blur transition-transform peer-checked:translate-x-0 md:static md:translate-x-0" aria-label="Admin navigation">
        <div className="flex h-full flex-col gap-8 px-6 py-8">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/admin" className="text-lg font-semibold tracking-wide text-white">
              AI Hotel Admin
            </Link>
            <label htmlFor="admin-nav-toggle" className="cursor-pointer text-white/60 md:hidden" aria-label="Close navigation">
              ✕
            </label>
          </div>

          <nav className="flex-1 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
            <p className="flex items-center gap-2 text-sm text-white">
              <UserCircle2 className="h-5 w-5 text-blue-300" /> {displayName}
            </p>
            <p className="uppercase tracking-wide">Role: {role}</p>
            {isSuperadmin ? (
              <p className="inline-flex items-center gap-2 text-blue-200">
                <ShieldCheck className="h-4 w-4" /> Superadmin
              </p>
            ) : (
              <p className="text-white/50">Tenant scope: {hotelId.slice(0, 8)}</p>
            )}
            <Link href="/api/auth/signout" className="inline-flex items-center gap-2 text-red-300 hover:text-red-200">
              <LogOut className="h-4 w-4" /> Sign out
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-72">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <label htmlFor="admin-nav-toggle" className="cursor-pointer text-white/80 md:hidden">
                <Menu className="h-6 w-6" />
              </label>
              <div className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-blue-300/80">
                Control Center
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button variant="ghost" className="text-white/70" aria-label="Toggle light theme">
                <Sun className="h-4 w-4" />
              </Button>
              <Button variant="ghost" className="text-white/70" aria-label="Toggle dark theme">
                <Moon className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white/80">
                EN / AR
              </Button>
            </div>
          </div>
        </header>
        <section className="pb-16 pt-8 md:px-2">
          <div className="px-4 md:px-8">
            {children}
          </div>
        </section>
      </main>
    </div>
  )
}
