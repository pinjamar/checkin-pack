import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

export const PATCH: APIRoute = async (context) => {
  const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
  const accessToken = context.cookies.get('sb-access-token')?.value
  if (!accessToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Verify owner via registration → booking → apartment chain
  const { data: reg } = await supabaseAdmin
    .from('guest_registrations')
    .select('*, bookings!inner(apartments!inner(owner_id))')
    .eq('id', context.params.id)
    .single()

  if (!reg || (reg as any).bookings.apartments.owner_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }

  const body = await context.request.json()

  const { error } = await supabaseAdmin
    .from('guest_registrations')
    .update({
      full_name: body.full_name,
      document_type: body.document_type,
      document_number_encrypted: body.document_number,
      nationality: body.nationality,
      date_of_birth: body.date_of_birth,
      gender: body.gender || null,
      country_of_birth: body.country_of_birth || null,
      country_of_residence: body.country_of_residence || null,
      city_of_residence: body.city_of_residence || null,
    })
    .eq('id', context.params.id)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
