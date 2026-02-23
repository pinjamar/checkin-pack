import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

async function getUser(cookies: any, serviceKey: string) {
  const supabaseAdmin = getSupabaseAdmin(serviceKey)
  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  return user
}

export const GET: APIRoute = async (context) => {
  const { params, cookies } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const user = await getUser(cookies, context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: apartment, error } = await supabaseAdmin
      .from('apartments')
      .select('*')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single()

    if (error || !apartment) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(apartment), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch apartment' }), { status: 500 })
  }
}

export const PUT: APIRoute = async (context) => {
  const { params, request, cookies } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const user = await getUser(cookies, context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await request.json()

    const { data: apartment, error } = await supabaseAdmin
      .from('apartments')
      .update({
        name: body.name,
        address: body.address,
        cover_image_url: body.cover_image_url,
        is_active: body.is_active,
      })
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(apartment), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to update apartment' }), { status: 500 })
  }
}

export const DELETE: APIRoute = async (context) => {
  const { params, cookies } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const user = await getUser(cookies, context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('apartments')
      .delete()
      .eq('id', params.id)
      .eq('owner_id', user.id)

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to delete apartment' }), { status: 500 })
  }
}
