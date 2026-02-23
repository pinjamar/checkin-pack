import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const { request } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const body = await request.json()
    const {
      token,
      full_name,
      document_type,
      document_number,
      nationality,
      date_of_birth,
      gdpr_consent,
    } = body

    if (!token || !full_name || !document_type || !document_number || !nationality || !date_of_birth) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400 })
    }

    if (!gdpr_consent) {
      return new Response(JSON.stringify({ error: 'GDPR consent is required' }), { status: 400 })
    }

    // Find booking by token
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('pre_arrival_token', token)
      .single()

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Invalid or expired registration link' }), { status: 404 })
    }

    // Check if already registered
    const { data: existing } = await supabaseAdmin
      .from('guest_registrations')
      .select('id')
      .eq('booking_id', booking.id)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Registration already submitted' }), { status: 409 })
    }

    // Auto-delete after 30 days from departure
    const { data: bookingFull } = await supabaseAdmin
      .from('bookings')
      .select('departure_date')
      .eq('id', booking.id)
      .single()

    const autoDeleteAt = new Date(bookingFull!.departure_date)
    autoDeleteAt.setDate(autoDeleteAt.getDate() + 30)

    const { error } = await supabaseAdmin.from('guest_registrations').insert({
      booking_id: booking.id,
      full_name,
      document_type,
      document_number_encrypted: document_number, // TODO: encrypt with pgcrypto
      nationality,
      date_of_birth,
      gdpr_consent: true,
      gdpr_consent_at: new Date().toISOString(),
      auto_delete_at: autoDeleteAt.toISOString(),
    })

    if (error) throw error

    // Update booking status
    await supabaseAdmin
      .from('bookings')
      .update({ registration_status: 'completed' })
      .eq('id', booking.id)

    return new Response(JSON.stringify({ ok: true }), { status: 201 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to submit registration' }), { status: 500 })
  }
}
