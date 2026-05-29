# To Be Done

## Next session — eVisitor Playwright autofill

### Step 1: Run selector inspector (you do this)
Set your eVisitor credentials and run:
```powershell
$env:EVISITOR_USERNAME="your-username"
$env:EVISITOR_PASSWORD="your-password"
npm run test:evisitor
```
This logs into evisitor.hr, takes screenshots, and dumps all form selectors to:
- `tests/evisitor/output/login-page-selectors.json`
- `tests/evisitor/output/registration-form-selectors.json`

Share `registration-form-selectors.json` and screenshots with Claude.

### Step 2: Build autofill script (Claude builds this)
Once selectors are known, Claude builds `tests/evisitor/evisitor-autofill.spec.ts`:
- Reads guest data from a booking (passed as env vars or JSON)
- Logs into evisitor.hr
- Fills all registration form fields automatically
- Screenshots each step for verification

### Step 3: Owner credentials settings page (Claude builds this)
A page at `/dashboard/settings` (already exists but empty) where the owner stores their
eVisitor username and password securely — encrypted in Supabase, retrieved at autofill runtime.

---

## Already done (this session)
- eVisitor data card with per-field copy buttons + "Kopiraj sve" (copy all)
- Mobile layout fix on RegistrationCard
- Cron emails: pre-arrival link + checkout reminder (tested, email confirmed)
- Health check: pings evisitor.hr, alerts ADMIN_ALERT_EMAIL if down (tested, email confirmed)
- Playwright setup: config, test files, eVisitor selector inspector ready to run
- wrangler.toml: fixed entry point to `dist/_worker.js/index.js`
- scripts/test-cron.mjs: test cron functions locally without wrangler

## Before launch
See README.md → Before launch checklist.
