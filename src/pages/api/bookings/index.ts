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
  const { url, cookies } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const user = await getUser(cookies, context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const apartmentId = url.searchParams.get('apartment_id')
    if (!apartmentId) {
      return new Response(JSON.stringify({ error: 'apartment_id required' }), { status: 400 })
    }

    // Verify apartment ownership
    const { data: apartment } = await supabaseAdmin
      .from('apartments')
      .select('id')
      .eq('id', apartmentId)
      .eq('owner_id', user.id)
      .single()

    if (!apartment) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('apartment_id', apartmentId)
      .order('arrival_date', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify(bookings), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch bookings' }), { status: 500 })
  }
}

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const user = await getUser(cookies, context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await request.json()
    const { apartment_id, guest_name, guest_email, arrival_date, departure_date } = body

    if (!apartment_id || !arrival_date || !departure_date) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // Verify apartment ownership
    const { data: apartment } = await supabaseAdmin
      .from('apartments')
      .select('id, owner_id')
      .eq('id', apartment_id)
      .eq('owner_id', user.id)
      .single()

    if (!apartment) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    // Check for overlapping bookings
    const { count: overlapping } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('apartment_id', apartment_id)
      .lt('arrival_date', departure_date)
      .gt('departure_date', arrival_date)

    if ((overlapping || 0) > 0) {
      return new Response(
        JSON.stringify({ error: 'Apartment is already booked during these dates.' }),
        { status: 409 }
      )
    }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        apartment_id,
        guest_name: guest_name || null,
        guest_email: guest_email || null,
        arrival_date,
        departure_date,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(booking), { status: 201 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to create booking' }), { status: 500 })
  }
}
