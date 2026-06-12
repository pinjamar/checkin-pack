import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'
// @ts-ignore — ical.js has no bundled type declarations
import ICAL from 'ical.js'

export const POST: APIRoute = async (context) => {
  const { request } = context
  const serviceKey = context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const { apartment_id } = await request.json() as { apartment_id: string }
    if (!apartment_id) return new Response(JSON.stringify({ error: 'apartment_id required' }), { status: 400 })

    const supabase = getSupabaseAdmin(serviceKey)

    const { data: feed } = await supabase
      .from('ical_feeds')
      .select('*')
      .eq('apartment_id', apartment_id)
      .single()

    if (!feed) return new Response(JSON.stringify({ error: 'No iCal feed for this apartment' }), { status: 404 })

    let icalText: string
    try {
      const res = await fetch(feed.feed_url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      icalText = await res.text()
    } catch (err: any) {
      await supabase.from('ical_feeds').update({ sync_error: err.message }).eq('id', feed.id)
      return new Response(JSON.stringify({ error: `Failed to fetch feed: ${err.message}` }), { status: 502 })
    }

    const parsed = ICAL.parse(icalText)
    const component = new ICAL.Component(parsed)
    const vevents: any[] = component.getAllSubcomponents('vevent')

    let created = 0
    let updated = 0

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent)
      const arrival = event.startDate?.toJSDate()
      const departure = event.endDate?.toJSDate()
      if (!arrival || !departure) continue

      const arrivalStr = arrival.toISOString().split('T')[0]
      const departureStr = departure.toISOString().split('T')[0]
      const guestName = event.summary || null

      // Check if booking already exists for these exact dates
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, arrival_date, departure_date')
        .eq('apartment_id', apartment_id)
        .eq('arrival_date', arrivalStr)
        .maybeSingle()

      if (existing) {
        if (existing.departure_date !== departureStr) {
          await supabase.from('bookings').update({ departure_date: departureStr }).eq('id', existing.id)
          updated++
        }
      } else {
        await supabase.from('bookings').insert({
          apartment_id,
          arrival_date: arrivalStr,
          departure_date: departureStr,
          guest_name: guestName,
          registration_status: 'pending',
        })
        created++
      }
    }

    await supabase.from('ical_feeds').update({ last_synced_at: new Date().toISOString(), sync_error: null }).eq('id', feed.id)

    return new Response(JSON.stringify({ synced: vevents.length, created, updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('iCal sync error:', err.message)
    return new Response(JSON.stringify({ error: 'Sync failed' }), { status: 500 })
  }
}
