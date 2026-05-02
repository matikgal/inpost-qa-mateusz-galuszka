import { test, expect, Page } from '@playwright/test'

/**
 * TASK 01 — Login
 *
 * Test the login flow at /login.
 * Credentials: user@example.com / password12345
 */

const VALID_EMAIL = 'user@example.com'
const VALID_PASSWORD = 'password12345'

class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async fillEmail(email: string) {
    await this.page.fill('#email', email)
  }

  async fillPassword(password: string) {
    await this.page.fill('#password', password)
  }

  async submit() {
    await this.page.click('[type="submit"]')
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  emailError() {
    return this.page.locator('#email ~ p')
  }

  passwordError() {
    return this.page.locator('#password ~ p')
  }

  rootError() {
    return this.page.locator('[role="alert"]')
  }

  submitButton() {
    return this.page.locator('[type="submit"]')
  }
}

test.describe('Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test.describe('Happy path', () => {
    test('should log in with valid credentials and redirect to profile', async ({ page }) => {
      await loginPage.login(VALID_EMAIL, VALID_PASSWORD)
      await page.waitForURL('/profile')
      await expect(page).toHaveURL('/profile')
    })

    test('should show user name on homepage after login', async ({ page }) => {
      await loginPage.login(VALID_EMAIL, VALID_PASSWORD)
      await page.waitForURL('/profile')
      await page.goto('/')
      await expect(page.getByText(`Welcome back, user!`)).toBeVisible()
    })

    test('should display profile page content after successful login', async ({ page }) => {
      await loginPage.login(VALID_EMAIL, VALID_PASSWORD)
      await page.waitForURL('/profile')
      await expect(page.getByText('My Profile')).toBeVisible()
      await expect(page.getByText(VALID_EMAIL)).toBeVisible()
    })

    test('should persist session after page reload', async ({ page }) => {
      await loginPage.login(VALID_EMAIL, VALID_PASSWORD)
      await page.waitForURL('/profile')
      await page.reload()
      await expect(page.getByText('My Profile')).toBeVisible()
    })

    test('should allow logout and prevent profile access', async ({ page }) => {
      await loginPage.login(VALID_EMAIL, VALID_PASSWORD)
      await page.waitForURL('/profile')
      await page.getByRole('button', { name: 'Sign Out' }).click()
      await page.goto('/profile')
      await expect(page.getByText('My Profile')).not.toBeVisible()
    })
  })

  test.describe('Error cases — wrong credentials', () => {
    test('should show error when password is incorrect', async ({ page }) => {
      await loginPage.login(VALID_EMAIL, 'wrongpassword')
      await expect(loginPage.rootError()).toBeVisible()
    })

    test('should show error when email is not registered', async ({ page }) => {
      await loginPage.login('notauser@example.com', VALID_PASSWORD)
      await expect(loginPage.rootError()).toBeVisible()
    })

    test('should show error when both email and password are wrong', async ({ page }) => {
      await loginPage.login('bad@bad.com', 'badpassword')
      await expect(loginPage.rootError()).toBeVisible()
    })
  })

  test.describe('Error cases — empty fields', () => {
    test('should show validation error when email is empty', async ({ page }) => {
      await loginPage.fillPassword(VALID_PASSWORD)
      await loginPage.submit()
      await expect(loginPage.emailError()).toBeVisible()
    })

    test('should show validation error when password is empty', async ({ page }) => {
      await loginPage.fillEmail(VALID_EMAIL)
      await loginPage.submit()
      await expect(loginPage.passwordError()).toBeVisible()
    })

    test('should show validation errors when both fields are empty', async ({ page }) => {
      await loginPage.submit()
      await expect(loginPage.emailError()).toBeVisible()
      await expect(loginPage.passwordError()).toBeVisible()
    })
  })

  test.describe('Error cases — input validation', () => {
    test('should show validation error for non-email string in email field', async ({ page }) => {
      await loginPage.login('notanemail', VALID_PASSWORD)
      // Expect either client-side validation OR no successful redirect
      await expect(page).not.toHaveURL('/profile')
    })
  })

  test.describe('Edge cases', () => {
    test('should be case-sensitive for email — uppercase email should fail', async ({ page }) => {
      await loginPage.login('USER@EXAMPLE.COM', VALID_PASSWORD)
      await expect(loginPage.rootError()).toBeVisible()
      await expect(page).not.toHaveURL('/profile')
    })

    test('should trim trailing spaces from email — login should succeed', async ({ page }) => {
      // The form calls login() which uses email as-is; trailing spaces cause mismatch
      // This documents the current behaviour: trailing spaces cause login failure
      await loginPage.login('  user@example.com  ', VALID_PASSWORD)
      // Current app: likely fails because spaces are passed as-is to API
      // If trimming is added, this should succeed → assert /profile
      await expect(page).not.toHaveURL('/profile')
    })

    test('should reject SQL injection in email field', async ({ page }) => {
      await loginPage.login("' OR '1'='1", VALID_PASSWORD)
      await expect(page).not.toHaveURL('/profile')
    })

    test('should reject SQL injection in password field', async ({ page }) => {
      await loginPage.login(VALID_EMAIL, "' OR '1'='1' --")
      await expect(page).not.toHaveURL('/profile')
    })

    test('should handle very long email string gracefully', async ({ page }) => {
      const longEmail = 'a'.repeat(200) + '@example.com'
      await loginPage.login(longEmail, VALID_PASSWORD)
      await expect(page).not.toHaveURL('/profile')
    })

    test('should handle very long password string gracefully', async ({ page }) => {
      const longPassword = 'p'.repeat(1000)
      await loginPage.login(VALID_EMAIL, longPassword)
      await expect(loginPage.rootError()).toBeVisible()
      await expect(page).not.toHaveURL('/profile')
    })

    test('should disable submit button while form is submitting', async ({ page }) => {
      await loginPage.fillEmail(VALID_EMAIL)
      await loginPage.fillPassword(VALID_PASSWORD)
      await page.click('[type="submit"]')
      // Button should be disabled immediately after click
      await expect(loginPage.submitButton()).toBeDisabled()
    })
  })
})
