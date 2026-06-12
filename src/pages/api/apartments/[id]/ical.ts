import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const { request, cookies, params } = context
  const serviceKey = context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const accessToken = cookies.get('sb-access-token')?.value
    if (!accessToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const supabase = getSupabaseAdmin(serviceKey)
    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { id } = params
    const { feed_url } = await request.json() as { feed_url: string }

    // Verify ownership
    const { data: apartment } = await supabase
      .from('apartments')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single()

    if (!apartment) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const { error } = await supabase.from('ical_feeds').upsert(
      { apartment_id: id, feed_url, sync_error: null },
      { onConflict: 'apartment_id' }
    )

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to save iCal feed' }), { status: 500 })
  }
}
