import { test, expect, Page } from '@playwright/test'

// Helper function to login
async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
}

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    await login(page, 'staff@hotel.com', 'password')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should display error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('should show validation error for empty email', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Email is required')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    await login(page, 'staff@hotel.com', 'password')
    
    // Click logout button
    await page.click('button[aria-label="User menu"]')
    await page.click('text=Logout')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show magic link form', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Sign in with magic link')
    
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('text=Send magic link')).toBeVisible()
  })

  test('should send magic link email', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Sign in with magic link')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('text=Send magic link')
    
    // Should show confirmation message
    await expect(page.locator('text=Magic link sent')).toBeVisible()
  })
})

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should allow access to protected route when authenticated', async ({ page }) => {
    await login(page, 'staff@hotel.com', 'password')
    await page.goto('/dashboard')
    
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})

test.describe('Session Management', () => {
  test('should maintain session on page reload', async ({ page }) => {
    await login(page, 'staff@hotel.com', 'password')
    
    // Reload page
    await page.reload()
    
    // Should still be authenticated
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should clear session on logout', async ({ page, context }) => {
    await login(page, 'staff@hotel.com', 'password')
    
    // Get current cookies
    const cookiesBefore = await context.cookies()
    
    // Logout
    await page.click('button[aria-label="User menu"]')
    await page.click('text=Logout')
    
    // Session cookie should be cleared
    const cookiesAfter = await context.cookies()
    expect(cookiesAfter.length).toBeLessThan(cookiesBefore.length)
  })
})
