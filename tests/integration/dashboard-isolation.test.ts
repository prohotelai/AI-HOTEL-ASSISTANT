import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Dashboard Isolation Integration Tests
 * 
 * PURPOSE:
 * Verify that Admin and PMS dashboards are fully isolated:
 * - Separate layouts
 * - Separate headers
 * - Separate contexts
 * - No cross-dashboard component usage
 * - Correct QR visibility
 */

describe('Dashboard Isolation - Admin vs PMS', () => {
  describe('Layout Isolation', () => {
    it('Admin layout exists and is separate from PMS layout', async () => {
      // Verify Admin layout file exists
      const adminLayoutPath = '/workspaces/AI-HOTEL-ASSISTANT/app/dashboard/admin/layout.tsx'
      const pmsLayoutPath = '/workspaces/AI-HOTEL-ASSISTANT/app/dashboard/layout.tsx'
      
      const fs = await import('fs')
      expect(fs.existsSync(adminLayoutPath)).toBe(true)
      expect(fs.existsSync(pmsLayoutPath)).toBe(true)
    })

    it('Admin layout uses AdminProvider and AdminHeader', async () => {
      const fs = await import('fs')
      const adminLayout = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/app/dashboard/admin/layout.tsx', 'utf-8')
      
      expect(adminLayout).toContain('AdminProvider')
      expect(adminLayout).toContain('AdminHeader')
      // Check that it doesn't import DashboardNavigation (not just mention it in comments)
      expect(adminLayout).not.toMatch(/from.*DashboardNavigation/)
      // Check that it doesn't import PMSProvider (not just mention it in comments)
      expect(adminLayout).not.toMatch(/from.*PMSContext/)
    })

    it('PMS layout uses PMSProvider and DashboardNavigation', async () => {
      const fs = await import('fs')
      const pmsLayout = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/app/dashboard/layout.tsx', 'utf-8')
      
      expect(pmsLayout).toContain('PMSProvider')
      expect(pmsLayout).toContain('DashboardNavigation')
      expect(pmsLayout).not.toContain('AdminHeader')
      expect(pmsLayout).not.toContain('AdminProvider')
    })
  })

  describe('Header Component Isolation', () => {
    it('AdminHeader has route guard against PMS usage', async () => {
      const fs = await import('fs')
      const adminHeader = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/components/admin/AdminHeader.tsx', 'utf-8')
      
      expect(adminHeader).toContain('useAdminContext')
      expect(adminHeader).toContain('/dashboard/admin')
      expect(adminHeader).toContain('ACTIVE DASHBOARD: ADMIN')
      expect(adminHeader).not.toContain('usePMSContext')
      expect(adminHeader).not.toContain('useHotelContext')
    })

    it('DashboardNavigation has route guard against Admin usage', async () => {
      const fs = await import('fs')
      const pmsNav = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/components/pms/DashboardNavigation.tsx', 'utf-8')
      
      expect(pmsNav).toContain('ACTIVE DASHBOARD: PMS')
      expect(pmsNav).toContain('/dashboard/admin')
      expect(pmsNav).toContain('cannot be used in /admin routes')
      expect(pmsNav).not.toContain('useAdminContext')
    })
  })

  describe('Context Provider Isolation', () => {
    it('AdminContext has route guard', async () => {
      const fs = await import('fs')
      const adminContext = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/lib/contexts/AdminContext.tsx', 'utf-8')
      
      expect(adminContext).toContain('useAdminContext')
      expect(adminContext).toContain('/dashboard/admin')
      expect(adminContext).toContain('can only be used in /admin routes')
      expect(adminContext).not.toContain('usePMSContext')
    })

    it('PMSContext has route guard', async () => {
      const fs = await import('fs')
      const pmsContext = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/lib/contexts/PMSContext.tsx', 'utf-8')
      
      expect(pmsContext).toContain('usePMSContext')
      expect(pmsContext).toContain('/dashboard/admin')
      expect(pmsContext).toContain('cannot be used in /admin routes')
      // Check that it doesn't import useAdminContext (not just mention it in error messages)
      expect(pmsContext).not.toMatch(/from.*AdminContext/)
    })
  })

  describe('QR Code Isolation', () => {
    it('Admin QR page uses AdminContext', async () => {
      const fs = await import('fs')
      const adminQR = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/app/dashboard/admin/hotel-qr/page.tsx', 'utf-8')
      
      expect(adminQR).toContain('useAdminContext')
      expect(adminQR).toContain('Read-Only')
      expect(adminQR).toContain('/api/qr/')
      expect(adminQR).not.toContain('usePMSContext')
      expect(adminQR).not.toContain('useHotelContext')
    })

    it('Admin QR page displays read-only warning', async () => {
      const fs = await import('fs')
      const adminQR = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/app/dashboard/admin/hotel-qr/page.tsx', 'utf-8')
      
      expect(adminQR).toContain('cannot be regenerated')
      expect(adminQR).toContain('Read-Only')
      expect(adminQR).toContain('Admin Dashboard')
    })
  })

  describe('Backward Compatibility', () => {
    it('hotelQrService has deprecation warnings', async () => {
      const fs = await import('fs')
      const qrService = fs.readFileSync('/workspaces/AI-HOTEL-ASSISTANT/lib/services/hotelQrService.ts', 'utf-8')
      
      expect(qrService).toContain('BACKWARD COMPATIBILITY')
      expect(qrService).toContain('permanent')
      expect(qrService).toContain('Deprecation')
    })
  })
})

describe('Dashboard Isolation - Route Guards', () => {
  it('Route guards utility exists', async () => {
    const fs = await import('fs')
    expect(fs.existsSync('/workspaces/AI-HOTEL-ASSISTANT/lib/guards/dashboardGuards.ts')).toBe(true)
  })

  it('Route guards define DashboardType enum', async () => {
    const { DashboardType } = await import('@/lib/guards/dashboardGuards')
    expect(DashboardType.ADMIN).toBe('ADMIN')
    expect(DashboardType.PMS).toBe('PMS')
  })

  it('Route guards export assertion functions', async () => {
    const guards = await import('@/lib/guards/dashboardGuards')
    expect(typeof guards.assertAdminRoute).toBe('function')
    expect(typeof guards.assertPMSRoute).toBe('function')
    expect(typeof guards.isAdminRoute).toBe('function')
    expect(typeof guards.isPMSRoute).toBe('function')
  })
})
