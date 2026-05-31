# To Be Done

## HIGH PRIORITY — Sequential copy mode (free, no server)

Build a "field-by-field" copy mode in RegistrationCard:
- Button: "Kopiraj polje po polje" — starts the sequence
- Automatically copies field 1 to clipboard, highlights it, shows "1/7 — zalijepite u eVisitor pa kliknite Dalje"
- Owner pastes into eVisitor, clicks "Dalje" (or keyboard shortcut)
- Card copies field 2, advances counter, repeat until all 7 fields done
- Solves the tab-switching problem without any server

Why "Copy All" doesn't work: clipboard holds one value at a time. Pasting a multi-line block into a form field just dumps everything into that one field.

---

## FUTURE (requires Cloudflare Workers Paid, ~$5/month) — Production autofill

When on paid Cloudflare plan:
- Add `[browser]` binding to `wrangler.toml`
- Install `@cloudflare/puppeteer`
- Build `src/pages/api/bookings/[id]/autofill.ts` — launches headless browser, logs into eVisitor, fills all fields, returns screenshot
- Add "Autofill eVisitor" button to RegistrationCard → owner sees screenshot → clicks Prijavi themselves
- The local Playwright script (`npm run test:autofill`) already has the exact logic to port — same selectors, same flow, just wrapped in a Cloudflare Worker instead of running locally

Infrastructure: same Cloudflare Pages project, just add the browser binding. No separate server needed.

---

## Before using local autofill — one-time DB migration

Run this in Supabase dashboard → SQL Editor:
```sql
ALTER TABLE owners
ADD COLUMN IF NOT EXISTS evisitor_username text,
ADD COLUMN IF NOT EXISTS evisitor_password text;
```

Then go to **Settings → eVisitor prijava** and enter credentials. The local script picks them up from Supabase automatically.

---

## Running the local autofill (developer only)

1. Add booking ID to `.dev.vars`: `AUTOFILL_BOOKING_ID=your-booking-uuid`
2. Run: `npm run test:autofill`
3. Browser opens, fills eVisitor — review **Spol** (gender) manually, then click **Prijavi**
4. Back in dashboard → click **Označi kao registrirano**

---

## Already done

- eVisitor data card with per-field copy + sequential copy mode (Kopiraj polje po polje)
- Mobile layout fix on RegistrationCard
- Cron emails: pre-arrival link + checkout reminder (tested, email confirmed)
- Health check: pings evisitor.hr, alerts ADMIN_ALERT_EMAIL if down (tested, email confirmed)
- Playwright selector inspector (`npm run test:evisitor`) — confirmed working
- `tests/evisitor/evisitor-autofill.spec.ts` — fills eVisitor form from Supabase booking data
- `npm run test:autofill` script in package.json
- Settings page (`/dashboard/settings`) — eVisitor credentials section with save form
- `src/pages/api/owner/evisitor-credentials.ts` — GET/PUT API for credentials
- `src/components/dashboard/EvisitorCredentialsForm.tsx` — React form component
- wrangler.toml: fixed entry point to `dist/_worker.js/index.js`
- scripts/test-cron.mjs: test cron functions locally without wrangler

## Before launch
See README.md → Before launch checklist.
