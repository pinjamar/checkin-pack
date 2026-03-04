import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const { request } = context
  try {
    const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
    const body = await request.json()
    const { token, guests, gdpr_consent } = body

    if (!token || !guests?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }
    if (!gdpr_consent) {
      return new Response(JSON.stringify({ error: 'GDPR consent is required' }), { status: 400 })
    }
    for (const g of guests) {
      if (!g.full_name || !g.document_type || !g.document_number || !g.nationality || !g.date_of_birth) {
        return new Response(JSON.stringify({ error: 'All fields are required for each guest' }), { status: 400 })
      }
    }

    // Find booking by token
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, departure_date, guest_name, apartments!inner(name, slug, owner_id)')
      .eq('pre_arrival_token', token)
      .single()

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Invalid or expired registration link' }), { status: 404 })
    }

    const apartment = (booking as any).apartments
    const autoDeleteAt = new Date(booking.departure_date)
    autoDeleteAt.setDate(autoDeleteAt.getDate() + 30)

    const rows = guests.map((g: any) => ({
      booking_id: booking.id,
      full_name: g.full_name,
      document_type: g.document_type,
      document_number_encrypted: g.document_number,
      nationality: g.nationality,
      date_of_birth: g.date_of_birth,
      gdpr_consent: true,
      gdpr_consent_at: new Date().toISOString(),
      auto_delete_at: autoDeleteAt.toISOString(),
    }))

    const { error } = await supabaseAdmin.from('guest_registrations').insert(rows)
    if (error) throw error

    // Update booking status
    await supabaseAdmin
      .from('bookings')
      .update({ registration_status: 'completed' })
      .eq('id', booking.id)

    const guideUrl = `https://checkinpack.hr/m/${apartment.slug}`

    // Notify owner — silent fail
    try {
      const { data: { user: owner } } = await supabaseAdmin.auth.admin.getUserById(apartment.owner_id)
      if (owner?.email) {
        const { Resend } = await import('resend')
        const resend = new Resend(context.locals.runtime.env.RESEND_API_KEY)
        const firstName = guests[0].full_name || booking.guest_name || 'Your guest'
        const extra = guests.length > 1 ? ` +${guests.length - 1} more` : ''
        await resend.emails.send({
          from: 'CheckinPack <onboarding@resend.dev>',
          to: owner.email,
          subject: `${firstName}${extra} submitted registration — ${apartment.name}`,
          html: `
            <h2>Registration received</h2>
            <p><strong>${firstName}</strong>${guests.length > 1 ? ` and ${guests.length - 1} other guest(s)` : ''} submitted pre-arrival registration for <strong>${apartment.name}</strong>.</p>
            <p>Log in to your dashboard to view the eVisitor data and register them.</p>
            <p><a href="https://checkinpack.hr/dashboard" style="display:inline-block;padding:12px 24px;background-color:#1a6b4a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Open Dashboard</a></p>
            <p style="color:#666;font-size:13px;">Data will be automatically deleted 30 days after departure.</p>
          `,
        })
      }
    } catch {
      // Silent fail — registration already saved
    }

    return new Response(JSON.stringify({ ok: true, guide_url: guideUrl }), { status: 201 })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to submit registration' }), { status: 500 })
  }
}
