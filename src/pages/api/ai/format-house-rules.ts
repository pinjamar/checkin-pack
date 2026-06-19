import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'
import { generateContent } from '../../../lib/gemini'
import { requireProPlan } from '../../../lib/plan-limits'

async function getUser(cookies: any, serviceKey: string) {
  const supabase = getSupabaseAdmin(serviceKey)
  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) return null
  const { data: { user } } = await supabase.auth.getUser(accessToken)
  return user
}

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context
  const env = context.locals.runtime.env

  const user = await getUser(cookies, env.SUPABASE_SERVICE_ROLE_KEY)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const isPro = await requireProPlan(user.id, env.SUPABASE_SERVICE_ROLE_KEY)
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'PLAN_LIMIT', message: 'AI features require Pro plan' }), { status: 403 })
  }

  const apiKey = env.GEMINI_API_KEY as string | undefined
  if (!apiKey) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500 })

  const { raw_rules } = await request.json()
  if (!raw_rules?.trim()) {
    return new Response(JSON.stringify({ error: 'No rules provided' }), { status: 400 })
  }

  const prompt = `You are formatting house rules for a Croatian holiday apartment's digital welcome guide.

The owner wrote these rules in their own words (may be in Croatian, English, or mixed, possibly with grammar issues):
"""
${raw_rules}
"""

Reformat them into:
1. Clear, friendly, guest-appropriate language
2. A numbered list, most important rules first (check-in/out times, noise, smoking, pets if mentioned)
3. Output in BOTH Croatian and English, clearly separated with headers "## Kućni red" and "## House Rules"
4. Keep the same rules and meaning — do not invent new rules
5. Keep it concise — guests skim, they don't read paragraphs
6. Friendly but clear tone — not overly formal, not casual either

Output only the formatted rules, no preamble or explanation.`

  try {
    const formatted_rules = await generateContent(apiKey, prompt)
    return new Response(JSON.stringify({ formatted_rules }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'AI generation failed' }), { status: 500 })
  }
}
