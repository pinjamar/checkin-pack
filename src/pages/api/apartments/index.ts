import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase'

export const GET: APIRoute = async ({ cookies }) => {
  try {
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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check plan limits
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('plan')
      .eq('id', user.id)
      .single()

    const { count } = await supabaseAdmin
      .from('apartments')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    const maxApartments = owner?.plan === 'pro' ? 999 : 1
    if ((count || 0) >= maxApartments) {
      return new Response(
        JSON.stringify({ error: 'Apartment limit reached. Upgrade to Pro for unlimited apartments.' }),
        { status: 403 }
      )
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
