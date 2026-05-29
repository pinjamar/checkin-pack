import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// This test does NOT hit the local server — it opens evisitor.hr directly.
// Its job: discover the real HTML selectors on the eVisitor login and
// registration forms so you can fill them into evisitor-autofill.ts.
//
// Run with: npx playwright test tests/evisitor --headed
// (--headed so you can watch it navigate)
//
// Output: screenshots + a selectors.json file in tests/evisitor/output/

test.use({
  // Override baseURL — these tests go to the real eVisitor site
  baseURL: 'https://www.evisitor.hr',
  // Slow down actions so you can follow along visually
  actionTimeout: 15_000,
})

const OUTPUT_DIR = path.join(process.cwd(), 'tests', 'evisitor', 'output')

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
})

test('inspect eVisitor login page selectors', async ({ page }) => {
  await page.goto('https://www.evisitor.hr', { waitUntil: 'domcontentloaded', timeout: 20_000 })

  // Screenshot the login page
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-login-page.png'), fullPage: true })

  // Find every input, select, button and link on the page
  const inputs = await page.evaluate(() => {
    const results: object[] = []

    document.querySelectorAll('input, select, textarea').forEach((el) => {
      const e = el as HTMLInputElement
      results.push({
        tag: e.tagName.toLowerCase(),
        type: e.type || null,
        id: e.id || null,
        name: e.name || null,
        placeholder: e.placeholder || null,
        className: e.className || null,
        label: document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim() ?? null,
      })
    })

    return results
  })

  const buttons = await page.evaluate(() => {
    const results: object[] = []
    document.querySelectorAll('button, input[type="submit"], a').forEach((el) => {
      const e = el as HTMLElement
      results.push({
        tag: e.tagName.toLowerCase(),
        type: (e as HTMLInputElement).type || null,
        id: e.id || null,
        text: e.textContent?.trim().slice(0, 80) ?? null,
        href: (e as HTMLAnchorElement).href || null,
      })
    })
    return results
  })

  // Write to JSON so you can inspect it without re-running
  const output = { url: page.url(), inputs, buttons }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'login-page-selectors.json'),
    JSON.stringify(output, null, 2)
  )

  console.log('\n=== eVisitor login page inputs ===')
  console.log(JSON.stringify(inputs, null, 2))
  console.log('\n=== eVisitor login page buttons ===')
  console.log(JSON.stringify(buttons, null, 2))

  // Basic sanity check that the page loaded
  expect(inputs.length).toBeGreaterThan(0)
})

test('login and inspect registration form selectors', async ({ page }) => {
  const username = process.env.EVISITOR_USERNAME
  const password = process.env.EVISITOR_PASSWORD

  test.skip(!username || !password,
    'Set EVISITOR_USERNAME and EVISITOR_PASSWORD env vars to run this test')

  await page.goto('https://www.evisitor.hr', { waitUntil: 'domcontentloaded', timeout: 20_000 })

  // --- Step 1: Log in ---
  // These selectors are placeholders — the first test above will tell you the real ones
  await page.fill('input[name="username"], #username, input[type="text"]', username!)
  await page.fill('input[name="password"], #password, input[type="password"]', password!)

  await page.screenshot({ path: path.join(OUTPUT_DIR, '02-before-login.png') })

  await page.click('button[type="submit"], input[type="submit"]')
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 })

  await page.screenshot({ path: path.join(OUTPUT_DIR, '03-after-login.png'), fullPage: true })

  // --- Step 2: Navigate to new registration form ---
  // The link text or href for "new registration" — inspect screenshot 03 to find it
  // then update the selector below
  const newRegLink = page.locator(
    'a:has-text("Nova prijava"), a:has-text("Prijava gosta"), [href*="nova"], [href*="new"]'
  ).first()

  const linkCount = await newRegLink.count()
  if (linkCount === 0) {
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04-no-nav-link-found.png'), fullPage: true })
    console.log('Could not find registration nav link. Check screenshot 03 and 04.')
    // Don't fail — let the user inspect the screenshots
    return
  }

  await newRegLink.click()
  await page.waitForLoadState('domcontentloaded')
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04-registration-form.png'), fullPage: true })

  // --- Step 3: Collect registration form selectors ---
  const formInputs = await page.evaluate(() => {
    const results: object[] = []
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      const e = el as HTMLInputElement
      // For selects, also capture all options
      let options: { value: string; text: string }[] | null = null
      if (e.tagName === 'SELECT') {
        options = Array.from((e as HTMLSelectElement).options).map((o) => ({
          value: o.value,
          text: o.text.trim(),
        }))
      }
      results.push({
        tag: e.tagName.toLowerCase(),
        type: e.type || null,
        id: e.id || null,
        name: e.name || null,
        placeholder: e.placeholder || null,
        label: document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim() ?? null,
        options,
      })
    })
    return results
  })

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'registration-form-selectors.json'),
    JSON.stringify({ url: page.url(), formInputs }, null, 2)
  )

  console.log('\n=== eVisitor registration form inputs ===')
  console.log(JSON.stringify(formInputs, null, 2))
  console.log(`\nScreenshots saved to: ${OUTPUT_DIR}`)
  console.log('Use these selectors to update evisitor-autofill.ts')
})
