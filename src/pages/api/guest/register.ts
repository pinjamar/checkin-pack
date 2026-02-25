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

    // Find booking by token, include apartment for owner notification
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, departure_date, guest_name, apartments!inner(name, slug, owner_id)')
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

    const apartment = (booking as any).apartments

    // Auto-delete after 30 days from departure
    const autoDeleteAt = new Date(booking.departure_date)
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

    const guideUrl = `https://checkinpack.hr/m/${apartment.slug}`

    // Notify owner — silent fail so the guest always gets a success response
    try {
      const { data: { user: owner } } = await supabaseAdmin.auth.admin.getUserById(apartment.owner_id)
      if (owner?.email) {
        const { Resend } = await import('resend')
        const resend = new Resend(context.locals.runtime.env.RESEND_API_KEY)
        const guestDisplay = full_name || booking.guest_name || 'Your guest'
        await resend.emails.send({
          from: 'CheckinPack <noreply@checkinpack.hr>',
          to: owner.email,
          subject: `${guestDisplay} submitted their registration — ${apartment.name}`,
          html: `
            <h2>Registration received</h2>
            <p><strong>${guestDisplay}</strong> has submitted their pre-arrival registration for <strong>${apartment.name}</strong>.</p>
            <p>Log in to your dashboard to view the eVisitor data card and register them with eVisitor.</p>
            <p>
              <a href="https://checkinpack.hr/dashboard" style="display:inline-block;padding:12px 24px;background-color:#1a6b4a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">
                Open Dashboard
              </a>
            </p>
            <p style="color:#666;font-size:13px;">Their data will be automatically deleted 30 days after departure.</p>
          `,
        })
      }
    } catch {
      // Silent fail — registration is already saved
    }

    return new Response(JSON.stringify({ ok: true, guide_url: guideUrl }), { status: 201 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to submit registration' }), { status: 500 })
  }
}
