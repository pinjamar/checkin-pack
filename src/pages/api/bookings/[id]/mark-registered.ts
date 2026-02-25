import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const { params, cookies } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const accessToken = cookies.get('sb-access-token')?.value
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Verify ownership
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('*, apartments!inner(owner_id)')
      .eq('id', params.id)
      .single()

    if (!booking || (booking as any).apartments.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    await supabaseAdmin
      .from('bookings')
      .update({ registration_status: 'registered' })
      .eq('id', params.id)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to update status' }), { status: 500 })
  }
}
