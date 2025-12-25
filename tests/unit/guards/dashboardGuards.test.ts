import { describe, it, expect } from 'vitest'
import {
  getDashboardType,
  DashboardType,
  isAdminRoute,
  isPMSRoute,
  assertAdminRoute,
  assertPMSRoute,
  getDashboardLabel
} from '@/lib/guards/dashboardGuards'

describe('Dashboard Route Guards', () => {
  describe('getDashboardType', () => {
    it('identifies admin dashboard routes', () => {
      expect(getDashboardType('/dashboard/admin')).toBe(DashboardType.ADMIN)
      expect(getDashboardType('/dashboard/admin/pms')).toBe(DashboardType.ADMIN)
      expect(getDashboardType('/dashboard/admin/hotel-qr')).toBe(DashboardType.ADMIN)
      expect(getDashboardType('/dashboard/admin/settings')).toBe(DashboardType.ADMIN)
    })

    it('identifies PMS dashboard routes', () => {
      expect(getDashboardType('/dashboard/hotel/bookings')).toBe(DashboardType.PMS)
      expect(getDashboardType('/dashboard/staff/tasks')).toBe(DashboardType.PMS)
      expect(getDashboardType('/dashboard/guest/profile')).toBe(DashboardType.PMS)
      expect(getDashboardType('/dashboard/analytics')).toBe(DashboardType.PMS)
    })

    it('defaults /dashboard root to PMS', () => {
      expect(getDashboardType('/dashboard')).toBe(DashboardType.PMS)
    })

    it('identifies unknown routes', () => {
      expect(getDashboardType('/login')).toBe(DashboardType.UNKNOWN)
      expect(getDashboardType('/pricing')).toBe(DashboardType.UNKNOWN)
      expect(getDashboardType('/')).toBe(DashboardType.UNKNOWN)
    })
  })

  describe('isAdminRoute / isPMSRoute', () => {
    it('correctly identifies admin routes', () => {
      expect(isAdminRoute('/dashboard/admin')).toBe(true)
      expect(isAdminRoute('/dashboard/admin/pms')).toBe(true)
      expect(isAdminRoute('/dashboard/hotel/bookings')).toBe(false)
    })

    it('correctly identifies PMS routes', () => {
      expect(isPMSRoute('/dashboard/hotel/bookings')).toBe(true)
      expect(isPMSRoute('/dashboard/staff/tasks')).toBe(true)
      expect(isPMSRoute('/dashboard/admin')).toBe(false)
    })
  })

  describe('assertAdminRoute', () => {
    it('passes for admin routes', () => {
      expect(() => {
        assertAdminRoute('/dashboard/admin', 'AdminHeader')
      }).not.toThrow()
    })

    it('throws for non-admin routes', () => {
      expect(() => {
        assertAdminRoute('/dashboard/hotel/bookings', 'AdminHeader')
      }).toThrow('AdminHeader can only be used in /dashboard/admin/** routes')
    })

    it('throws for PMS routes', () => {
      expect(() => {
        assertAdminRoute('/dashboard/staff/tasks', 'AdminHeader')
      }).toThrow()
    })
  })

  describe('assertPMSRoute', () => {
    it('passes for PMS routes', () => {
      expect(() => {
        assertPMSRoute('/dashboard/hotel/bookings', 'DashboardNavigation')
      }).not.toThrow()
    })

    it('throws for admin routes', () => {
      expect(() => {
        assertPMSRoute('/dashboard/admin', 'DashboardNavigation')
      }).toThrow('DashboardNavigation cannot be used in /dashboard/admin/** routes')
    })
  })

  describe('getDashboardLabel', () => {
    it('returns correct labels', () => {
      expect(getDashboardLabel('/dashboard/admin')).toBe('ADMIN DASHBOARD (SaaS Platform Level)')
      expect(getDashboardLabel('/dashboard/hotel/bookings')).toBe('PMS DASHBOARD (Hotel Operations Level)')
      expect(getDashboardLabel('/login')).toBe('UNKNOWN DASHBOARD')
    })
  })
})
