# To Be Done

## Before using eVisitor autofill — one-time DB migration

Run this in Supabase dashboard → SQL Editor:
```sql
ALTER TABLE owners
ADD COLUMN IF NOT EXISTS evisitor_username text,
ADD COLUMN IF NOT EXISTS evisitor_password text;
```

Then go to **Settings → eVisitor prijava** in the dashboard and enter your credentials once.
After that, the autofill script picks them up automatically from Supabase.

---

## Running the autofill

1. Add the booking ID to `.dev.vars`:
   ```
   AUTOFILL_BOOKING_ID=your-booking-uuid
   ```
2. Run:
   ```powershell
   npm run test:autofill
   ```
3. A real browser opens, logs into evisitor.hr, and fills the form.
4. **Do not close the browser** — review the filled form and click "Prijavi" manually.

Fields that need manual attention after autofill:
- **Spol (gender)** — not collected by guest form, must be set manually
- **Grad boravišta / rođenja** — not collected, left blank
- **Vrijeme dolaska/odlaska** — left blank

---

## Already done

- eVisitor data card with per-field copy buttons + "Kopiraj sve" (copy all)
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
