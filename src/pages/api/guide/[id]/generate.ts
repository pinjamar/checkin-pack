import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../../lib/supabase-server'
import { generateContent } from '../../../../lib/gemini'

async function getUser(cookies: any, serviceKey: string) {
  const supabase = getSupabaseAdmin(serviceKey)
  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) return null
  const { data: { user } } = await supabase.auth.getUser(accessToken)
  return user
}

export const POST: APIRoute = async (context) => {
  const { params, request, cookies } = context
  const env = context.locals.runtime.env

  const user = await getUser(cookies, env.SUPABASE_SERVICE_ROLE_KEY)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500 })

  const supabase = getSupabaseAdmin(env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: apartment } = await supabase
    .from('apartments')
    .select('name, address')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .single()

  if (!apartment) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

  const { section } = await request.json()

  try {
    if (section === 'house_rules') {
      const prompt = `You are helping a Croatian vacation rental owner write house rules for their apartment "${apartment.name}"${apartment.address ? ` at ${apartment.address}` : ''}.

Write a concise, friendly set of house rules in English. Include: no smoking indoors, quiet hours (23:00–07:00), trash separation, no parties, check-out instructions (strip beds, leave key). Keep it practical and polite — 6–8 bullet points, plain text, one rule per line starting with a dash.`

      const content = await generateContent(apiKey, prompt)
      return new Response(JSON.stringify({ content }), { status: 200 })
    }

    if (section === 'local_tips') {
      const location = apartment.address || apartment.name
      const prompt = `You are helping a Croatian vacation rental owner write local tips for guests staying at "${apartment.name}"${apartment.address ? ` (${apartment.address})` : ''}.

Return a JSON array of 6 local tips. Each tip must have:
- category: one of: restaurants, beaches, transport, shopping, activities, culture
- name: place name
- description: one sentence, practical and specific
- address: street address or area name (can be approximate)

Return ONLY valid JSON array, no markdown, no explanation. Example format:
[{"category":"restaurants","name":"Konoba Mornar","description":"Best fresh fish in town, ask for the catch of the day.","address":"Obala kralja Tomislava 12"},...]`

      const raw = await generateContent(apiKey, prompt)
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Invalid response from AI')
      const tips = JSON.parse(jsonMatch[0]).map((t: any) => ({
        id: crypto.randomUUID(),
        category: t.category || 'activities',
        name: t.name || '',
        description: t.description || '',
        address: t.address || '',
      }))
      return new Response(JSON.stringify({ tips }), { status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Generation failed' }), { status: 500 })
  }
}
