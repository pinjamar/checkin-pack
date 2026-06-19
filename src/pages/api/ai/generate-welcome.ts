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
    return new Response(JSON.stringify({ error: 'PLAN_LIMIT' }), { status: 403 })
  }

  const apiKey = env.GEMINI_API_KEY as string | undefined
  if (!apiKey) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500 })

  const { apartment_name, location, tone, house_rules_summary, local_tips_summary } = await request.json()

  const toneDescriptions: Record<string, string> = {
    warm: 'warm, personal, like a friend welcoming you to their home',
    professional: 'professional and polished, like a boutique hotel',
    minimal: 'short, clean, no fluff — just the essentials with a friendly touch',
  }

  const prompt = `Write a welcome message for guests arriving at a Croatian holiday rental.

Property: ${apartment_name || 'Croatian holiday apartment'}
Location: ${location || 'Croatia'}
Tone: ${toneDescriptions[tone] ?? toneDescriptions.warm}

Key house rules to mention briefly: ${house_rules_summary || 'standard check-in/out times'}
Local tips to weave in naturally: ${local_tips_summary || 'general Croatian coastal hospitality'}

Write TWO versions:
1. Croatian version, under heading "## Dobrodošli"
2. English version, under heading "## Welcome"

Requirements:
- Maximum 150 words per language
- Make the guest feel genuinely welcomed, not like reading a manual
- Mention 1-2 local tips naturally within the welcome (not as a list)
- End with an invitation to reach out if they need anything
- Do not repeat the full house rules — just set a warm tone
- No generic phrases like "we hope you have a wonderful stay" — be specific to this property and location

Output only the two welcome messages, no preamble.`

  try {
    const welcome_message = await generateContent(apiKey, prompt)
    return new Response(JSON.stringify({ welcome_message }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'AI generation failed' }), { status: 500 })
  }
}
