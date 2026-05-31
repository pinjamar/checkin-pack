# checkin-pack

Astro + Cloudflare Pages + Supabase. Manages short-term rental check-ins for Croatian legal compliance.

---

## "What do I run for X?"

### I want to work on the app (UI, pages, forms)
```
npm run dev
```
Opens at `localhost:4321`. This is what you use 99% of the time.

### I want to test the cron emails
```
node scripts/test-cron.mjs
```
Runs the health check + pre-arrival email logic against your real Supabase and Resend.
Reads credentials from `.dev.vars`.

To test an actual email send, you need a booking with tomorrow's arrival date.
Run this SQL in the Supabase dashboard → SQL Editor:
```sql
UPDATE bookings
SET arrival_date = CURRENT_DATE + 1, pre_arrival_link_sent = false
WHERE id = 'your-booking-id';
```
Then run the script again — the guest gets an email.

> **Note:** `wrangler dev` does NOT work for this project. It crashes with a React error.
> Always use `node scripts/test-cron.mjs` instead.

### I want to run Playwright tests (browser automation)

Make sure the dev server is NOT running first — Playwright starts it automatically.

```
npm run test:e2e:headed
```
Opens a real browser and runs all tests. You can watch what it does.

```
npm run test:e2e
```
Same but headless (no browser window). Faster, good for CI.

After any run, see the full report:
```
npx playwright show-report
```

### I want to test the guest registration form with Playwright

You need a real token from your database. Get one:
```sql
SELECT pre_arrival_token FROM bookings LIMIT 1;
```
Then in PowerShell:
```powershell
$env:TEST_REGISTRATION_TOKEN="paste-the-token-here"
npm run test:e2e:headed
```

### I want to autofill the eVisitor registration form

**One-time setup** — run this SQL in Supabase → SQL Editor:
```sql
ALTER TABLE owners
ADD COLUMN IF NOT EXISTS evisitor_username text,
ADD COLUMN IF NOT EXISTS evisitor_password text;
```
Then go to `/dashboard/settings` and save your eVisitor credentials.

After that, for each booking you want to register:
1. Add the booking ID to `.dev.vars`:
   ```
   AUTOFILL_BOOKING_ID=your-booking-uuid-here
   ```
2. Run:
   ```
   npm run test:autofill
   ```
3. A real browser opens, logs in, and fills the form. Review it, then click "Prijavi" manually.

Fields to check before submitting: **Spol (gender)**, city of residence/birth, arrival/departure times.

### I want to discover the real eVisitor form selectors

This opens a real browser, logs into evisitor.hr, and saves all form field names/IDs to JSON files.
You need your eVisitor credentials in `.dev.vars` (`EVISITOR_USERNAME`, `EVISITOR_PASSWORD`).
```
npm run test:evisitor
```
Output lands in `tests/evisitor/output/` (screenshots + JSON). Not committed to git.

### I want to deploy to production

Just push to `main` — Cloudflare Pages deploys automatically.

If you need to deploy manually:
```
npm run build
npx wrangler deploy
```

---

## Environment variables

Two separate files — don't mix them up.

**`.env`** — used by `npm run dev` (Astro dev server, browser-side code):
```
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

**`.dev.vars`** — used by `node scripts/test-cron.mjs` and wrangler (server-side secrets):
```
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
ADMIN_ALERT_EMAIL=your@email.com
```

**Production** — set in Cloudflare Pages dashboard → Settings → Variables and Secrets:
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ADMIN_ALERT_EMAIL`
- `STRIPE_SECRET_KEY` (not wired up yet)
- `STRIPE_WEBHOOK_SECRET` (not wired up yet)

---

## How emails work

- **Pre-arrival link** — sent automatically the day before arrival (cron at 10:00 Croatian time)
- **Checkout reminder** — sent automatically the evening before departure (cron at 20:00 Croatian time)
- **Owner notification** — sent when a guest submits the registration form
- **eVisitor down alert** — sent to `ADMIN_ALERT_EMAIL` if evisitor.hr is unreachable

Currently using `onboarding@resend.dev` as sender (Resend test address — only delivers to your Resend account email). Before launch, switch to a real domain sender in:
- `src/pages/api/bookings/[id]/send-link.ts`
- `src/pages/api/guest/register.ts`
- `src/lib/cron.ts`

---

## Playwright patterns (for practice)

```typescript
// Go to a page
await page.goto('/login')

// Find elements
const btn = page.locator('button[type="submit"]')
const input = page.locator('input[placeholder="First Name"]')

// Interact
await input.fill('Ivan')
await btn.click()

// Assert things
await expect(btn).toBeVisible()
await expect(page.locator('h1')).toHaveText('Welcome')
await expect(page).toHaveURL('/dashboard')

// Debug
await page.screenshot({ path: 'debug.png', fullPage: true })
await page.waitForSelector('.success-message')

// Run JS in the browser
const title = await page.evaluate(() => document.title)
```

---

## Before launch checklist

- [ ] Buy and verify domain `checkinpack.hr` — point to Cloudflare Pages, verify in Resend
- [ ] Switch email sender from `onboarding@resend.dev` to `noreply@checkinpack.hr`
- [ ] Set all production secrets in Cloudflare Pages dashboard
- [ ] Stripe integration — payments not yet wired up (keys are in env)
- [x] eVisitor autofill — `npm run test:autofill`, see TBD.md for DB migration
- [ ] Privacy policy and terms pages (required by GDPR)
- [x] Cron emails tested and confirmed working
- [x] Health check alert email confirmed working

### Plan gating — re-enable before launch

These limits were removed during development and need to go back before going live.

**`src/pages/api/apartments/index.ts`** — add back the apartment limit:
```ts
const { data: owner } = await supabaseAdmin.from('owners').select('plan').eq('id', user.id).single()
const { count } = await supabaseAdmin.from('apartments').select('*', { count: 'exact', head: true }).eq('owner_id', user.id)
const maxApartments = owner?.plan === 'pro' ? 999 : 1
if ((count || 0) >= maxApartments) {
  return new Response(JSON.stringify({ error: 'Apartment limit reached. Upgrade to Pro.' }), { status: 403 })
}
```

**`src/pages/dashboard/index.astro`** — add back the plan check and upsell banner:
```ts
const { data: owner } = await supabaseAdmin.from('owners').select('plan').eq('id', user.id).single()
const plan = owner?.plan || 'free'
const canAddMore = plan === 'pro' || (apartments?.length || 0) < 1
```
Then restore the conditional `+ Add apartment` / `Upgrade to Pro` button and the free plan banner.
