import { test, expect } from '@playwright/test'

/**
 * TASK 04 — Async wait
 *
 * The page has two async stages before tracking works:
 * 1. UI timer (3s): sets systemStatus → 'ready' (renders data-testid="system-ready")
 * 2. API call (/api/parcel-ready, ~5s): sets systemReadyRef.current = true
 *
 * Submitting between stage 1 and 2 shows an error ("still initialising") even though
 * the UI shows "System ready". We must wait for the API response, not just the UI label.
 *
 * Strategy:
 * - Wait for data-testid="system-ready" to appear (UI ready).
 * - Then also wait for the /api/parcel-ready response using waitForResponse.
 * - Only then submit the form.
 * - Wait for data-testid="tracking-result" — no hardcoded timeouts anywhere.
 */

test.describe('Async parcel tracking', () => {
  test('parcel tracking works correctly after system initialisation', async ({ page }) => {
    // Intercept the parcel-ready API response before navigating so we don't miss it
    const parcelReadyPromise = page.waitForResponse(
      res => res.url().includes('/api/parcel-ready') && res.status() === 200
    )

    await page.goto('/challenges/async')

    // Wait for the UI to show "System ready"
    await expect(page.locator('[data-testid="system-ready"]')).toBeVisible()

    // Wait for the actual API signal (systemReadyRef.current = true)
    await parcelReadyPromise

    // Now fill and submit the form
    await page.fill('#parcel-number', 'PL123456789PL')
    await page.getByRole('button', { name: /track parcel/i }).click()

    // Wait for tracking result — no hardcoded timeout; uses default Playwright timeout
    await expect(page.locator('[data-testid="tracking-result"]')).toBeVisible()
  })

  test('should show error when form is submitted before system is ready', async ({ page }) => {
    await page.goto('/challenges/async')

    // Do NOT wait for system-ready — submit immediately
    await page.fill('#parcel-number', 'PL123456789PL')
    await page.getByRole('button', { name: /track parcel/i }).click()

    // Should show initialisation error (systemReadyRef.current is still false)
    await expect(
      page.getByText(/still initialising/i)
    ).toBeVisible()
  })

  test('should show error when parcel number is empty', async ({ page }) => {
    const parcelReadyPromise = page.waitForResponse(
      res => res.url().includes('/api/parcel-ready') && res.status() === 200
    )

    await page.goto('/challenges/async')
    await expect(page.locator('[data-testid="system-ready"]')).toBeVisible()
    await parcelReadyPromise

    // Submit with empty parcel number
    await page.getByRole('button', { name: /track parcel/i }).click()

    // API returns 400 for empty parcel number → error state shown
    await expect(page.locator('text=/parcel number is required/i')).toBeVisible({ timeout: 10000 })
  })

  test('tracking result contains expected fields', async ({ page }) => {
    const parcelReadyPromise = page.waitForResponse(
      res => res.url().includes('/api/parcel-ready') && res.status() === 200
    )

    await page.goto('/challenges/async')
    await expect(page.locator('[data-testid="system-ready"]')).toBeVisible()
    await parcelReadyPromise

    await page.fill('#parcel-number', 'PL987654321PL')
    await page.getByRole('button', { name: /track parcel/i }).click()

    const result = page.locator('[data-testid="tracking-result"]')
    await expect(result).toBeVisible()

    // Result card should contain at minimum: parcel number, status, location, est. delivery
    await expect(result.getByText('Parcel number')).toBeVisible()
    await expect(result.getByText('Status')).toBeVisible()
    await expect(result.getByText('Location')).toBeVisible()
    await expect(result.getByText('Est. delivery')).toBeVisible()
  })
})
