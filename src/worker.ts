import { sendScheduledPreArrivalEmails, sendCheckoutReminders, checkEvisitorHealth } from './lib/cron'

// This file is the Cloudflare Worker entrypoint.
// The @astrojs/cloudflare adapter merges Astro's fetch handler with these exports.
// Only define handlers that Astro doesn't own — the fetch handler is injected automatically.

interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string
  RESEND_API_KEY: string
  PUBLIC_SUPABASE_URL: string
  ADMIN_ALERT_EMAIL: string
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // "0 8 * * *"  — 08:00 UTC = 10:00 Croatian (summer): pre-arrival emails + morning health check
    // "0 18 * * *" — 18:00 UTC = 20:00 Croatian (summer): checkout reminders + evening health check
    if (event.cron === '0 8 * * *') {
      ctx.waitUntil(
        Promise.all([
          sendScheduledPreArrivalEmails(env),
          checkEvisitorHealth(env),
        ])
      )
    } else if (event.cron === '0 18 * * *') {
      ctx.waitUntil(
        Promise.all([
          sendCheckoutReminders(env),
          checkEvisitorHealth(env),
        ])
      )
    }
  },
}
