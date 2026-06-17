import type { APIRoute } from 'astro'
import { getStripe } from '../../../lib/stripe'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context
  const serviceKey = context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY
  const stripeKey = context.locals.runtime.env.STRIPE_SECRET_KEY
  const stripePriceMonthly = context.locals.runtime.env.STRIPE_PRICE_PRO_MONTHLY
  const stripePriceAnnual = context.locals.runtime.env.STRIPE_PRICE_PRO_ANNUAL
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin

  try {
    const accessToken = cookies.get('sb-access-token')?.value
    if (!accessToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const supabase = getSupabaseAdmin(serviceKey)
    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { interval } = await request.json() as { interval: 'annual' | '3month' }
    const priceId = interval === 'annual' ? stripePriceAnnual : stripePriceMonthly

    if (!priceId) return new Response(JSON.stringify({ error: 'Price not configured' }), { status: 500 })

    const stripe = getStripe(stripeKey)

    const { data: owner } = await supabase
      .from('owners')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    let customerId = owner?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: owner?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('owners').upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: 'id' })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId as string,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?upgraded=true`,
      cancel_url: `${siteUrl}/pricing?cancelled=true`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    } as any)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('create-checkout error:', err.message)
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), { status: 500 })
  }
}
