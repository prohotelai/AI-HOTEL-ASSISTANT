import { ReactNode } from 'react'
import DashboardNavigation from '@/components/pms/DashboardNavigation'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      {children}
    </div>
  )
}
