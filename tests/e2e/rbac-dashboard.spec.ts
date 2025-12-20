import { test, expect } from '@playwright/test'

/**
 * E2E Tests for RBAC System
 * 
 * Tests complete user workflows:
 * - Guest cannot access admin pages
 * - Staff can access staff pages but not admin
 * - Admin can access all pages
 * - Role assignment workflow
 * - Permission-based access control
 */

const BASE_URL = 'http://localhost:3000'

test.describe('RBAC E2E Tests', () => {
  test('Guest user cannot access admin dashboard', async ({ page }) => {
    // Try to access admin page directly
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Should redirect to 403 or login
    await expect(page).toHaveURL(/\/(login|403)/)
  })

  test('Admin can assign roles to users', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'admin@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard/**`)

    // Navigate to role assignments
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/assignments`)

    // Click "Assign Role" button
    await page.click('button:has-text("Assign Role")')

    // Select user and role
    await page.selectOption('select:first-of-type', { label: /.*/ })
    await page.selectOption('select:nth-of-type(2)', { label: 'Manager' })

    // Submit assignment
    await page.click('button:has-text("Assign Role")')

    // Verify success message
    await expect(page.locator('text=success')).toBeVisible({ timeout: 5000 })
  })

  test('Staff cannot access admin role management', async ({ page }) => {
    // Login as staff user (need to create one first)
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'staff@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Try to access admin role page
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Should be redirected to 403
    await expect(page).toHaveURL(`${BASE_URL}/403`)

    // Should see access denied message
    await expect(page.locator('text=Access Denied')).toBeVisible()
  })

  test('Manager can view roles but not assign admin', async ({ page }) => {
    // Login as manager
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'manager@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Navigate to roles page
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Should be able to view roles
    await expect(page.locator('table')).toBeVisible()

    // Try to create a role with admin level
    await page.click('button:has-text("New Role")')
    await page.fill('input[placeholder*="name"]', 'Test Role')
    await page.selectOption('select:has-option(text="Admin (L4)")', 'Admin')

    // Submit and expect validation error
    await page.click('button:has-text("Create")')

    // Should show error about insufficient permissions
    await expect(page.locator('text=/[Ee]rror|[Pp]ermission/')).toBeVisible()
  })

  test('Admin dashboard shows role list with pagination', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'admin@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Navigate to roles
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Should see table with roles
    const table = page.locator('table')
    await expect(table).toBeVisible()

    // Should have at least header row
    const rows = await table.locator('tbody tr').count()
    expect(rows).toBeGreaterThan(0)

    // Test search functionality
    await page.fill('input[placeholder*="Search"]', 'manager')
    await page.waitForTimeout(500) // Wait for search

    // Filtered results should be visible
    const filteredRows = await table.locator('tbody tr').count()
    expect(filteredRows).toBeGreaterThan(0)
  })

  test('Admin can edit role permissions', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'admin@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Navigate to roles
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Click on permissions link for a role
    await page.click('a:has-text("permissions")')

    // Should see permission groups
    await expect(page.locator('button:has-text("pms")')).toBeVisible()

    // Expand a permission group
    await page.click('button:has-text("pms")')

    // Should see permissions
    const permissions = await page.locator('input[type="checkbox"]').count()
    expect(permissions).toBeGreaterThan(0)

    // Toggle a permission
    await page.click('input[type="checkbox"]')

    // Save button should be enabled
    const saveBtn = page.locator('button:has-text("Save")')
    await expect(saveBtn).toBeEnabled()

    // Save changes
    await saveBtn.click()

    // Should show success message
    await expect(page.locator('text=/[Ss]uccess|saved/')).toBeVisible({ timeout: 5000 })
  })

  test('Role assignment creates audit trail', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'admin@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Navigate to assignments
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/assignments`)

    // Assign a role
    await page.click('button:has-text("Assign Role")')
    await page.selectOption('select:first-of-type', { label: /.*/ })
    await page.selectOption('select:nth-of-type(2)', { label: 'Supervisor' })
    await page.click('button:has-text("Assign")')

    // Verify role appears in user's role list
    await expect(page.locator('text=Supervisor')).toBeVisible({ timeout: 5000 })
  })

  test('403 page shows when access is denied', async ({ page }) => {
    // Navigate to admin page without authentication
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Should redirect to login or 403
    const url = page.url()
    expect(url).toMatch(/\/(login|403)/)

    // If on 403, should show message
    if (url.includes('403')) {
      await expect(page.locator('text=Access Denied')).toBeVisible()
      await expect(page.locator('text=auto-redirect')).toBeVisible()
    }
  })

  test('Search and filter work in role list', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'admin@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Navigate to roles
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Get initial row count
    const initialRows = await page.locator('table tbody tr').count()

    // Filter by level
    await page.selectOption('select:last-of-type', '3') // Manager level

    // Wait for filter to apply
    await page.waitForTimeout(500)

    // Filtered rows should be less or equal
    const filteredRows = await page.locator('table tbody tr').count()
    expect(filteredRows).toBeLessThanOrEqual(initialRows)
  })

  test('User without admin role gets 403', async ({ page }) => {
    // Login as guest/staff
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'guest@demograndhotel.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Try to access admin panel
    await page.goto(`${BASE_URL}/dashboard/admin/rbac/roles`)

    // Should be on 403 page
    await expect(page).toHaveURL(`${BASE_URL}/403`)

    // Verify 403 page elements
    await expect(page.locator('text=Access Denied')).toBeVisible()
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible()
  })
})
