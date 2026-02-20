import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase'

async function getUser(cookies: any) {
  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  return user
}

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const user = await getUser(cookies)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Verify apartment ownership
    const { data: apartment } = await supabaseAdmin
      .from('apartments')
      .select('id')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single()

    if (!apartment) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    const { data: guide, error } = await supabaseAdmin
      .from('guide_content')
      .select('*')
      .eq('apartment_id', params.id)
      .single()

    if (error) throw error

    return new Response(JSON.stringify(guide), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch guide' }), { status: 500 })
  }
}

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const user = await getUser(cookies)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Verify apartment ownership
    const { data: apartment } = await supabaseAdmin
      .from('apartments')
      .select('id')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single()

    if (!apartment) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    const body = await request.json()

    const { data: guide, error } = await supabaseAdmin
      .from('guide_content')
      .update({
        wifi_name: body.wifi_name,
        wifi_password: body.wifi_password,
        checkin_time: body.checkin_time,
        checkout_time: body.checkout_time,
        house_rules: body.house_rules,
        local_tips: body.local_tips,
        emergency_contacts: body.emergency_contacts,
        custom_sections: body.custom_sections,
        updated_at: new Date().toISOString(),
      })
      .eq('apartment_id', params.id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(guide), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to update guide' }), { status: 500 })
  }
}
