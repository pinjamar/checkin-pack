import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../lib/supabase-server'

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { apartment_id, device_type } = await request.json()

    await supabaseAdmin.from('scan_events').insert({
      apartment_id,
      device_type: device_type || null,
    })

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to log scan' }), { status: 500 })
  }
}
