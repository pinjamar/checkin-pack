import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

async function getUser(cookies: any) {
  const supabaseAdmin = getSupabaseAdmin()
  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  return user
}

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const user = await getUser(cookies)
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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const user = await getUser(cookies)
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

    // Check plan limits for bookings this month
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('plan')
      .eq('id', user.id)
      .single()

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('apartment_id', apartment_id)
      .gte('created_at', startOfMonth.toISOString())

    const maxBookings = owner?.plan === 'pro' ? 999 : 3
    if ((count || 0) >= maxBookings) {
      return new Response(
        JSON.stringify({ error: 'Booking limit reached this month. Upgrade to Pro for unlimited bookings.' }),
        { status: 403 }
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
