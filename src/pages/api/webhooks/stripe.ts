import type { APIRoute } from 'astro'
import type Stripe from 'stripe'
import { getStripe } from '../../../lib/stripe'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const { request } = context
  const serviceKey = context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY
  const stripeKey = context.locals.runtime.env.STRIPE_SECRET_KEY
  const webhookSecret = context.locals.runtime.env.STRIPE_WEBHOOK_SECRET

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) return new Response('No signature', { status: 400 })

  const stripe = getStripe(stripeKey)
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = getSupabaseAdmin(serviceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          await syncSubscription(stripe, supabase, session.subscription as string)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await syncSubscription(stripe, supabase, sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('owners')
          .update({ plan: 'free', plan_interval: null, plan_expires_at: null, stripe_subscription_id: null })
          .eq('stripe_customer_id', sub.customer as string)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.warn('Payment failed for customer:', invoice.customer)
        break
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err.message)
    return new Response('Handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

async function syncSubscription(stripe: Stripe, supabase: ReturnType<typeof getSupabaseAdmin>, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  }) as any

  const customerId = sub.customer as string
  const price = sub.items.data[0].price
  const interval: string = price.recurring?.interval ?? 'month'
  const intervalCount: number = price.recurring?.interval_count ?? 1
  const planInterval = interval === 'year' ? 'year' : intervalCount === 3 ? '3month' : 'month'
  const isActive = sub.status === 'active' || sub.status === 'trialing'
  const periodEnd = sub.current_period_end ?? sub.billing?.current_period?.end ?? 0

  await supabase
    .from('owners')
    .update({
      plan: isActive ? 'pro' : 'free',
      plan_interval: planInterval,
      stripe_subscription_id: sub.id,
      plan_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('stripe_customer_id', customerId)
}

// Need raw body — tell Astro not to pre-parse
export const config = { bodyParser: false }
