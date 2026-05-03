import { test, expect } from '@playwright/test'

/**
 * TASK 05 — Visual regression
 *
 * Challenge: the page fetches dynamic data on every load:
 *   - locker name, address, description, opening hours
 *   - locker image URL
 *   - compartment availability (S/M/L levels)
 *   - trustpilot_score and trustpilot_reviews (review count changes every load)
 *
 * Strategy:
 * 1. Intercept /api/locker and return a fixed, deterministic response.
 *    This eliminates all dynamic data before the page renders — no masking needed
 *    for the main card. We only need to mask the animated "ping" pulse dot
 *    (CSS animation) which would differ between screenshots.
 * 2. Use expect(element).toHaveScreenshot() for the stable locker card.
 * 3. For the trustpilot widget, mask the review count span as an alternative
 *    approach (shown in a separate test).
 */

const FIXED_LOCKER = {
  name: 'KRK001',
  locationName: 'Kraków — Galeria Krakowska',
  description: 'Located at the main entrance of Galeria Krakowska shopping centre.',
  address: {
    line1: 'ul. Pawia 5',
    line2: '31-154 Kraków',
  },
  openingHours: '24/7',
  status: 'OPEN',
  image_url: 'https://placehold.co/600x400/FFCC05/1d1d1d?text=InPost+Locker',
  locker_availability: {
    status: 'AVAILABLE',
    details: {
      S: 'NORMAL',
      M: 'LOW',
      L: 'FULL',
    },
  },
  trustpilot_reviews: 12345,
  trustpilot_score: 4.5,
}

test.describe('Visual regression — /challenges/visual', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept /api/locker to return fixed deterministic data
    await page.route('**/api/locker', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FIXED_LOCKER),
      })
    })
  })

  test('locker card matches screenshot', async ({ page }) => {
    await page.goto('/challenges/visual')
    await expect(page.locator('[data-testid="locker-card"]')).toBeVisible()

    // Mask the animated ping pulse dot — CSS animation makes pixels differ between runs
    await expect(page.locator('[data-testid="locker-card"]')).toHaveScreenshot(
      'locker-card.png',
      {
        mask: [
          // The animated pulse is a div with animate-ping class inside compartment-availability
          page.locator('[data-testid="compartment-availability"] .animate-ping'),
        ],
        maxDiffPixelRatio: 0.02,
      }
    )
  })

  test('trustpilot widget matches screenshot with masked review count', async ({ page }) => {
    await page.goto('/challenges/visual')
    await expect(page.locator('[data-testid="trustpilot-widget"]')).toBeVisible()

    // The review count is dynamic — mask it so the test is stable even without route mock
    await expect(page.locator('[data-testid="trustpilot-widget"]')).toHaveScreenshot(
      'trustpilot-widget.png',
      {
        mask: [page.locator('[data-testid="review-count"]')],
        maxDiffPixelRatio: 0.02,
      }
    )
  })

  test('full page matches screenshot with all dynamic regions masked', async ({ page }) => {
    await page.goto('/challenges/visual')
    await expect(page.locator('[data-testid="locker-card"]')).toBeVisible()

    await expect(page).toHaveScreenshot('visual-full-page.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="review-count"]'),
        page.locator('[data-testid="compartment-availability"] .animate-ping'),
      ],
      maxDiffPixelRatio: 0.02,
    })
  })
})
