import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'
import { generateContent } from '../../../lib/gemini'

export const POST: APIRoute = async (context) => {
  const { request } = context
  const env = context.locals.runtime.env

  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${env.WORKER_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { apartment_id, guest_name, length_of_stay, season } = await request.json()

  const supabase = getSupabaseAdmin(env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: apartment } = await supabase
    .from('apartments')
    .select('owner_id, owners(plan)')
    .eq('id', apartment_id)
    .single()

  const isPro = (apartment?.owners as any)?.plan === 'pro'
  if (!isPro) {
    return new Response(JSON.stringify({ nudge: '' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = env.GEMINI_API_KEY as string | undefined
  if (!apiKey) {
    return new Response(JSON.stringify({ nudge: '' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const prompt = `Write ONE short, warm, natural sentence (max 25 words) asking a guest to leave a review, for the end of a checkout reminder email.

Context: Guest ${guest_name || ''} stayed ${length_of_stay || 'a few'} nights during ${season || 'the'} season.

Write in BOTH Croatian and English, separated by " / ".
Do not sound salesy or desperate. Make it feel like a genuine, casual request from a host who cares.
Do not mention specific platform names (Booking.com, Airbnb) — just say "review" generically.

Output only the sentence, nothing else.`

  try {
    const nudge = await generateContent(apiKey, prompt)
    return new Response(JSON.stringify({ nudge: nudge.trim() }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ nudge: '' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
