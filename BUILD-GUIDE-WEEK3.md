# CheckinPack.hr — Claude Code Prompt (Week 3: Stripe + Subscriptions)
# Paste everything below this line into Claude Code

---

## Current state

Weeks 1 and 2 are complete and deployed:
- ✅ Welcome guide + QR code
- ✅ Booking management
- ✅ Guest pre-arrival form
- ✅ eVisitor data card with copy buttons
- ✅ Playwright autofill (Cloudflare Worker)
- ✅ Auto pre-arrival email cron
- ✅ Checkout reminder cron
- ✅ eVisitor health check cron

Week 3 scope: Stripe subscriptions, plan gating, customer portal, iCal sync, dashboard stats, data cleanup cron.

---

## Pricing (already decided — do not change)

| Plan | Monthly | Annual | Features |
|---|---|---|---|
| Free | €0 | €0 | 1 apartment, 3 bookings/month, CheckinPack branding |
| Pro | €5/3mo | €20/yr | Unlimited everything, eVisitor autofill, AI features (Week 4), custom branding |

Annual (€20/yr) is the primary offer. The 3-month option (€5) exists as a low-risk trial — perfect for owners unsure about committing. Convert them to annual at renewal.

---

## PART 1: Stripe Setup

### Install packages
```bash
npm install stripe @stripe/stripe-js
```

### Create these products in your Stripe dashboard BEFORE building:
1. Product: "CheckinPack Pro" 
   - Price 1: €5.00 / 3 months recurring → copy the price ID → `STRIPE_PRICE_PRO_MONTHLY`
   - Price 2: €20.00/year recurring → copy the price ID → `STRIPE_PRICE_PRO_ANNUAL`

Add to `.env`:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
```

### `src/lib/stripe.ts`
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
})

export const PLANS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    max_apartments: 1,
    max_bookings_per_month: 3,
    features: [
      '1 apartman / 1 apartment',
      '3 rezervacije/mj / 3 bookings/mo',
      'Digitalni vodič / Digital guide',
      'QR kod / QR code',
      'CheckinPack branding',
    ]
  },
  pro: {
    name: 'Pro',
    price_monthly: 5,
    price_annual: 20,
    stripe_price_monthly: import.meta.env.STRIPE_PRICE_PRO_MONTHLY,
    stripe_price_annual: import.meta.env.STRIPE_PRICE_PRO_ANNUAL,
    max_apartments: 999,
    max_bookings_per_month: 999,
    features: [
      'Neograničeni apartmani / Unlimited apartments',
      'Neograničene rezervacije / Unlimited bookings',
      'eVisitor automatsko ispunjavanje / eVisitor autofill',
      'Automatski emailovi / Automated emails',
      'AI pisanje sadržaja / AI content writing (coming Week 4)',
      'Prilagođeni branding / Custom branding',
      'Podrška na hrvatskom / Croatian support',
    ]
  }
}
```

---

## PART 2: Database changes

### Migration: `supabase/migrations/003_subscriptions.sql`
```sql
alter table owners
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists plan text default 'free',
  add column if not exists plan_interval text,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

alter table bookings
  add column if not exists reminder_sent boolean default false;

create table if not exists ical_feeds (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid references apartments on delete cascade unique not null,
  feed_url text not null,
  last_synced_at timestamptz,
  sync_error text
);
alter table ical_feeds enable row level security;
create policy "Owners manage own ical feeds" on ical_feeds
  using (apartment_id in (select id from apartments where owner_id = auth.uid()));
```

---

## PART 3: Stripe Checkout

### `src/pages/api/stripe/create-checkout.ts`
POST — creates a Stripe Checkout session
Body: { price_id: string }
1. Get or create Stripe customer for this owner
2. Create checkout session
3. Return { url }

### `src/pages/api/stripe/customer-portal.ts`
POST — creates a Stripe Customer Portal session
Owner can cancel, upgrade, change payment method — all handled by Stripe
Never build cancel/upgrade UI yourself

---

## PART 4: Stripe Webhook

`src/pages/api/webhooks/stripe.ts`

Handle these events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.created`
- `customer.subscription.deleted` → set plan back to 'free'
- `invoice.payment_failed`

Register in Stripe dashboard:
- Endpoint: `https://checkinpack.pages.dev/api/webhooks/stripe`

---

## PART 5: Plan Gating

`src/lib/plan-limits.ts` — check apartment count + bookings this month against free limits
Apply to:
- `POST /api/apartments` — check can_add_apartment
- `POST /api/bookings` — check can_add_booking
- Return `{ error: 'PLAN_LIMIT' }` with 403 when limit hit

`src/components/dashboard/UpgradePrompt.tsx`:
- Props: { reason: string }
- Heading: "Nadogradite na Pro / Upgrade to Pro"
- Annual CTA (primary): "€20/godina"
- Monthly CTA (secondary): "ili €5/3mj"

---

## PART 6: iCal Sync

Install: `npm install node-ical`

`src/pages/api/ical/sync.ts` — fetch + parse iCal, create/update bookings
`src/pages/dashboard/apartment/[id]/settings.astro` — add iCal URL input

Add cron to wrangler.toml:
```toml
crons = [
  "0 8 * * *",
  "0 18 * * *",
  "0 6 * * *",   # iCal sync
  "0 2 * * 0",   # weekly data cleanup
]
```

---

## PART 7: Dashboard Stats

Top of dashboard/index.astro:
- total_apartments, active_bookings, pending_registrations, total_scans_this_month
- "Today" section: arrivals, departures, pending registrations

---

## PART 8: Data Cleanup Cron

Weekly Sunday 02:00 UTC — delete guest_registrations where auto_delete_at < now()

---

## PART 9: Pricing Page

`src/pages/pricing.astro`
- Two cards: Free vs Pro
- Annual (€20/yr) is primary CTA
- Monthly (€5/3mo) is secondary
- FAQ section

---

## PART 10: Settings billing section

Current plan display + "Manage subscription" → customer portal

---

## Build order this session

1. 003_subscriptions.sql migration
2. src/lib/stripe.ts
3. create-checkout.ts
4. customer-portal.ts
5. webhooks/stripe.ts — test with Stripe CLI before continuing
6. plan-limits.ts + apply gating
7. UpgradePrompt.tsx
8. Dashboard stats + Today section
9. pricing.astro
10. iCal sync
11. Data cleanup cron
12. Billing section in settings

---

## Testing checklist

- [ ] Free account limited to 1 apartment, 3 bookings
- [ ] Upgrade prompt appears at limit
- [ ] Stripe Checkout opens in Croatian
- [ ] Test payment (4242 4242 4242 4242)
- [ ] Webhook → owners.plan = 'pro'
- [ ] Customer portal opens from settings
- [ ] Cancel → plan reverts to free
- [ ] iCal URL syncs bookings
- [ ] Dashboard stats correct

Use `stripe listen --forward-to localhost:4321/api/webhooks/stripe` for local webhook testing.

---

## Cloudflare Pages env vars to add

```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL
PUBLIC_SITE_URL=https://checkinpack.pages.dev
```
