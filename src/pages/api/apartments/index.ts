import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

export const GET: APIRoute = async (context) => {
  const { cookies } = context
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

    const { data: apartments, error } = await supabaseAdmin
      .from('apartments')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify(apartments), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch apartments' }), { status: 500 })
  }
}

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context
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


const body = await request.json()
    const { name, address } = body

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 6)

    const { data: apartment, error } = await supabaseAdmin
      .from('apartments')
      .insert({
        owner_id: user.id,
        name,
        slug,
        address: address || null,
      })
      .select()
      .single()

    if (error) throw error

    // Create empty guide content
    await supabaseAdmin.from('guide_content').insert({
      apartment_id: apartment.id,
    })

    return new Response(JSON.stringify(apartment), { status: 201 })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to create apartment' }), { status: 500 })
  }
}
