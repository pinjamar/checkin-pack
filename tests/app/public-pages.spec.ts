import { test, expect } from '@playwright/test'

// These tests hit the Astro dev server (localhost:4321).
// They cover public pages that don't require Cloudflare Workers runtime.

test.describe('Landing page', () => {
  test('loads and has a call to action', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/CheckinPack/i)
    // There should be some CTA link or button pointing to /signup or /login
    const cta = page.locator('a[href="/signup"], a[href="/login"], button')
    await expect(cta.first()).toBeVisible()
  })

  test('has no broken images', async ({ page }) => {
    await page.goto('/')
    const images = page.locator('img')
    const count = await images.count()
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(naturalWidth, `Image at index ${i} failed to load`).toBeGreaterThan(0)
    }
  })
})

test.describe('Login page', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    // Browser validation or app-level error should appear
    // Either the input is invalid (browser) or an error message shows
    const emailInput = page.locator('input[type="email"]')
    const isRequired = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing)
    expect(isRequired).toBe(true)
  })

  test('has link to signup', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('a[href="/signup"]')).toBeVisible()
  })
})

test.describe('Signup page', () => {
  test('renders the signup form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})
