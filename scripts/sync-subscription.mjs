// Run with: node scripts/sync-subscription.mjs
// Manually syncs all active Stripe subscriptions to the owners table.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
env.PUBLIC_SUPABASE_URL = 'https://yrsxyfrwsaujwtnzamuf.supabase.co'

const { createClient } = await import('@supabase/supabase-js')
const { default: Stripe } = await import('stripe')

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' })

console.log('Fetching active subscriptions from Stripe...')

const subscriptions = []
for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.items.data.price', 'data.latest_invoice'] })) {
  subscriptions.push(sub)
}
console.log(`Found ${subscriptions.length} active subscription(s)\n`)

for (const sub of subscriptions) {
  const customerId = sub.customer
  const price = sub.items.data[0].price
  const interval = price.recurring?.interval ?? 'month'
  const intervalCount = price.recurring?.interval_count ?? 1
  const planInterval = interval === 'year' ? 'year' : intervalCount === 3 ? '3month' : 'month'
  const periodEnd = sub.current_period_end || sub.billing?.current_period?.end || sub.latest_invoice?.period_end || 0

  console.log(`Syncing subscription ${sub.id} for customer ${customerId}`)
  console.log(`  plan=pro  interval=${planInterval}  expires=${new Date(periodEnd * 1000).toISOString()}`)

  const { error } = await supabase
    .from('owners')
    .update({
      plan: 'pro',
      plan_interval: planInterval,
      stripe_subscription_id: sub.id,
      plan_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error(`  ❌ DB update failed:`, error.message)
  } else {
    console.log(`  ✅ Done`)
  }
}

console.log('\nDone.')
