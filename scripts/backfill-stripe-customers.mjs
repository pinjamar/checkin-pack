// Run with: node scripts/backfill-stripe-customers.mjs
// Finds Stripe customers with supabase_user_id metadata and writes
// stripe_customer_id back to owners rows that are missing it.

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

console.log('Fetching all Stripe customers...')

const customers = []
for await (const customer of stripe.customers.list({ limit: 100 })) {
  customers.push(customer)
}
console.log(`Found ${customers.length} Stripe customer(s)`)

let fixed = 0
let skipped = 0
let errors = 0

for (const customer of customers) {
  const uid = customer.metadata?.supabase_user_id
  if (!uid) {
    console.log(`  ⚠️  customer=${customer.id} (${customer.email}) has no supabase_user_id metadata — skipping`)
    skipped++
    continue
  }

  const { data: owner, error: fetchErr } = await supabase
    .from('owners')
    .select('id, stripe_customer_id')
    .eq('id', uid)
    .single()

  if (fetchErr || !owner) {
    console.warn(`  ⚠️  No owners row for uid=${uid} (customer=${customer.id})`)
    errors++
    continue
  }

  if (owner.stripe_customer_id) {
    console.log(`  ℹ️  uid=${uid} already has stripe_customer_id=${owner.stripe_customer_id} — skipping`)
    skipped++
    continue
  }

  const { error: updateErr } = await supabase
    .from('owners')
    .update({ stripe_customer_id: customer.id })
    .eq('id', uid)

  if (updateErr) {
    console.error(`  ❌ Failed to update uid=${uid}:`, updateErr.message)
    errors++
  } else {
    console.log(`  ✅ uid=${uid} → stripe_customer_id=${customer.id}`)
    fixed++
  }
}

console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}, Errors: ${errors}`)

if (fixed > 0) {
  console.log('\nNow re-sync their subscriptions by triggering the webhook or running:')
  console.log('  node scripts/backfill-stripe-subscriptions.mjs')
}
