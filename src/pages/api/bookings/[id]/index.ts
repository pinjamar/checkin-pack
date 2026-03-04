import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../../lib/supabase-server'

async function getAuthedBooking(context: any) {
  const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
  const accessToken = context.cookies.get('sb-access-token')?.value
  if (!accessToken) return { error: 'Unauthorized', status: 401, supabaseAdmin, user: null, booking: null }

  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  if (!user) return { error: 'Unauthorized', status: 401, supabaseAdmin, user: null, booking: null }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*, apartments!inner(owner_id)')
    .eq('id', context.params.id)
    .single()

  if (!booking || (booking as any).apartments.owner_id !== user.id) {
    return { error: 'Not found', status: 404, supabaseAdmin, user, booking: null }
  }

  return { error: null, status: 200, supabaseAdmin, user, booking }
}

export const DELETE: APIRoute = async (context) => {
  try {
    const { error, status, supabaseAdmin } = await getAuthedBooking(context)
    if (error) return new Response(JSON.stringify({ error }), { status })

    await supabaseAdmin.from('bookings').delete().eq('id', context.params.id)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}

export const PATCH: APIRoute = async (context) => {
  try {
    const { error, status, supabaseAdmin } = await getAuthedBooking(context)
    if (error) return new Response(JSON.stringify({ error }), { status })

    const body = await context.request.json()
    const { guest_name, guest_email, arrival_date, departure_date } = body

    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ guest_name, guest_email, arrival_date, departure_date })
      .eq('id', context.params.id)
      .select()
      .single()

    if (updateError) throw updateError
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
