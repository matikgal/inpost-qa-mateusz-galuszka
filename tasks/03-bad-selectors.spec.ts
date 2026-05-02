import { test, expect } from '@playwright/test'

/**
 * TASK 03 — Fix the broken tests
 *
 * Bugs fixed:
 *
 * Test 1: "section:nth-child(1) h1:nth-child(2)"
 *   Bug: The hero section has no <h1> — the heading is an <img> SVG asset.
 *   There is no h1 in the first section, so the locator matches nothing.
 *   Fix: Use getByRole('heading') or locate the actual visible heading text.
 *   Actually looking at the homepage source: the hero has an <img> with alt "Your door to more"
 *   and a <p> subtitle. There is no h1 element in the page at all.
 *   The test intent seems to be checking that the hero section is visible.
 *   Fix: target the img or the subtitle paragraph that IS in the first section.
 *
 * Test 2: waitForTimeout(3000) is a hardcoded delay — brittle and slow.
 *   Fix: replace with waitForSelector / expect(...).toBeVisible() which waits automatically.
 *
 * Test 3: GET /api/parcels/abc-1234 — parcel "abc-1234" doesn't exist in the in-memory store.
 *   Bug: Test assumes the parcel exists, but the store is empty (or doesn't have that ID).
 *   Fix: First create a parcel, then GET it by its actual ID.
 *
 * Test 4: toHaveText("system ready") — text in the DOM is "System ready" (capital S).
 *   Bug: Text comparison is case-sensitive. "system ready" ≠ "System ready".
 *   Fix: expect(...).toHaveText("System ready") or use { ignoreCase: true }.
 *
 * Test 5: data-testid="user-email" does not exist in profile/page.tsx.
 *   Bug: The profile page renders email in a plain <p> with no data-testid.
 *   Fix: locate the email text using getByText() or a role-based selector.
 *
 * Test 6 (bonus): No changes needed — test has no assertion intentionally,
 *   but remove the hardcoded implicit wait by letting Playwright handle loading.
 */

const TOKEN = 'test-token-inpost-2026'

// --- Test 1 ---
test('home page shows the correct hero heading', async ({ page }) => {
  await page.goto('/')
  // The hero contains an SVG image (not an h1). The visible identifier is the img with alt text.
  const heroImage = page.getByRole('img', { name: 'Your door to more' })
  await expect(heroImage).toBeVisible()
})

// --- Test 2 ---
test('newsletter success message appears after submit', async ({ page }) => {
  await page.goto('/')
  await page.fill('[data-testid="newsletter-input"]', 'test@example.com')
  await page.click('[data-testid="newsletter-submit"]')
  // Removed waitForTimeout(3000) — use proper async waiting instead
  await expect(page.locator('[data-testid="newsletter-success"]')).toBeVisible()
})

// --- Test 3 ---
test('GET /api/parcels/:id returns the created parcel', async ({ request }) => {
  // Bug: "abc-1234" doesn't exist. Create a real parcel first, then GET it.
  const createRes = await request.post('/api/parcels', {
    headers: { Authorization: `Bearer ${TOKEN}` },
    data: {
      recipientName: 'Test User',
      recipientEmail: 'test@example.com',
      size: 'B',
      deliveryType: 'LOCKER',
      lockerCode: 'WAW001',
    },
  })
  expect(createRes.status()).toBe(201)
  const created = await createRes.json()

  const res = await request.get(`/api/parcels/${created.id}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('id', created.id)

  // Cleanup
  await request.delete(`/api/parcels/${created.id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
})

// --- Test 4 ---
test('system status shows ready after initialising', async ({ page }) => {
  await page.goto('/challenges/async')
  const status = page.locator('[data-testid="system-ready"]')
  await status.waitFor()
  // Bug: original test compared "system ready" (lowercase s) — actual text is "System ready"
  await expect(status).toHaveText('System ready')
})

// --- Test 5 ---
test('profile page shows the user email', async ({ page }) => {
  await page.goto('/login')
  await page.fill('#email', 'user@example.com')
  await page.fill('#password', 'password12345')
  await page.click('[type="submit"]')
  await page.waitForURL('/profile')

  // Bug: data-testid="user-email" does not exist in profile/page.tsx.
  // The email is rendered in a plain <p> inside a flex card row.
  // Use getByText to locate the email value directly.
  await expect(page.getByText('user@example.com')).toBeVisible()
})

// --- Test 6 (bonus) ---
test('newsletter form submits without error', async ({ page }) => {
  await page.goto('/')
  await page.fill('[data-testid="newsletter-input"]', 'test@example.com')
  await page.click('[data-testid="newsletter-submit"]')
  // Wait for either success state or an error — ensures the request completed
  await expect(
    page.locator('[data-testid="newsletter-success"], [data-testid="newsletter-error"]')
  ).toBeVisible()
})
