import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase'

export const POST: APIRoute = async ({ params, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get booking with apartment check
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('*, apartments!inner(owner_id, name)')
      .eq('id', params.id)
      .single()

    if (!booking || (booking as any).apartments.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    if (!booking.guest_email) {
      return new Response(JSON.stringify({ error: 'Guest email is required' }), { status: 400 })
    }

    // Send email via Resend
    const { Resend } = await import('resend')
    const resend = new Resend(import.meta.env.RESEND_API_KEY)

    const registrationUrl = `${new URL('/register/' + booking.pre_arrival_token, 'https://checkinpack.hr').href}`

    await resend.emails.send({
      from: 'CheckinPack <noreply@checkinpack.hr>',
      to: booking.guest_email,
      subject: `Pre-arrival registration for ${(booking as any).apartments.name}`,
      html: `
        <h2>Welcome!</h2>
        <p>Your host has invited you to complete your pre-arrival registration for <strong>${(booking as any).apartments.name}</strong>.</p>
        <p>Please fill out the form before your arrival on <strong>${booking.arrival_date}</strong>:</p>
        <p><a href="${registrationUrl}" style="display:inline-block;padding:12px 24px;background-color:#1a6b4a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Complete Registration</a></p>
        <p style="color:#666;font-size:14px;">This is required by Croatian law for all tourist guests.</p>
      `,
    })

    // Mark as sent
    await supabaseAdmin
      .from('bookings')
      .update({
        pre_arrival_link_sent: true,
        registration_status: 'sent',
      })
      .eq('id', params.id)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to send link' }), { status: 500 })
  }
}
