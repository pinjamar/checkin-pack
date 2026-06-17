import type { APIRoute } from 'astro'
import { getStripe } from '../../../lib/stripe'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const { cookies } = context
  const serviceKey = context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY
  const stripeKey = context.locals.runtime.env.STRIPE_SECRET_KEY
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || new URL(context.request.url).origin

  try {
    const accessToken = cookies.get('sb-access-token')?.value
    if (!accessToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const supabase = getSupabaseAdmin(serviceKey)
    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { data: owner } = await supabase
      .from('owners')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!owner?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404 })
    }

    const stripe = getStripe(stripeKey)
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: owner.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/settings`,
    })

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('customer-portal error:', err.message)
    return new Response(JSON.stringify({ error: 'Failed to create portal session' }), { status: 500 })
  }
}
