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
