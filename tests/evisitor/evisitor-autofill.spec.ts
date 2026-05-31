import { test } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Config — read from .dev.vars
// ---------------------------------------------------------------------------
const devVars: Record<string, string> = {}
try {
  for (const line of fs.readFileSync(path.join(process.cwd(), '.dev.vars'), 'utf-8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq < 1) continue
    devVars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
} catch {}

const SUPABASE_URL = 'https://yrsxyfrwsaujwtnzamuf.supabase.co'
const SUPABASE_KEY = devVars.SUPABASE_SERVICE_ROLE_KEY
// Set AUTOFILL_BOOKING_ID in .dev.vars or as env var
const BOOKING_ID = process.env.AUTOFILL_BOOKING_ID || devVars.AUTOFILL_BOOKING_ID
// Credentials: .dev.vars takes priority; fallback to Supabase owners table at runtime
let EV_USERNAME = devVars.EVISITOR_USERNAME
let EV_PASSWORD = devVars.EVISITOR_PASSWORD

const OUTPUT_DIR = path.join(process.cwd(), 'tests', 'evisitor', 'output', 'autofill')

// ---------------------------------------------------------------------------
// Document type → eVisitor UUID
// ---------------------------------------------------------------------------
const DOC_TYPE_UUID: Record<string, string> = {
  passport_foreign:  '70a188b6-6e4d-4a72-a30a-905f05942f4f', // Osobna putovnica (strana)
  passport_domestic: 'f0fd87a5-1b1a-480d-8393-8427a8d42bc1', // Osobna putovnica (domaća)
  id_card_foreign:   'b65574b0-c6ec-4a73-8e36-b407bb315591', // Osobna iskaznica (strana)
  id_card_domestic:  '515a1693-d93b-4435-aa27-be15717c3f18', // Osobna iskaznica (domaća)
}

function docTypeUUID(type: string, nationality: string): string {
  const croatian = nationality === 'Croatia'
  if (type === 'passport') return croatian ? DOC_TYPE_UUID.passport_domestic : DOC_TYPE_UUID.passport_foreign
  return croatian ? DOC_TYPE_UUID.id_card_domestic : DOC_TYPE_UUID.id_card_foreign
}

// YYYY-MM-DD → DD.MM.YYYY
function toHRDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ---------------------------------------------------------------------------
// Fill an eVisitor autocomplete field (the _input / hidden pair)
// ---------------------------------------------------------------------------
async function fillAutocomplete(page: any, name: string, value: string) {
  const inputSel = `[name="${name}_input"]`
  await page.click(inputSel)
  await page.fill(inputSel, '')
  await page.type(inputSel, value, { delay: 80 })
  await page.waitForTimeout(1200)
  // Try to click the first suggestion in the dropdown
  const suggestion = page.locator('ul.ui-autocomplete li:visible, .autocomplete-item:visible, [role="option"]:visible').first()
  const count = await suggestion.count()
  if (count > 0) {
    await suggestion.click()
    await page.waitForTimeout(400)
  } else {
    // Fallback: press Enter and hope for the best
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
  }
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------
test.use({
  baseURL: 'https://www.evisitor.hr',
  actionTimeout: 20_000,
  // Keep browser open after test so user can review before submitting
  launchOptions: { slowMo: 100 },
})

test('autofill eVisitor registration form', async ({ page }) => {
  test.skip(!BOOKING_ID, 'Set AUTOFILL_BOOKING_ID in .dev.vars to run this test')
  test.skip(!SUPABASE_KEY, 'Set SUPABASE_SERVICE_ROLE_KEY in .dev.vars')

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // ── 1. Fetch guest data from Supabase ──────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Load eVisitor credentials from Supabase owners table if not in .dev.vars
  if (!EV_USERNAME || !EV_PASSWORD) {
    const { data: owner } = await supabase
      .from('owners')
      .select('evisitor_username, evisitor_password')
      .not('evisitor_username', 'is', null)
      .limit(1)
      .single()
    EV_USERNAME = EV_USERNAME || owner?.evisitor_username || ''
    EV_PASSWORD = EV_PASSWORD || owner?.evisitor_password || ''
  }

  if (!EV_USERNAME || !EV_PASSWORD) {
    throw new Error('eVisitor credentials not found. Add to .dev.vars or save in Settings → eVisitor prijava.')
  }

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('*, apartments!inner(name)')
    .eq('id', BOOKING_ID)
    .single()

  if (bookingErr || !booking) throw new Error(`Booking not found: ${bookingErr?.message}`)

  const { data: guests, error: guestErr } = await supabase
    .from('guest_registrations')
    .select('*')
    .eq('booking_id', BOOKING_ID)

  if (guestErr || !guests?.length) throw new Error(`No guests found for booking ${BOOKING_ID}`)

  const apartmentName: string = (booking as any).apartments?.name || ''
  console.log(`\nFilling registration for booking: ${BOOKING_ID}`)
  console.log(`Apartment: ${apartmentName}`)
  console.log(`Guests: ${guests.length}`)

  // ── 2. Log in ───────────────────────────────────────────────────────────
  await page.goto('https://www.evisitor.hr', { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await page.fill('#userName', EV_USERNAME!)
  await page.fill('#password', EV_PASSWORD!)
  await page.click('#loginPageButton')
  console.log('\n⏳ Waiting for login — if TAN is required, enter it in the browser now...')
  await page.waitForSelector('a:has-text("Turisti")', { timeout: 180_000 })
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-logged-in.png'), fullPage: true })
  console.log('✅ Logged in')

  // ── 3. Navigate to Prijava turista ─────────────────────────────────────
  await page.click('a:has-text("Turisti")')
  await page.waitForTimeout(800)
  await page.click('a:has-text("Prijava turista")')
  await page.waitForLoadState('domcontentloaded')
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02-registration-form.png'), fullPage: true })
  console.log('✅ Navigated to registration form')

  // ── 4. Extract dynamic form suffix ────────────────────────────────────
  const suffix: string | null = await page.evaluate(() => {
    const el = document.querySelector('[name^="TouristSurname"]')
    if (!el) return null
    return el.getAttribute('name')?.replace('TouristSurname', '') ?? null
  })

  if (!suffix) throw new Error('Could not find form suffix — page structure may have changed')
  console.log(`Form suffix: ${suffix}`)

  // ── 5. Fill each guest ─────────────────────────────────────────────────
  for (let i = 0; i < guests.length; i++) {
    const g = guests[i]
    // full_name is stored as "LASTNAME Firstname"
    const nameParts = (g.full_name || '').split(' ')
    const surname = nameParts[0] || ''
    const firstName = nameParts.slice(1).join(' ') || ''
    const nationality: string = g.nationality || ''
    const docNumber: string = g.document_number_encrypted || ''
    const docType: string = g.document_type || 'passport'
    const dob: string = g.date_of_birth || ''
    const gender: string = (g as any).gender || ''
    const cityOfResidence: string = (g as any).city_of_residence || ''
    const countryOfResidence: string = (g as any).country_of_residence || nationality
    const countryOfBirth: string = (g as any).country_of_birth || nationality

    console.log(`\nFilling guest ${i + 1}: ${g.full_name}`)

    if (i > 0) {
      // Add another tourist slot
      await page.click('button:has-text("Dodaj novog turista")')
      await page.waitForTimeout(1000)
    }

    // Document type
    await page.selectOption(`[id^="DocumentTtypeID"]`, docTypeUUID(docType, nationality))
    await page.waitForTimeout(300)

    // Document number
    await page.fill(`[id^="DocumentNumber"]`, docNumber)

    // Surname and name
    await page.fill(`[id^="TouristSurname"]`, surname)
    await page.fill(`[id^="TouristName"]`, firstName)

    // Date of birth (DD.MM.YYYY)
    await page.fill(`[id^="DateOfBirth"]`, toHRDate(dob))

    // Gender — radio button (Muški / Ženski)
    if (gender) {
      const genderLabel = gender === 'male' ? 'Muški' : 'Ženski'
      await page.locator(`label:has-text("${genderLabel}")`).first().click()
      await page.waitForTimeout(300)
    }

    // Country of residence (from guest data, fallback to nationality)
    await fillAutocomplete(page, `CountryResidenceID${suffix}`, countryOfResidence)

    // City of residence — selector needs verification with inspect-selectors
    if (cityOfResidence) {
      await page.fill(`[id^="PlaceOfResidence"]`, cityOfResidence)
    }

    // Country of birth (from guest data, fallback to nationality)
    await fillAutocomplete(page, `CountryOfBirthID${suffix}`, countryOfBirth)

    // Citizenship / nationality (autocomplete)
    await fillAutocomplete(page, `CitizenshipCountryID${suffix}`, nationality)

    // Arrival date
    await page.fill(`[id^="StayFrom"]`, toHRDate(booking.arrival_date))

    // Departure date
    await page.fill(`[id^="ForeseenStayUntil"]`, toHRDate(booking.departure_date))

    // Service type = Noćenje (overnight) — only option
    await page.selectOption(`[id^="OfferedServiceTypeID"]`, { index: 1 })

    // Facility — match by apartment name
    const facilitySelect = page.locator(`[id^="FacilityID"]`)
    const facilityOptions = await facilitySelect.locator('option').all()
    let facilityMatched = false
    for (const opt of facilityOptions) {
      const text = await opt.textContent()
      if (text && apartmentName && text.toLowerCase().includes(apartmentName.toLowerCase())) {
        const val = await opt.getAttribute('value')
        if (val) {
          await facilitySelect.selectOption(val)
          facilityMatched = true
          break
        }
      }
    }
    if (!facilityMatched && facilityOptions.length > 1) {
      // Select the first non-empty option
      const val = await facilityOptions[1].getAttribute('value')
      if (val) await facilitySelect.selectOption(val)
    }

    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `0${3 + i}-guest-${i + 1}-filled.png`),
      fullPage: true,
    })
    console.log(`✅ Guest ${i + 1} filled`)
  }

  // ── 6. Final screenshot — do NOT submit ────────────────────────────────
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'final-review.png'), fullPage: true })

  console.log(`
✅ Form filled. Screenshots saved to: ${OUTPUT_DIR}

⚠️  Fields that may need manual attention:
   - Gender (Spol) — not collected by guest form, defaults to not set
   - City of residence / birth — not collected, left blank
   - Arrival/departure time — left blank
   - Payment category — may auto-populate after saving

👉 Review the form in the browser, make any corrections, then click "Prijavi".
`)

  // Keep browser open for 2 minutes so user can review and submit
  await page.waitForTimeout(120_000)
})
