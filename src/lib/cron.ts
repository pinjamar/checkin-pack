import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

interface CronEnv {
  SUPABASE_SERVICE_ROLE_KEY: string
  RESEND_API_KEY: string
  PUBLIC_SUPABASE_URL: string
  ADMIN_ALERT_EMAIL: string
}

export async function sendScheduledPreArrivalEmails(env: CronEnv) {
  const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Compute tomorrow's date in Croatian time (UTC+2 in summer).
  // The cron fires at 08:00 UTC = 10:00 Zagreb time, so `now` is already
  // well past midnight locally — adding 24 h gives us tomorrow locally too.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const tomorrowDate = tomorrow.toISOString().split('T')[0] // "YYYY-MM-DD"

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, apartments!inner(name)')
    .eq('arrival_date', tomorrowDate)
    .eq('pre_arrival_link_sent', false)
    .not('guest_email', 'is', null)

  if (error) {
    console.error('Cron: failed to query bookings:', error)
    return
  }

  if (!bookings?.length) {
    console.log(`Cron: no pre-arrival emails to send for ${tomorrowDate}`)
    return
  }

  const resend = new Resend(env.RESEND_API_KEY)

  for (const booking of bookings) {
    try {
      const registrationUrl = `https://checkinpack.hr/register/${booking.pre_arrival_token}`

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

      await supabase
        .from('bookings')
        .update({ pre_arrival_link_sent: true, registration_status: 'sent' })
        .eq('id', booking.id)

      console.log(`Cron: sent pre-arrival email for booking ${booking.id}`)
    } catch (err) {
      // Log and continue — don't let one failure block the rest
      console.error(`Cron: failed for booking ${booking.id}:`, err)
    }
  }
}

// Step 6: Checkout reminder — runs daily at 18:00 UTC (20:00 Croatian time)
// Sends a reminder to guests departing tomorrow
export async function sendCheckoutReminders(env: CronEnv) {
  const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const tomorrowDate = tomorrow.toISOString().split('T')[0]

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, apartments!inner(name, slug, guide_content(checkout_time))')
    .eq('departure_date', tomorrowDate)
    .eq('checkout_reminder_sent', false)
    .not('guest_email', 'is', null)

  if (error) {
    console.error('Cron: failed to query checkout reminders:', error)
    return
  }

  if (!bookings?.length) {
    console.log(`Cron: no checkout reminders to send for ${tomorrowDate}`)
    return
  }

  const resend = new Resend(env.RESEND_API_KEY)

  for (const booking of bookings) {
    try {
      const apartment = (booking as any).apartments
      const checkoutTime = apartment.guide_content?.checkout_time || '11:00'
      const guideUrl = `https://checkinpack.hr/m/${apartment.slug}`

      await resend.emails.send({
        from: 'CheckinPack <noreply@checkinpack.hr>',
        to: booking.guest_email,
        subject: `Podsjetnik za odjavu / Checkout reminder — ${apartment.name}`,
        html: `
          <h2>${apartment.name}</h2>
          <p><strong>HR:</strong> Dragi gosti, podsjećamo vas da je odjava sutra u <strong>${checkoutTime}</strong>. Hvala što ste boravili kod nas!</p>
          <p><strong>EN:</strong> Dear guests, this is a reminder that checkout is tomorrow at <strong>${checkoutTime}</strong>. Thank you for staying with us!</p>
          <p style="margin-top:20px;">
            <a href="${guideUrl}" style="display:inline-block;padding:12px 24px;background-color:#1a6b4a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">View welcome guide</a>
          </p>
        `,
      })

      await supabase
        .from('bookings')
        .update({ checkout_reminder_sent: true })
        .eq('id', booking.id)

      console.log(`Cron: sent checkout reminder for booking ${booking.id}`)
    } catch (err) {
      console.error(`Cron: checkout reminder failed for booking ${booking.id}:`, err)
    }
  }
}

// Step 7: eVisitor health check — simple HTTP ping
// Alerts developer if evisitor.hr is unreachable
export async function checkEvisitorHealth(env: CronEnv) {
  try {
    const res = await fetch('https://www.evisitor.hr', {
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    console.log('Cron: eVisitor health check OK')
  } catch (err: any) {
    console.error('Cron: eVisitor is down —', err.message)

    // Alert developer
    if (env.ADMIN_ALERT_EMAIL && env.RESEND_API_KEY) {
      try {
        const resend = new Resend(env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'CheckinPack <noreply@checkinpack.hr>',
          to: env.ADMIN_ALERT_EMAIL,
          subject: `🚨 eVisitor is down — ${new Date().toISOString()}`,
          text: `eVisitor health check failed.\n\nError: ${err.message}\nTime: ${new Date().toISOString()}\n\nCheck https://www.evisitor.hr immediately.`,
        })
      } catch {
        // Can't send alert — log only
      }
    }
  }
}
