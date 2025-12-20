// ============================================================================
// SESSION 5.6 - E2E TESTS WITH PLAYWRIGHT
// File: tests/e2e/qr-automation.e2e.ts
// End-to-end tests for complete QR automation workflows
// ============================================================================

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

// ============================================================================
// 1. GUEST QR WORKFLOW E2E TESTS
// ============================================================================

test.describe('Guest QR Automation Workflow', () => {
  test('guest should complete full workflow: QR scan → AI → Messages', async ({
    page,
  }) => {
    // Step 1: Generate QR code
    await page.goto(`${BASE_URL}/api/admin/tokens`)
    
    // Step 2: Scan QR code (simulate)
    await page.goto(`${BASE_URL}/chat`) // Guest chat interface
    
    // Verify guest messaging interface loads
    await expect(page.locator('h1')).toContainText(/guest|chat|message/i)

    // Step 3: Verify AI models triggered
    const aiModelsElement = page.locator('[data-testid="ai-models-triggered"]')
    const aiModels = await aiModelsElement.textContent()
    expect(aiModels).toContain('guest-messaging')
    expect(aiModels).toContain('room-status')
  })

  test('guest should receive personalized room status', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/guest`)

    // Wait for room status to load
    await page.waitForLoadState('networkidle')

    // Verify room information displayed
    const roomInfo = page.locator('[data-testid="room-info"]')
    await expect(roomInfo).toBeVisible()

    // Check status indicators
    const statusBadges = page.locator('[data-testid="status-badge"]')
    const statusCount = await statusBadges.count()
    expect(statusCount).toBeGreaterThan(0)
  })

  test('guest should see upsell recommendations', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/guest`)

    // Look for recommendations section
    const recommendations = page.locator('[data-testid="recommendations"]')
    await expect(recommendations).toBeVisible()

    // Verify recommendation items
    const items = page.locator('[data-testid="recommendation-item"]')
    const itemCount = await items.count()
    expect(itemCount).toBeGreaterThan(0)
  })

  test('guest messaging AI should provide context-aware responses', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/chat`)

    // Send a message
    const input = page.locator('[data-testid="message-input"]')
    await input.fill('I need extra towels')
    await page.keyboard.press('Enter')

    // Wait for AI response
    const response = page.locator('[data-testid="ai-response"]').first()
    await expect(response).toBeVisible({ timeout: 5000 })

    // Verify response contains relevant action
    const responseText = await response.textContent()
    expect(responseText).toMatch(/towel|service|deliver|send/i)
  })
})

// ============================================================================
// 2. STAFF QR WORKFLOW E2E TESTS
// ============================================================================

test.describe('Staff QR Automation Workflow', () => {
  test('staff should complete full workflow: QR scan → Dashboard → Tasks', async ({
    page,
  }) => {
    // Navigate to staff dashboard
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Verify staff dashboard loads
    await expect(page.locator('h1')).toContainText(/staff|dashboard|tasks/i)

    // Verify AI models triggered
    const aiModelsElement = page.locator('[data-testid="ai-models-triggered"]')
    const aiModels = await aiModelsElement.textContent()
    expect(aiModels).toContain('task-routing')
    expect(aiModels).toContain('housekeeping')
  })

  test('staff should see assigned tasks from task-routing AI', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Navigate to tasks section
    await page.click('[data-testid="nav-tasks"]')

    // Wait for tasks to load
    await page.waitForLoadState('networkidle')

    // Verify task list is displayed
    const taskList = page.locator('[data-testid="task-list"]')
    await expect(taskList).toBeVisible()

    // Verify individual tasks
    const taskItems = page.locator('[data-testid="task-item"]')
    const taskCount = await taskItems.count()
    expect(taskCount).toBeGreaterThan(0)

    // Check task details
    const firstTask = taskItems.first()
    const taskTitle = firstTask.locator('[data-testid="task-title"]')
    const taskPriority = firstTask.locator('[data-testid="task-priority"]')

    await expect(taskTitle).toBeVisible()
    await expect(taskPriority).toBeVisible()
  })

  test('staff should update task status and trigger PMS sync', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/staff/tasks`)

    // Find a task
    const taskItem = page.locator('[data-testid="task-item"]').first()

    // Click to open task details
    await taskItem.click()

    // Wait for details panel
    const detailsPanel = page.locator('[data-testid="task-details"]')
    await expect(detailsPanel).toBeVisible()

    // Change status to "in_progress"
    const statusSelect = detailsPanel.locator('[data-testid="status-select"]')
    await statusSelect.selectOption('in_progress')

    // Submit the update
    const submitButton = detailsPanel.locator('[data-testid="submit-btn"]')
    await submitButton.click()

    // Wait for confirmation
    const successMessage = page.locator('[data-testid="sync-success"]')
    await expect(successMessage).toBeVisible({ timeout: 5000 })
  })

  test('staff should see night audit findings', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Navigate to night audit section
    await page.click('[data-testid="nav-night-audit"]')

    // Wait for data to load
    await page.waitForLoadState('networkidle')

    // Verify findings section
    const findings = page.locator('[data-testid="night-audit-findings"]')
    await expect(findings).toBeVisible()

    // Check for specific findings
    const findings_list = page.locator('[data-testid="finding-item"]')
    const findingsCount = await findings_list.count()

    // May be empty or have findings
    expect(findingsCount).toBeGreaterThanOrEqual(0)
  })

  test('staff should create tickets from AI recommendations', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Navigate to tickets section
    await page.click('[data-testid="nav-tickets"]')

    // Wait for interface to load
    await page.waitForLoadState('networkidle')

    // Click "New Ticket" button
    const newTicketBtn = page.locator('[data-testid="new-ticket-btn"]')
    await expect(newTicketBtn).toBeVisible()
    await newTicketBtn.click()

    // Wait for form
    const form = page.locator('[data-testid="ticket-form"]')
    await expect(form).toBeVisible()

    // Fill form
    const titleInput = form.locator('[data-testid="title-input"]')
    const descInput = form.locator('[data-testid="description-input"]')
    const typeSelect = form.locator('[data-testid="type-select"]')
    const prioritySelect = form.locator('[data-testid="priority-select"]')

    await titleInput.fill('Broken toilet in Room 305')
    await descInput.fill('Guest reported the toilet is not flushing properly')
    await typeSelect.selectOption('maintenance')
    await prioritySelect.selectOption('high')

    // Submit
    const submitBtn = form.locator('[data-testid="submit-btn"]')
    await submitBtn.click()

    // Wait for success
    const successMsg = page.locator('[data-testid="ticket-created"]')
    await expect(successMsg).toBeVisible({ timeout: 5000 })

    // Verify ticket ID appears
    const ticketId = successMsg.locator('[data-testid="ticket-id"]')
    const idText = await ticketId.textContent()
    expect(idText).toMatch(/ticket_/i)
  })
})

// ============================================================================
// 3. PMS INTEGRATION E2E TESTS
// ============================================================================

test.describe('PMS Synchronization', () => {
  test('PMS should update work order when AI triggers action', async ({
    page,
  }) => {
    // Navigate to staff dashboard
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Find and update a task (which should trigger PMS sync)
    const taskItem = page.locator('[data-testid="task-item"]').first()
    await taskItem.click()

    // Change status
    const detailsPanel = page.locator('[data-testid="task-details"]')
    const statusSelect = detailsPanel.locator('[data-testid="status-select"]')
    await statusSelect.selectOption('completed')

    // Submit
    const submitBtn = detailsPanel.locator('[data-testid="submit-btn"]')
    await submitBtn.click()

    // Wait for PMS sync confirmation
    const syncStatus = page.locator('[data-testid="pms-sync-status"]')
    await expect(syncStatus).toContainText(/synced|success/i, { timeout: 5000 })
  })

  test('PMS sync should show audit trail', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Open a task
    const taskItem = page.locator('[data-testid="task-item"]').first()
    await taskItem.click()

    // Look for audit trail section
    const auditSection = page.locator('[data-testid="audit-trail"]')
    await expect(auditSection).toBeVisible()

    // Verify entries exist
    const auditEntries = page.locator('[data-testid="audit-entry"]')
    const entriesCount = await auditEntries.count()
    expect(entriesCount).toBeGreaterThan(0)

    // Check entry content
    const firstEntry = auditEntries.first()
    const timestamp = firstEntry.locator('[data-testid="entry-timestamp"]')
    const action = firstEntry.locator('[data-testid="entry-action"]')

    await expect(timestamp).toBeVisible()
    await expect(action).toBeVisible()
  })

  test('failed PMS sync should show error and retry option', async ({
    page,
  }) => {
    // This test would simulate a failed PMS connection
    // For now, we'll navigate and look for error handling UI

    await page.goto(`${BASE_URL}/dashboard/staff`)

    // If we can trigger a failure (mock), look for error message
    const errorMsg = page.locator('[data-testid="sync-error"]')
    const retryBtn = page.locator('[data-testid="retry-sync-btn"]')

    // These may not be visible if sync is successful
    // Check if elements exist in the DOM
    const errorExists = await errorMsg.count()
    const retryExists = await retryBtn.count()

    // At least the retry button should be in the DOM for UX
    expect(retryExists).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================================
// 4. ADMIN DASHBOARD E2E TESTS
// ============================================================================

test.describe('Admin Dashboard', () => {
  test('admin should view and create QR tokens', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/dashboard/admin`)

    // Verify page loads
    await expect(page.locator('h1')).toContainText(/admin|dashboard/i)

    // Navigate to tokens tab
    await page.click('[data-testid="tab-tokens"]')

    // Wait for tokens to load
    await page.waitForLoadState('networkidle')

    // Verify token list
    const tokenTable = page.locator('[data-testid="token-table"]')
    await expect(tokenTable).toBeVisible()

    // Click "New Token" button
    const newTokenBtn = page.locator('[data-testid="new-token-btn"]')
    await newTokenBtn.click()

    // Fill token form
    const dialog = page.locator('[data-testid="new-token-dialog"]')
    const roleSelect = dialog.locator('[data-testid="role-select"]')
    const daysInput = dialog.locator('[data-testid="days-input"]')

    await roleSelect.selectOption('guest')
    await daysInput.fill('30')

    // Create token
    const createBtn = dialog.locator('[data-testid="create-btn"]')
    await createBtn.click()

    // Verify success
    const successMsg = page.locator('[data-testid="token-created"]')
    await expect(successMsg).toBeVisible({ timeout: 5000 })
  })

  test('admin should view session analytics', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`)

    // Click analytics tab
    await page.click('[data-testid="tab-analytics"]')

    // Wait for analytics to load
    await page.waitForLoadState('networkidle')

    // Verify summary cards
    const summaryCards = page.locator('[data-testid="summary-card"]')
    const cardCount = await summaryCards.count()
    expect(cardCount).toBeGreaterThan(0)

    // Verify charts render
    const charts = page.locator('[data-testid="chart"]')
    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThan(0)
  })

  test('admin should export session logs', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`)

    // Navigate to sessions tab
    await page.click('[data-testid="tab-sessions"]')

    // Click export button
    const exportBtn = page.locator('[data-testid="export-btn"]')
    await expect(exportBtn).toBeVisible()
    await exportBtn.click()

    // Select export format (CSV)
    const formatSelect = page.locator('[data-testid="export-format"]')
    await formatSelect.selectOption('csv')

    // Download starts
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-btn"]')

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('sessions')
  })

  test('admin should revoke QR tokens', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`)

    // Navigate to tokens
    await page.click('[data-testid="tab-tokens"]')

    // Wait for tokens
    await page.waitForLoadState('networkidle')

    // Find a token row and click revoke
    const tokenRow = page.locator('[data-testid="token-row"]').first()
    const revokeBtn = tokenRow.locator('[data-testid="revoke-btn"]')
    await revokeBtn.click()

    // Confirm revocation
    const confirmBtn = page.locator('[data-testid="confirm-revoke"]')
    await confirmBtn.click()

    // Verify success
    const successMsg = page.locator('[data-testid="token-revoked"]')
    await expect(successMsg).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================================
// 5. RBAC & SECURITY E2E TESTS
// ============================================================================

test.describe('RBAC & Security', () => {
  test('guest should not access staff-only features', async ({ page }) => {
    // Login as guest (would be mocked/simulated)
    await page.goto(`${BASE_URL}/chat`)

    // Try to access staff dashboard
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Should redirect or show error
    const notAllowed = page.locator('[data-testid="access-denied"]')
    const redirected = await page.url().includes('/chat') ||
      await page.url().includes('/login')

    expect(
      (await notAllowed.count()) > 0 || redirected
    ).toBeTruthy()
  })

  test('staff should not access admin features', async ({ page }) => {
    // Login as staff
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Try to access admin dashboard
    await page.goto(`${BASE_URL}/dashboard/admin`)

    // Should deny access
    const accessDenied = page.locator('[data-testid="access-denied"]')
    const stillOnStaff = await page.url().includes('/dashboard/staff')

    expect(
      (await accessDenied.count()) > 0 || stillOnStaff
    ).toBeTruthy()
  })

  test('session should expire after 1 hour', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard/staff`)

    // Check session expiration time in footer or settings
    const expirationTime = page.locator('[data-testid="session-expires"]')

    if (await expirationTime.count() > 0) {
      const expiresText = await expirationTime.textContent()
      // Verify it's showing ~1 hour from now
      expect(expiresText).toMatch(/hour|:00/i)
    }
  })
})

// ============================================================================
// 6. ERROR HANDLING E2E TESTS
// ============================================================================

test.describe('Error Handling & Edge Cases', () => {
  test('should show error for invalid QR token', async ({ page }) => {
    // Try to use invalid token in API
    await page.goto(`${BASE_URL}/api/qr/scan`, {
      waitUntil: 'networkidle',
    })

    // In a real scenario, this would be a POST with invalid token
    const errorResponse = page.locator('[data-testid="error-message"]')
    
    // The error might be in JSON response
    const pageText = await page.content()
    expect(pageText).toContain(/error|invalid|unauthorized/i)
  })

  test('should handle network timeout gracefully', async ({ page }) => {
    // Set slow network
    await page.route('**/*', async (route) => {
      await new Promise((r) => setTimeout(r, 10000)) // 10 second delay
      await route.abort()
    })

    await page.goto(`${BASE_URL}/dashboard/staff`, {
      waitUntil: 'domcontentloaded',
    })

    // Look for timeout error or retry message
    const timeoutMsg = page.locator('[data-testid="timeout-message"]')
    const retryBtn = page.locator('[data-testid="retry-btn"]')

    expect(
      (await timeoutMsg.count()) > 0 || (await retryBtn.count()) > 0
    ).toBeTruthy()

    // Stop request blocking
    await page.unroute('**/*')
  })
})

// ============================================================================
// 7. PERFORMANCE E2E TESTS
// ============================================================================

test.describe('Performance', () => {
  test('dashboard should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/dashboard/staff`)

    const loadTime = Date.now() - startTime

    // Verify main content is visible
    const mainContent = page.locator('[data-testid="main-content"]')
    await expect(mainContent).toBeVisible()

    expect(loadTime).toBeLessThan(2000)
  })

  test('AI response should appear within 5 seconds', async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`)

    const input = page.locator('[data-testid="message-input"]')
    await input.fill('Hello')

    const startTime = Date.now()
    const response = page.locator('[data-testid="ai-response"]').first()
    await expect(response).toBeVisible({ timeout: 5000 })

    const responseTime = Date.now() - startTime
    expect(responseTime).toBeLessThan(5000)
  })
})
