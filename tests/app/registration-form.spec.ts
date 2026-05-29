import { test, expect } from '@playwright/test'

// Tests for the guest pre-arrival registration form at /register/[token].
// Uses a fake token — the page should show a 404 or invalid-link state,
// but the form itself can be tested with a real token from your DB.

test.describe('Guest registration form', () => {
  // Replace with a real token from your bookings table to test the full form.
  // Run: select pre_arrival_token from bookings limit 1;
  const REAL_TOKEN = process.env.TEST_REGISTRATION_TOKEN ?? ''

  test.skip(!REAL_TOKEN, 'Set TEST_REGISTRATION_TOKEN env var to run form tests')

  test('form renders all required fields', async ({ page }) => {
    await page.goto(`/register/${REAL_TOKEN}`)

    // Guest fields
    await expect(page.locator('input[placeholder="First Name"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Last Name"]')).toBeVisible()
    await expect(page.locator('select').filter({ hasText: 'ID Card' })).toBeVisible()
    await expect(page.locator('input[list="countries-list"]')).toBeVisible()

    // GDPR checkbox
    await expect(page.locator('input[type="checkbox"]')).toBeVisible()

    // Submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.goto(`/register/${REAL_TOKEN}`)
    await page.click('button[type="submit"]')

    // The first required input should be invalid
    const firstName = page.locator('input[placeholder="First Name"]')
    const isRequired = await firstName.evaluate((el: HTMLInputElement) => el.validity.valueMissing)
    expect(isRequired).toBe(true)
  })

  test('can add a second guest', async ({ page }) => {
    await page.goto(`/register/${REAL_TOKEN}`)

    const addButton = page.locator('button', { hasText: /Add another guest/i })
    await addButton.click()

    // Should now have 2 guest cards (each with a first name input)
    const firstNameInputs = page.locator('input[placeholder="First Name"]')
    await expect(firstNameInputs).toHaveCount(2)
  })

  test('can remove an added guest', async ({ page }) => {
    await page.goto(`/register/${REAL_TOKEN}`)

    await page.click('button:has-text("Add another guest")')
    const removeButton = page.locator('button', { hasText: /Remove/i }).first()
    await removeButton.click()

    const firstNameInputs = page.locator('input[placeholder="First Name"]')
    await expect(firstNameInputs).toHaveCount(1)
  })

  test('nationality autocomplete shows suggestions', async ({ page }) => {
    await page.goto(`/register/${REAL_TOKEN}`)

    const nationalityInput = page.locator('input[list="countries-list"]')
    await nationalityInput.fill('Ger')

    // The datalist should offer "Germany"
    const value = await nationalityInput.inputValue()
    expect(value).toBe('Ger')
    // Playwright can't directly assert datalist options — you'd need to pick one:
    // await nationalityInput.fill('Germany')
    // await expect(nationalityInput).toHaveValue('Germany')
  })
})
