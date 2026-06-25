import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
// @ts-ignore
import ICAL from 'ical.js'
import { generateContent } from './gemini'

interface CronEnv {
  SUPABASE_SERVICE_ROLE_KEY: string
  RESEND_API_KEY: string
  PUBLIC_SUPABASE_URL: string
  ADMIN_ALERT_EMAIL: string
  GEMINI_API_KEY?: string
  SITE_URL?: string
}

function getSeason(dateStr: string): 'peak' | 'shoulder' | 'off' {
  const month = new Date(dateStr).getUTCMonth() + 1 // 1-12
  if (month >= 6 && month <= 8) return 'peak'
  if (month === 5 || month === 9 || month === 10) return 'shoulder'
  return 'off'
}

async function getReviewNudge(booking: any, env: CronEnv): Promise<string> {
  if (!env.GEMINI_API_KEY) return ''
  const isPro = (booking.apartments as any)?.owners?.plan === 'pro'
  if (!isPro) return ''

  const nights = booking.arrival_date && booking.departure_date
    ? Math.round((new Date(booking.departure_date).getTime() - new Date(booking.arrival_date).getTime()) / 86400000)
    : null

  const prompt = `Write ONE short, warm, natural sentence (max 25 words) asking a guest to leave a review, for the end of a checkout reminder email.

Context: Guest ${booking.guest_name || ''} stayed ${nights ?? 'a few'} nights during ${getSeason(booking.departure_date)} season.

Write in BOTH Croatian and English, separated by " / ".
Do not sound salesy or desperate. Make it feel like a genuine, casual request from a host who cares.
Do not mention specific platform names (Booking.com, Airbnb) — just say "review" generically.

Output only the sentence, nothing else.`

  try {
    const nudge = await generateContent(env.GEMINI_API_KEY, prompt)
    return nudge.trim()
  } catch {
    return ''
  }
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
      const siteUrl = env.SITE_URL || 'https://checkin-pack.pages.dev'
      const registrationUrl = `${siteUrl}/register/${booking.pre_arrival_token}`

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
    .select('*, apartments!inner(name, slug, owner_id, guide_content(checkout_time), owners(plan))')
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
      const guideUrl = `${env.SITE_URL || 'https://checkin-pack.pages.dev'}/m/${apartment.slug}`
      const nudge = await getReviewNudge(booking, env)

      await resend.emails.send({
        from: 'CheckinPack <noreply@checkinpack.hr>',
        to: booking.guest_email,
        subject: `Podsjetnik za odjavu / Checkout reminder — ${apartment.name}`,
        html: `
          <h2>${apartment.name}</h2>
          <p><strong>HR:</strong> Dragi gosti, podsjećamo vas da je odjava sutra u <strong>${checkoutTime}</strong>. Hvala što ste boravili kod nas!</p>
          <p><strong>EN:</strong> Dear guests, this is a reminder that checkout is tomorrow at <strong>${checkoutTime}</strong>. Thank you for staying with us!</p>
          ${nudge ? `<p style="color:#555;font-style:italic;">${nudge}</p>` : ''}
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

// iCal sync — runs daily at 06:00 UTC, fetches all feeds and creates/updates bookings
export async function syncIcalFeeds(env: CronEnv) {
  const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: feeds, error } = await supabase
    .from('ical_feeds')
    .select('*, apartments!inner(id)')

  if (error || !feeds?.length) {
    console.log('Cron: no iCal feeds to sync')
    return
  }

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.feed_url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const icalText = await res.text()

      const parsed = ICAL.parse(icalText)
      const component = new ICAL.Component(parsed)
      const vevents: any[] = component.getAllSubcomponents('vevent')

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent)
        const arrival = event.startDate?.toJSDate()
        const departure = event.endDate?.toJSDate()
        if (!arrival || !departure) continue

        const arrivalStr = arrival.toISOString().split('T')[0]
        const departureStr = departure.toISOString().split('T')[0]

        const { data: existing } = await supabase
          .from('bookings')
          .select('id, departure_date')
          .eq('apartment_id', feed.apartment_id)
          .eq('arrival_date', arrivalStr)
          .maybeSingle()

        if (!existing) {
          await supabase.from('bookings').insert({
            apartment_id: feed.apartment_id,
            arrival_date: arrivalStr,
            departure_date: departureStr,
            guest_name: event.summary || null,
            registration_status: 'pending',
          })
        } else if (existing.departure_date !== departureStr) {
          await supabase.from('bookings').update({ departure_date: departureStr }).eq('id', existing.id)
        }
      }

      await supabase.from('ical_feeds').update({ last_synced_at: new Date().toISOString(), sync_error: null }).eq('id', feed.id)
      console.log(`Cron: iCal synced for apartment ${feed.apartment_id}`)
    } catch (err: any) {
      console.error(`Cron: iCal sync failed for ${feed.apartment_id}:`, err.message)
      await supabase.from('ical_feeds').update({ sync_error: err.message }).eq('id', feed.id)
    }
  }
}

// Data cleanup — runs weekly Sunday 02:00 UTC
// Deletes guest_registrations where auto_delete_at has passed
export async function cleanupExpiredRegistrations(env: CronEnv) {
  const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('guest_registrations')
    .delete()
    .lt('auto_delete_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('Cron: cleanup failed:', error.message)
    return
  }

  console.log(`Cron: deleted ${data?.length ?? 0} expired registrations`)
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
