# checkin-pack

Astro + Cloudflare Pages + Supabase app for managing short-term rental check-ins (Croatian legal compliance).

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start local dev server at `localhost:4321`  |
| `npm run build`   | Build to `./dist/`                          |
| `npm run preview` | Preview build locally                       |

## Environment variables

Fill in `.dev.vars` for local development (Cloudflare runtime bindings — NOT `.env`).

| Variable                   | Where to get it                       |
| :------------------------- | :------------------------------------ |
| `PUBLIC_SUPABASE_URL`      | Supabase → Settings → API            |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API            |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase → Settings → API            |
| `RESEND_API_KEY`           | resend.com → API Keys                 |
| `PUBLIC_SITE_URL`          | Your production URL (e.g. https://checkinpack.hr) |
| `STRIPE_SECRET_KEY`        | dashboard.stripe.com → Developers    |
| `STRIPE_WEBHOOK_SECRET`    | Stripe → Webhooks → signing secret    |

For production, set secrets via Cloudflare Pages dashboard:
**Workers & Pages → checkin-pack → Settings → Variables and Secrets**

## Email sender

Currently using `onboarding@resend.dev` (Resend test address — only delivers to your Resend account email).

**Before launch:** verify `checkinpack.hr` domain in Resend and switch sender in:
- `src/pages/api/bookings/[id]/send-link.ts`
- `src/pages/api/guest/register.ts`

## Cron

Cloudflare runs a daily cron at **08:00 UTC (10:00 Croatian time)**.
Sends pre-arrival registration links to guests arriving the next day.
Configured in `wrangler.toml` → `[triggers]`.

---

## Playwright (E2E Testing)

### Installation (already done)

`@playwright/test` is in devDependencies and Chromium is installed. If you clone the repo fresh, run:

```
npm install
npx playwright install chromium
```

---

### Test scripts

| Command | What it does |
| :--- | :--- |
| `npm run test:e2e` | Run all tests headless (no browser window) |
| `npm run test:e2e:headed` | Run all tests with browser visible |
| `npm run test:evisitor` | Run only the eVisitor selector inspector, with browser visible |

Or use `npx playwright test` directly for more control:

```
npx playwright test                          # run everything
npx playwright test tests/app               # run only app tests
npx playwright test --headed                # show browser
npx playwright test --debug                 # step through with DevTools
npx playwright show-report                  # open the HTML report after a run
```

---

### Test files

```
tests/
  app/
    public-pages.spec.ts        ← landing, login, signup pages
    registration-form.spec.ts   ← guest registration form (needs token)
  evisitor/
    inspect-selectors.spec.ts   ← eVisitor.hr selector discovery tool
    output/                     ← screenshots + JSON dumps (gitignored)
```

---

### Running app tests (`tests/app/`)

**Prerequisites:**
- Dev server does NOT need to be running manually — Playwright starts it automatically via `webServer` in `playwright.config.ts`.

**`public-pages.spec.ts`** — runs out of the box, no setup needed:

```
npx playwright test tests/app/public-pages.spec.ts --headed
```

Tests: landing page loads, no broken images, login form renders, empty submit validation, signup link exists.

**`registration-form.spec.ts`** — requires a real booking token from your database:

```sql
-- Run in Supabase SQL editor to get a token:
SELECT pre_arrival_token FROM bookings LIMIT 1;
```

Then set the env var and run:

```powershell
# PowerShell
$env:TEST_REGISTRATION_TOKEN="paste-token-here"
npx playwright test tests/app/registration-form.spec.ts --headed
```

Tests: all form fields visible, empty submit validation, add/remove guest, nationality autocomplete.

---

### Running the eVisitor selector inspector (`tests/evisitor/`)

This tool navigates **live evisitor.hr**, takes screenshots at every step, and dumps all form field selectors (IDs, names, labels, types, SELECT options) to JSON files. Its purpose is to discover the real HTML selectors you need to build the Playwright autofill script.

**Test 1 — Login page inspection (no credentials needed):**

```
npx playwright test tests/evisitor --headed
```

This opens evisitor.hr, screenshots the login page, and saves every input/button selector to:
```
tests/evisitor/output/login-page-selectors.json
tests/evisitor/output/01-login-page.png
```

Open the JSON to see the real `id`, `name`, and `type` of the username/password fields.

**Test 2 — Full flow including registration form (credentials required):**

```powershell
# PowerShell — set your eVisitor credentials
$env:EVISITOR_USERNAME="your-evisitor-username"
$env:EVISITOR_PASSWORD="your-evisitor-password"
npx playwright test tests/evisitor --headed
```

This logs in, navigates to the new registration form, and saves all form field selectors (including every SELECT option) to:
```
tests/evisitor/output/registration-form-selectors.json
tests/evisitor/output/02-before-login.png
tests/evisitor/output/03-after-login.png
tests/evisitor/output/04-registration-form.png
```

The JSON and screenshots are what you use to build the autofill script (`evisitor-autofill.ts`).

> Output files are gitignored — they won't be committed.

---

### Viewing test results

After any test run, open the HTML report:

```
npx playwright show-report
```

This opens a browser with a full breakdown: which tests passed/failed, screenshots on failure, traces for retried tests.

---

### Common Playwright patterns (for practice)

```typescript
// Navigate and wait for page to load
await page.goto('/login')

// Find an element
const btn = page.locator('button[type="submit"]')
const input = page.locator('input[placeholder="First Name"]')

// Fill an input
await input.fill('Ivan')

// Click a button
await btn.click()

// Assert visibility
await expect(btn).toBeVisible()

// Assert text content
await expect(page.locator('h1')).toHaveText('Welcome')

// Assert URL after navigation
await expect(page).toHaveURL('/dashboard')

// Take a screenshot manually
await page.screenshot({ path: 'debug.png', fullPage: true })

// Wait for something to appear
await page.waitForSelector('.success-message')

// Run JS in the browser context
const title = await page.evaluate(() => document.title)
```

---

## Before launch checklist

### Plan gating (currently disabled for development)
The following limits were removed during development and must be restored before going live:

- **`src/pages/api/apartments/index.ts`** — re-add apartment limit per plan:
  ```ts
  const { data: owner } = await supabaseAdmin.from('owners').select('plan').eq('id', user.id).single()
  const { count } = await supabaseAdmin.from('apartments').select('*', { count: 'exact', head: true }).eq('owner_id', user.id)
  const maxApartments = owner?.plan === 'pro' ? 999 : 1
  if ((count || 0) >= maxApartments) {
    return new Response(JSON.stringify({ error: 'Apartment limit reached. Upgrade to Pro for unlimited apartments.' }), { status: 403 })
  }
  ```

- **`src/pages/dashboard/index.astro`** — re-add plan check and upsell banner:
  ```ts
  const { data: owner } = await supabaseAdmin.from('owners').select('plan').eq('id', user.id).single()
  const plan = owner?.plan || 'free'
  const canAddMore = plan === 'pro' || (apartments?.length || 0) < 1
  ```
  And restore the conditional `+ Add apartment` / `Upgrade to Pro` button, plus the free plan banner at the bottom.

### Other launch tasks
- [ ] **Buy & verify domain** `checkinpack.hr` — point to Cloudflare Pages, verify in Resend
- [ ] **Switch email sender** from `onboarding@resend.dev` to `noreply@checkinpack.hr` (or similar)
- [ ] **Set all production secrets** in Cloudflare Pages dashboard (see env table above)
- [ ] **Stripe integration** — wire up pro plan payments (keys already in env, logic not yet built)
- [ ] **Test cron manually** — `npx wrangler dev` then `curl "http://localhost:8787/__scheduled?cron=0+8+*+*+*"`
- [ ] **eVisitor API** — automate tourist registration submission (currently manual)
- [ ] **Privacy policy & terms** pages (required for GDPR compliance)
