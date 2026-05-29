// Run with: node scripts/test-cron.mjs
// Tests cron functions directly — no wrangler needed.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Parse .dev.vars
const devVarsPath = path.join(__dirname, '..', '.dev.vars')
const env = {}
for (const line of fs.readFileSync(devVarsPath, 'utf-8').split('\n')) {
  const eq = line.indexOf('=')
  if (eq > 0) {
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim()
    if (key) env[key] = val
  }
}
// PUBLIC_SUPABASE_URL is in wrangler.toml [vars], not .dev.vars
env.PUBLIC_SUPABASE_URL = 'https://yrsxyfrwsaujwtnzamuf.supabase.co'

// Dynamically import Supabase and Resend (ESM)
const { createClient } = await import('@supabase/supabase-js')
const { Resend } = await import('resend')

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(env.RESEND_API_KEY)

// ── Health check ─────────────────────────────────────────────────────────────
console.log('\n=== eVisitor health check ===')
try {
  const res = await fetch('https://www.evisitor.hr', { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  console.log('✅ eVisitor is reachable')
} catch (err) {
  console.error('❌ eVisitor is DOWN:', err.message)
  if (env.ADMIN_ALERT_EMAIL) {
    await resend.emails.send({
      from: 'CheckinPack <onboarding@resend.dev>',
      to: env.ADMIN_ALERT_EMAIL,
      subject: `🚨 eVisitor is down — ${new Date().toISOString()}`,
      text: `eVisitor health check failed.\n\nError: ${err.message}`,
    })
    console.log('Alert email sent to', env.ADMIN_ALERT_EMAIL)
  }
}

// ── Pre-arrival emails ────────────────────────────────────────────────────────
console.log('\n=== Pre-arrival emails ===')
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
const tomorrowDate = tomorrow.toISOString().split('T')[0]
console.log('Looking for bookings arriving on:', tomorrowDate)

const { data: bookings, error } = await supabase
  .from('bookings')
  .select('*, apartments!inner(name)')
  .eq('arrival_date', tomorrowDate)
  .eq('pre_arrival_link_sent', false)
  .not('guest_email', 'is', null)

if (error) {
  console.error('❌ DB error:', error.message)
} else if (!bookings?.length) {
  console.log('ℹ️  No bookings to email for', tomorrowDate)
  console.log('   (Set a booking arrival_date to tomorrow in Supabase to test a real send)')
} else {
  console.log(`Found ${bookings.length} booking(s) to email`)
  for (const booking of bookings) {
    const url = `http://localhost:4321/register/${booking.pre_arrival_token}`
    const { error: emailError } = await resend.emails.send({
      from: 'CheckinPack <onboarding@resend.dev>',
      to: booking.guest_email,
      subject: `Pre-arrival registration for ${booking.apartments.name}`,
      html: `<p>Test email. Register here: <a href="${url}">${url}</a></p>`,
    })
    if (emailError) {
      console.error('❌ Email failed for', booking.id, emailError)
    } else {
      console.log('✅ Email sent to', booking.guest_email)
    }
  }
}

console.log('\nDone.')
