# CheckinPack.hr — Claude Code Prompt (Week 4: AI Features)

---

## Current state

Weeks 1–3 are complete and deployed:
- ✅ Welcome guide + QR code + booking management
- ✅ eVisitor data card + Playwright autofill
- ✅ Pre-arrival emails, checkout reminders, health check crons
- ✅ Stripe subscriptions (€5/3mo trial, €20/year) with plan gating
- ✅ iCal sync from Booking.com/Airbnb
- ✅ Dashboard stats + Today view

**Partially built in last commit (before this week started):**
- ✅ `src/lib/gemini.ts` — Gemini helper exists but with a different signature than this guide uses (takes `apiKey` param instead of reading from env). Reconcile before using.
- ✅ `src/pages/api/guide/[id]/generate.ts` — generates house rules and local tips *from scratch* based on apartment name/address. This is a *generator*, not a *formatter* — different from Part 1 below.
- ✅ AI buttons wired in `GuideEditor.tsx` for the generator above.
- ❌ **Build is broken** — `@google/generative-ai` was imported but not saved to `package.json`. Fix first: `npm install @google/generative-ai --save`

Week 4 scope: AI-powered content generation for Pro subscribers — house rules formatter, welcome message generator, review nudge in checkout reminders. These features are the main reason a Free user upgrades.

---

## Build priority order (build in exactly this sequence)

1. **Fix build** — add missing npm dependency
2. **House Rules Formatter** — smallest scope, ships fast, immediately visible value
3. **Welcome Message Generator** — highest perceived value, drives upgrades
4. **Review Nudge** — smallest addition, builds on existing checkout reminder
5. **Upgrade Prompts** — locks the features for Free users
6. **Landing Page** — surface the new AI selling point

---

## STEP 0: Fix the broken build

```bash
npm install @google/generative-ai --save
```

Then update `src/lib/gemini.ts` to match the signature used by all AI endpoints in this guide:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateContent(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}
```

All API routes pass `env.GEMINI_API_KEY` explicitly — the key never touches the client.

Add to Cloudflare Pages env vars (dashboard → Settings → Variables):
```
GEMINI_API_KEY=your_key_here
```

Get a key at https://aistudio.google.com/app/apikey — free tier is generous for early-stage usage.

---

## PART 1: House Rules Formatter

**What it does:** Owner writes rules in their own words (Croatian, English, or mixed, possibly messy). AI reformats them into clean bilingual output. Different from the existing generator which *invents* rules from scratch.

### `src/lib/plan-limits.ts` — add `requireProPlan`

```typescript
import { getSupabaseAdmin } from './supabase-server'

export async function requireProPlan(ownerId: string, serviceKey: string): Promise<boolean> {
  const supabase = getSupabaseAdmin(serviceKey)
  const { data } = await supabase
    .from('owners')
    .select('plan')
    .eq('id', ownerId)
    .single()
  return data?.plan === 'pro'
}
```

### `src/pages/api/ai/format-house-rules.ts`

```typescript
import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'
import { generateContent } from '../../../lib/gemini'
import { requireProPlan } from '../../../lib/plan-limits'

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const env = locals.runtime.env
  const supabase = getSupabaseAdmin(env.SUPABASE_SERVICE_ROLE_KEY)

  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) return new Response('Unauthorized', { status: 401 })
  const { data: { user } } = await supabase.auth.getUser(accessToken)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const isPro = await requireProPlan(user.id, env.SUPABASE_SERVICE_ROLE_KEY)
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'PLAN_LIMIT', message: 'AI features require Pro plan' }), { status: 403 })
  }

  const { raw_rules } = await request.json()
  if (!raw_rules?.trim()) {
    return new Response(JSON.stringify({ error: 'No rules provided' }), { status: 400 })
  }

  const prompt = `You are formatting house rules for a Croatian holiday apartment's digital welcome guide.

The owner wrote these rules in their own words (may be Croatian, English, or mixed, possibly with grammar issues):
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
    const formatted = await generateContent(env.GEMINI_API_KEY, prompt)
    return new Response(JSON.stringify({ formatted_rules: formatted }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
```

### Frontend — update `GuideEditor.tsx` house rules section

Add a "✨ Poboljšaj s AI / Format with AI" button top-right of the house rules textarea.

Behaviour:
1. Loading state: "AI piše... / AI formatting..."
2. POST raw textarea content to `/api/ai/format-house-rules`
3. On success: show formatted result in a preview box below the textarea
4. Two buttons under preview: **"Koristi ovo / Use this"** (replaces textarea) and **"Odbaci / Discard"** (closes preview, keeps original)
5. On 403: show `<UpgradePrompt feature="ai_house_rules" />`
6. On other error: show friendly error, never lose the original text

Design: small sparkle icon (✨), subtle accent colour, positioned so it doesn't interfere with typing.

**Stop here and confirm it works end-to-end before continuing to Part 2.**

---

## PART 2: Welcome Message Generator

### Database migration — run in Supabase SQL Editor

```sql
alter table guide_content
  add column if not exists ai_welcome_message text,
  add column if not exists ai_welcome_tone text default 'warm';
-- tone options: 'warm' | 'professional' | 'minimal'
```

### `src/pages/api/ai/generate-welcome.ts`

```typescript
import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'
import { generateContent } from '../../../lib/gemini'
import { requireProPlan } from '../../../lib/plan-limits'

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const env = locals.runtime.env
  const supabase = getSupabaseAdmin(env.SUPABASE_SERVICE_ROLE_KEY)

  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) return new Response('Unauthorized', { status: 401 })
  const { data: { user } } = await supabase.auth.getUser(accessToken)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const isPro = await requireProPlan(user.id, env.SUPABASE_SERVICE_ROLE_KEY)
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'PLAN_LIMIT' }), { status: 403 })
  }

  const { apartment_name, location, apartment_type, tone, house_rules_summary, local_tips_summary } = await request.json()

  const toneDescriptions: Record<string, string> = {
    warm: 'warm, personal, like a friend welcoming you to their home',
    professional: 'professional and polished, like a boutique hotel',
    minimal: 'short, clean, no fluff — just the essentials with a friendly touch',
  }

  const prompt = `Write a welcome message for guests arriving at a Croatian holiday rental.

Property: ${apartment_name}
Location: ${location || 'Croatia'}
Type: ${apartment_type || 'apartment'}
Tone: ${toneDescriptions[tone] ?? toneDescriptions.warm}

Key house rules to mention briefly: ${house_rules_summary || 'standard check-in/out times'}
Local tips to weave in naturally: ${local_tips_summary || 'general Croatian coastal hospitality'}

Write TWO versions:
1. Croatian version, under heading "## Dobrodošli"
2. English version, under heading "## Welcome"

Requirements:
- Maximum 150 words per language
- Make the guest feel genuinely welcomed, not like reading a manual
- Mention 1–2 local tips naturally within the welcome (not as a list)
- End with an invitation to reach out if they need anything
- Do not repeat the full house rules — just set a warm tone
- No generic phrases like "we hope you have a wonderful stay" — be specific to this property and location

Output only the two welcome messages, no preamble.`

  try {
    const welcome_message = await generateContent(env.GEMINI_API_KEY, prompt)
    return new Response(JSON.stringify({ welcome_message }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
```

### `src/components/guide-editor/WelcomeMessageGenerator.tsx` (new component)

New collapsible section in the guide editor: "AI Dobrodošlica / AI Welcome Message"

Fields:
- Tone selector: 3 buttons — **Topla / Warm**, **Profesionalna / Professional**, **Minimalna / Minimal**
- "Generiraj / Generate" button
- Loading state while generating
- Editable textarea showing generated message after generation
- "Spremi / Save" → saves to `guide_content.ai_welcome_message` via existing guide save flow
- "Regeneriraj / Regenerate" → calls API again, replaces preview

If owner already has a saved welcome message, show it pre-filled with options to regenerate or edit manually.

### Update `src/components/guest/WelcomeGuide.tsx`

If `guide_content.ai_welcome_message` exists, show it at the very top of the guide — above the WiFi section. Style as a warm intro card: soft background colour, slightly larger text, personal note feel.

If no AI welcome message, fall back to current behaviour (apartment name as heading).

---

## PART 3: Review Nudge in Checkout Reminder

**What it does:** Adds one naturally-worded sentence to the existing checkout reminder email asking for a review. Pro owners only. Fails silently — email always sends regardless.

### `src/pages/api/ai/review-nudge.ts`

Called by the Cloudflare Worker, not by users directly. Auth via `WORKER_SECRET`.

```typescript
import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'
import { generateContent } from '../../../lib/gemini'

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env

  // Worker-to-app auth — not a user session
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
    return new Response(JSON.stringify({ nudge: '' }), { headers: { 'Content-Type': 'application/json' } })
  }

  const prompt = `Write ONE short, warm, natural sentence (max 25 words) asking a guest to leave a review, for the end of a checkout reminder email.

Context: Guest ${guest_name || ''} stayed ${length_of_stay || 'a few'} nights during ${season || 'the'} season.

Write in BOTH Croatian and English, separated by " / ".
Do not sound salesy or desperate. Make it feel like a genuine, casual request from a host who cares.
Do not mention specific platform names (Booking.com, Airbnb) — just say "review" generically.

Output only the sentence, nothing else.`

  try {
    const nudge = await generateContent(env.GEMINI_API_KEY, prompt)
    return new Response(JSON.stringify({ nudge: nudge.trim() }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch {
    // Fail silently — checkout reminder still sends without the nudge
    return new Response(JSON.stringify({ nudge: '' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

### Update the Worker: `src/lib/cron.ts` — checkout reminder function

Before sending the checkout reminder email, call the review-nudge endpoint:

```typescript
async function getReviewNudge(booking: any, env: any): Promise<string> {
  try {
    const res = await fetch(`${env.APP_URL}/api/ai/review-nudge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WORKER_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apartment_id: booking.apartment_id,
        guest_name: booking.guest_name,
        length_of_stay: booking.length_of_stay_nights,
        season: 'peak', // TODO: derive from date
      }),
    })
    if (!res.ok) return ''
    const { nudge } = await res.json() as { nudge: string }
    return nudge
  } catch {
    return '' // Never let this break the email
  }
}
```

Call `getReviewNudge()` in `sendCheckoutReminderEmail`, append result to email body before signature.

Add to `.dev.vars` and Cloudflare Pages env vars:
```
WORKER_SECRET=some_random_secret_string
APP_URL=https://checkinpack.pages.dev
```

---

## PART 4: Upgrade Prompts

Update `src/components/dashboard/UpgradePrompt.tsx` — add a `feature` prop:

```typescript
type AIFeature = 'ai_house_rules' | 'ai_welcome' | 'ai_review_nudge' | 'general'

interface Props {
  feature?: AIFeature
}

const FEATURE_COPY: Record<AIFeature, { hr: string; en: string }> = {
  ai_house_rules: { hr: 'AI formatiranje kućnog reda', en: 'AI house rules formatting' },
  ai_welcome:     { hr: 'AI generator dobrodošlice', en: 'AI welcome message generator' },
  ai_review_nudge:{ hr: 'AI podsjetnik za recenziju', en: 'AI review nudge' },
  general:        { hr: 'AI značajke', en: 'AI features' },
}

// Display:
// "🔒 [feature name] je Pro značajka"
// "Vaši gosti misle da imate osobnog asistenta. / Your guests will think you have a full-time hospitality manager."
// CTA: "Nadogradi za €20/godina" → triggers Stripe checkout (annual price)
```

---

## PART 5: Landing Page AI Section

Add a new section to `src/pages/index.astro` after the core features — this is now a major selling point.

```
Heading: "AI piše umjesto vas / AI writes for you"

Three cards:
1. ✨ "Pametni kućni red / Smart house rules"
   "Napišite pravila kako god znate, AI ih pretvara u jasan, dvojezični vodič."

2. 💬 "Personalizirana dobrodošlica / Personalized welcome"
   "AI piše topli pozdrav prilagođen vašem apartmanu, na hrvatskom i engleskom."

3. ⭐ "Pametan podsjetnik za recenziju / Smart review nudge"
   "Prirodan, nenametljiv poziv gostima da ostave recenziju nakon odjave."

Below: "Dostupno na Pro planu / Available on Pro plan — €20/godina"
```

---

## Build order this session

1. `npm install @google/generative-ai --save` → fix build
2. Reconcile `src/lib/gemini.ts` to use the signature in this guide
3. `requireProPlan()` in `src/lib/plan-limits.ts`
4. `src/pages/api/ai/format-house-rules.ts`
5. AI format button in `GuideEditor.tsx` — **test end-to-end before continuing**
6. DB migration — `ai_welcome_message`, `ai_welcome_tone`
7. `src/pages/api/ai/generate-welcome.ts`
8. `WelcomeMessageGenerator.tsx` component
9. Update `WelcomeGuide.tsx` to display AI welcome message on public guide
10. `src/pages/api/ai/review-nudge.ts`
11. Update `src/lib/cron.ts` checkout reminder to call review-nudge
12. Update `UpgradePrompt.tsx` with feature prop
13. Landing page AI section

---

## Testing checklist

- [ ] Build passes on Cloudflare Pages (no more missing dependency)
- [ ] Free user sees locked AI buttons with upgrade prompts; AI calls return 403
- [ ] Pro user can format house rules — output is sensible Croatian + English
- [ ] Pro user can generate welcome message in all 3 tones (warm, professional, minimal)
- [ ] Generated welcome message shows at top of public guide page
- [ ] Checkout reminder includes review nudge for Pro users, omits it for Free
- [ ] If Gemini API fails, checkout reminder still sends (graceful degradation)
- [ ] GEMINI_API_KEY never appears in any browser DevTools network request

---

## Constraints

- All Gemini calls server-side only — verify in browser DevTools that no API key leaks to the client
- Every AI feature must fail gracefully — never break a core flow (especially checkout reminders)
- Keep prompts focused — don't let AI invent rules or facts not provided by the owner
- Bilingual output (HR + EN) required for all guest-facing AI text
- The existing `/api/guide/[id]/generate` endpoint (generates from scratch) coexists with the new `/api/ai/` endpoints (formats/personalises existing content) — they are different features, keep both

---

## Cloudflare Pages env vars to add

```
GEMINI_API_KEY
WORKER_SECRET
APP_URL=https://checkinpack.pages.dev
```
