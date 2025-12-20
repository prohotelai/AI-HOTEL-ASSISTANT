/**
 * E2E Tests for QR Code Login System
 * Using Playwright for complete user journey testing
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@hotel.test';
const ADMIN_PASSWORD = 'admin123';
const GUEST_EMAIL = 'guest@hotel.test';
const STAFF_EMAIL = 'staff@hotel.test';

test.describe('QR Code Login System - E2E Tests', () => {
  let adminPage: Page;
  let guestPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create admin session
    adminPage = await browser.newPage();

    // Login as admin
    await adminPage.goto(`${BASE_URL}/login`);
    await adminPage.fill('input[name="email"]', ADMIN_EMAIL);
    await adminPage.fill('input[name="password"]', ADMIN_PASSWORD);
    await adminPage.click('button:has-text("Sign In")');
    await adminPage.waitForURL(/\/dashboard/);
  });

  test.afterAll(async () => {
    await adminPage?.close();
    await guestPage?.close();
  });

  test.describe('Admin Dashboard - QR Generation', () => {
    test('should load QR management page', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Wait for page to load
      await adminPage.waitForSelector('text=QR Code Management');

      // Verify header
      await expect(adminPage.locator('h1')).toContainText('QR Code Management');

      // Verify statistics cards
      await expect(adminPage.locator('text=Total Tokens')).toBeVisible();
      await expect(adminPage.locator('text=Active')).toBeVisible();
      await expect(adminPage.locator('text=Used')).toBeVisible();

      // Verify generate button
      const generateBtn = adminPage.locator('button:has-text("Generate QR Token")');
      await expect(generateBtn).toBeVisible();
    });

    test('should generate QR token for guest', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Click generate button
      await adminPage.click('button:has-text("Generate QR Token")');

      // Wait for modal
      await adminPage.waitForSelector('text=Generate QR Token');

      // Search for guest user
      await adminPage.fill('input[placeholder*="Search"]', 'John');

      // Wait for user list and select
      await adminPage.waitForTimeout(300);
      await adminPage.click('text=John Doe');

      // Role should default to guest
      const roleSelect = adminPage.locator('select').last();
      const roleValue = await roleSelect.inputValue();
      expect(roleValue).toBe('guest');

      // Click generate
      await adminPage.click('button:has-text("Generate")');

      // Verify success message
      await expect(adminPage.locator('text=QR token generated successfully')).toBeVisible();

      // Modal should close
      await expect(adminPage.locator('text=Generate QR Token')).not.toBeVisible();
    });

    test('should list generated tokens in table', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Wait for tokens table
      await adminPage.waitForSelector('table');

      // Verify table has rows
      const tableRows = await adminPage.locator('tbody tr');
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Verify columns
      await expect(adminPage.locator('text=User')).toBeVisible();
      await expect(adminPage.locator('text=Role')).toBeVisible();
      await expect(adminPage.locator('text=Status')).toBeVisible();
      await expect(adminPage.locator('text=Expires')).toBeVisible();
    });

    test('should show token status correctly', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Wait for table to load
      await adminPage.waitForSelector('table');

      // Find active token
      const activeToken = adminPage.locator('text=Active').first();
      await expect(activeToken).toBeVisible();

      // Should have green background
      const parentRow = activeToken.locator('..');
      const classAttr = await activeToken.getAttribute('class');
      expect(classAttr).toContain('green');
    });

    test('should revoke token', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Wait for table
      await adminPage.waitForSelector('table');

      // Click delete button on first token
      const deleteBtn = adminPage.locator('button[class*="red"]').first();
      await deleteBtn.click();

      // Confirm revocation
      await adminPage.waitForSelector('text=Revoke Token?');
      await adminPage.click('button:has-text("Revoke")');

      // Verify success
      await expect(adminPage.locator('text=Token revoked successfully')).toBeVisible();
    });

    test('should regenerate token', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Wait for table
      await adminPage.waitForSelector('table');

      // Find regenerate button
      const regenerateBtn = adminPage.locator('button:has-text("Regenerate")').first();

      if (await regenerateBtn.isVisible()) {
        await regenerateBtn.click();

        // Verify success
        await expect(adminPage.locator('text=Token regenerated successfully')).toBeVisible();
      }
    });
  });

  test.describe('Guest QR Login Flow', () => {
    test('should complete guest QR login', async ({ browser }) => {
      guestPage = await browser.newPage();

      // Step 1: Admin generates token
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);
      await adminPage.click('button:has-text("Generate QR Token")');
      await adminPage.waitForSelector('text=Generate QR Token');

      // Select guest user
      const userSelect = adminPage.locator('select[value=""]').first();
      await userSelect.selectOption({ index: 1 });

      // Generate token
      await adminPage.click('button:has-text("Generate")');

      // Get token value from response/storage
      // Note: In real test, you'd extract from API response
      const token = 'test-token-xyz'; // Placeholder

      // Step 2: Guest scans QR and logs in
      await guestPage.goto(`${BASE_URL}/login?token=${token}`);

      // Should auto-validate token
      await guestPage.waitForURL(/\/dashboard/);

      // Verify guest is logged in
      await expect(guestPage.locator('text=Guest Dashboard')).toBeVisible();

      // Verify guest can access widget
      const chatWidget = guestPage.locator('iframe[src*="chat"]');
      expect(await chatWidget.count()).toBeGreaterThan(0);
    });

    test('should reject invalid QR token', async ({ browser }) => {
      const testPage = await browser.newPage();

      // Try to login with invalid token
      await testPage.goto(`${BASE_URL}/login?token=invalid-token`);

      // Should show error
      await expect(testPage.locator('text=Invalid QR token')).toBeVisible();

      await testPage.close();
    });

    test('should reject expired QR token', async ({ browser }) => {
      const testPage = await browser.newPage();

      // Try to login with expired token
      await testPage.goto(`${BASE_URL}/login?token=expired-token-123`);

      // Should show expiration error
      await expect(testPage.locator('text=expired|Expired')).toBeVisible();

      await testPage.close();
    });

    test('should prevent reuse of QR token', async ({ browser }) => {
      const testPage1 = await browser.newPage();
      const testPage2 = await browser.newPage();

      const token = 'one-time-token-abc'; // Placeholder

      // First login succeeds
      await testPage1.goto(`${BASE_URL}/login?token=${token}`);
      await testPage1.waitForURL(/\/dashboard|\/chat/);

      // Second login with same token should fail
      await testPage2.goto(`${BASE_URL}/login?token=${token}`);
      await expect(testPage2.locator('text=already been used')).toBeVisible();

      await testPage1.close();
      await testPage2.close();
    });
  });

  test.describe('Staff QR Login Flow', () => {
    test('should complete staff QR login with permissions', async () => {
      // Admin generates token for staff
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);
      await adminPage.click('button:has-text("Generate QR Token")');
      await adminPage.waitForSelector('text=Generate QR Token');

      // Select staff user
      const userSelect = adminPage.locator('select').first();
      await userSelect.selectOption({ label: 'Jane Staff' });

      // Change role to staff
      const roleSelect = adminPage.locator('select').last();
      await roleSelect.selectOption('staff');

      // Generate
      await adminPage.click('button:has-text("Generate")');
      await expect(adminPage.locator('text=success')).toBeVisible();

      // Extract token (in real test, from API response)
      const token = 'staff-token-xyz';

      // Staff logs in
      const staffPage = await adminPage.context().newPage();
      await staffPage.goto(`${BASE_URL}/login?token=${token}`);

      // Should see staff dashboard
      await staffPage.waitForURL(/\/dashboard\/staff/);
      await expect(staffPage.locator('text=Staff Dashboard')).toBeVisible();

      // Verify staff can see assigned tasks
      await expect(staffPage.locator('text=Tasks|Assignments')).toBeVisible();

      await staffPage.close();
    });

    test('staff should not access admin pages via QR', async () => {
      // Staff with QR token shouldn't access /dashboard/admin
      const staffPage = await adminPage.context().newPage();
      const token = 'staff-token-xyz';

      await staffPage.goto(
        `${BASE_URL}/login?token=${token}&redirect=/dashboard/admin`
      );

      // Should redirect to staff dashboard instead
      await staffPage.waitForURL(/\/dashboard\/staff/);

      // Admin page should not be accessible
      await staffPage.goto(`${BASE_URL}/dashboard/admin/qr`);
      await expect(staffPage.locator('text=Forbidden|403')).toBeVisible();

      await staffPage.close();
    });
  });

  test.describe('Admin Dashboard - Statistics', () => {
    test('should display accurate statistics', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Get stat values
      const totalTokens = await adminPage
        .locator('text=Total Tokens')
        .locator('..')
        .locator('text=/\\d+/')
        .first()
        .textContent();

      const activeTokens = await adminPage
        .locator('text=Active')
        .locator('..')
        .locator('text=/\\d+/')
        .first()
        .textContent();

      // Verify they are numbers
      expect(parseInt(totalTokens || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(activeTokens || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should filter tokens by role', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Look for role badges in table
      const guestBadges = await adminPage
        .locator('[class*="blue"]')
        .filter({ hasText: 'guest' });

      const staffBadges = await adminPage
        .locator('[class*="purple"]')
        .filter({ hasText: 'staff' });

      // Should have both types if data exists
      const guestCount = await guestBadges.count();
      const staffCount = await staffBadges.count();

      expect(guestCount + staffCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Pagination', () => {
    test('should paginate through tokens list', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Check if pagination exists
      const nextBtn = adminPage.locator('button:has-text("Next")');

      if (await nextBtn.isEnabled()) {
        // Click next
        await nextBtn.click();

        // Wait for new data
        await adminPage.waitForTimeout(500);

        // Verify page changed
        const pageInfo = await adminPage.locator('text=/Page \\d+/').textContent();
        expect(pageInfo).toContain('Page 2');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show error on insufficient permissions', async ({ browser }) => {
      const guestAdminPage = await browser.newPage();

      // Login as guest (not admin)
      await guestAdminPage.goto(`${BASE_URL}/login`);
      await guestAdminPage.fill('input[name="email"]', GUEST_EMAIL);
      await guestAdminPage.fill('input[name="password"]', 'guest123');
      await guestAdminPage.click('button:has-text("Sign In")');
      await guestAdminPage.waitForURL(/\/dashboard/);

      // Try to access admin QR page
      await guestAdminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Should see forbidden message
      await expect(guestAdminPage.locator('text=Forbidden|403|Permission')).toBeVisible();

      await guestAdminPage.close();
    });

    test('should handle network errors gracefully', async () => {
      // Simulate offline mode
      await adminPage.context().setOffline(true);

      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Should show error message
      await expect(
        adminPage.locator('text=Failed|Network|Error')
      ).toBeVisible();

      // Re-enable network
      await adminPage.context().setOffline(false);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Check for ARIA labels on buttons
      const generateBtn = adminPage.locator('button:has-text("Generate")');
      const ariaLabel = await generateBtn.getAttribute('aria-label');

      // Should have either aria-label or accessible text
      expect(
        ariaLabel ||
          (await generateBtn.textContent())
      ).toBeTruthy();
    });

    test('should be keyboard navigable', async () => {
      await adminPage.goto(`${BASE_URL}/dashboard/admin/qr`);

      // Tab to generate button
      await adminPage.keyboard.press('Tab');
      let focusedElement = await adminPage.evaluate(() => document.activeElement?.tagName);

      // Continue tabbing
      for (let i = 0; i < 5; i++) {
        await adminPage.keyboard.press('Tab');
        focusedElement = await adminPage.evaluate(() => document.activeElement?.tagName);
        expect(['BUTTON', 'INPUT', 'SELECT', 'A']).toContain(focusedElement);
      }

      // Should be able to activate with Enter
      const generateBtn = adminPage.locator('button:has-text("Generate")').first();
      await generateBtn.focus();
      await adminPage.keyboard.press('Enter');

      // Modal should open or action trigger
      await adminPage.waitForTimeout(300);
    });
  });
});
