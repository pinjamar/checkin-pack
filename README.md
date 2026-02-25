# checkin-pack

Astro + Cloudflare Workers + Supabase app for managing short-term rental check-ins (Croatian legal compliance).

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start local dev server at `localhost:4321`  |
| `npm run build`   | Build to `./dist/`                          |
| `npm run preview` | Preview build locally                       |

## Environment variables

Copy `.env.example` to `.env` and fill in values. For local Cloudflare Worker simulation, also fill in `.dev.vars`.

| Variable                  | Where to get it                        |
| :------------------------ | :------------------------------------- |
| `PUBLIC_SUPABASE_URL`     | Supabase project → Settings → API     |
| `PUBLIC_SUPABASE_ANON_KEY`| Supabase project → Settings → API     |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API   |
| `RESEND_API_KEY`          | resend.com → API Keys                  |
| `STRIPE_SECRET_KEY`       | dashboard.stripe.com → Developers     |
| `STRIPE_WEBHOOK_SECRET`   | Stripe → Webhooks → signing secret     |

For production, set secrets via:
```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Cron

The Cloudflare Worker runs a daily cron at **08:00 UTC (10:00 Croatian time)**.
It sends pre-arrival emails to guests arriving the next day (`arrival_date = tomorrow`, `pre_arrival_link_sent = false`).
Configured in `wrangler.toml` → `[triggers]`.

## TODO

- [ ] **Resend setup** — create account at resend.com, add & verify domain `checkinpack.hr`, get API key, set via `npx wrangler secret put RESEND_API_KEY`
- [ ] **Stripe integration** — wire up pro plan payments (keys already in env, logic not yet connected)
- [ ] **Deploy to Cloudflare Workers** — run `npx wrangler deploy` after build
- [ ] **Test cron manually** — `npx wrangler dev` then `curl http://localhost:8787/__scheduled?cron=0+8+*+*+*`
