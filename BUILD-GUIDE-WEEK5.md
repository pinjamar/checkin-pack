# CheckinPack.hr — Claude Code Prompt (Week 5: Landing Page + Launch)

---

## Current state

Weeks 1-4 are complete:
- ✅ Welcome guide + QR + booking management + eVisitor data card + Playwright autofill
- ✅ Pre-arrival emails, checkout reminders, health check crons, iCal sync
- ✅ Stripe subscriptions (€5/3mo, €20/year) with plan gating
- ✅ AI features: house rules formatter, welcome message generator, review nudge

Week 5 is the final week before launch — landing page, pricing page, mobile QA, onboarding flow, and launch prep. No new backend features this week. This week is about making everything you've built presentable and bulletproof.

---

## PART 1: Landing Page

### `src/pages/index.astro` — full rebuild

Structure, top to bottom:

```
1. HERO
   Headline: "Vaš digitalni check-in asistent / Your digital check-in assistant"
   Subheadline: "Zamijenite laminiranu A4 i kaos s eVisitor prijavama. 
   Gosti dobivaju digitalni vodič, vi dobivate prijavu spremnu za eVisitor 
   u 2 minute, AI piše umjesto vas."
   CTA button: "Počnite besplatno / Start free" → /signup
   Secondary CTA: "Pogledajte demo / See demo" → scrolls to demo section
   Hero visual: phone mockup showing the welcome guide on mobile

2. PAIN POINTS (3 cards)
   Card 1 — 📱 "Gosti zovu u 22h za WiFi šifru"
            "Guests call at 10pm for the WiFi password"
   Card 2 — 📋 "eVisitor prijava traje 10 minuta po gostu"
            "eVisitor registration takes 10 minutes per guest"  
   Card 3 — ✍️ "Pišete isti odgovor gostima svaki put"
            "You write the same answers to guests every time"

3. SOLUTION (how it works — 3 steps)
   Step 1 — "Postavite vodič jednom / Set up your guide once"
   Step 2 — "Gost ispuni obrazac prije dolaska / Guest fills form before arrival"
   Step 3 — "Vi kopirate u eVisitor u 2 minute / You copy to eVisitor in 2 minutes"
   Visual: simple 3-icon horizontal flow

4. FEATURES GRID (6 cards, 2x3 or 3x2)
   - 📱 Digitalni vodič za goste / Digital guest guide
   - 📋 eVisitor podaci spremni za kopiranje / eVisitor data ready to copy
   - 🤖 Playwright auto-fill (Pro)
   - ✉️ Automatski emailovi / Automated emails
   - 📅 Sinkronizacija s Booking.com i Airbnb / Sync with Booking.com & Airbnb
   - ✨ AI piše dobrodošlicu i kućni red / AI writes welcome & house rules (Pro)

5. AI SECTION (from Week 4 — keep this, it's a differentiator)
   Heading: "AI piše umjesto vas / AI writes for you"
   3 feature cards: Smart house rules, Personalized welcome, Smart review nudge

6. PRICING PREVIEW (condensed — full pricing on /pricing)
   Two cards side by side: Free vs Pro
   CTA: "Pogledajte sve planove / See all plans" → /pricing

7. SOCIAL PROOF (if you have any testimonials yet — even 1-2 from your test owners)
   If none yet: skip this section entirely, don't fake testimonials

8. FAQ (5-6 questions)
   - "Je li ovo zamjena za Booking.com/Airbnb?" → "Ne, radi zajedno s njima."
   - "Trebam li tehničko znanje?" → "Ne, postavljanje traje 10 minuta."
   - "Što je s eVisitor prijavom?" → explain briefly
   - "Mogu li otkazati?" → "Da, bilo kada."
   - "Jesu li podaci gostiju sigurni?" → "Kriptirani i brisani 30 dana nakon odlaska."

9. FINAL CTA
   "Spremni za jednostavniji check-in? / Ready for simpler check-in?"
   Button: "Počnite besplatno / Start free"

10. FOOTER
    Logo, tagline, links to /pricing, /login, /signup
    "Made in Croatia 🇭🇷" — this is a genuine trust signal for your target market
```

### Design direction
- Color: warm green (#1a6b4a) primary, cream/white background — consistent with the guide page
- Typography: clean, modern, generous whitespace — not cluttered
- Mobile-first: most owners will see this on their phone first via a WhatsApp link
- Bilingual throughout: Croatian first, English second, in smaller/lighter text — your primary market is Croatian owners
- Use real screenshots of the actual product where possible, not generic stock photos

---

## PART 2: Pricing Page

### `src/pages/pricing.astro`

```
Heading: "Jedna cijena, sve uključeno / One price, everything included"

Two plan cards:

FREE
- "Besplatno / Free"
- "€0"
- Feature list:
  ✓ 1 apartman / 1 apartment
  ✓ 3 rezervacije mjesečno / 3 bookings/month
  ✓ Digitalni vodič / Digital guide
  ✓ QR kod / QR code
  ✗ eVisitor automatizacija / eVisitor automation
  ✗ AI značajke / AI features
- CTA: "Počnite besplatno / Start free" → /signup

PRO (highlighted with border/badge "Najpopularniji / Most popular")
- "Pro"
- "€20 / godina" (large, primary)
- "ili €5 / 3 mjeseca" (smaller, secondary, below)
- Feature list:
  ✓ Neograničeni apartmani / Unlimited apartments
  ✓ Neograničene rezervacije / Unlimited bookings
  ✓ eVisitor podaci spremni za kopiranje / eVisitor data ready to copy
  ✓ Playwright auto-fill
  ✓ Automatski emailovi i podsjetnici / Automated emails & reminders
  ✓ Sinkronizacija s Booking.com/Airbnb / Calendar sync
  ✓ AI generator dobrodošlice / AI welcome generator
  ✓ AI formatiranje kućnog reda / AI house rules formatter
  ✓ Prilagođeni branding / Custom branding
- CTA primary: "Počnite s godišnjim / Start annual" → Stripe checkout (annual price)
- CTA secondary (text link, smaller): "Ili probajte 3 mjeseca za €5 / Or try 3 months for €5"

Below both cards:
- "Sve cijene uključuju PDV / All prices include VAT" (verify your actual VAT obligations — see Part 5 below)

FAQ section (reuse from landing page or expand):
- "Mogu li promijeniti plan kasnije?" → "Da, bilo kada iz postavki."
- "Što se događa ako otkažem?" → "Vraćate se na besplatni plan, podaci ostaju."
- "Prihvaćate li kartice iz Hrvatske?" → "Da, sve glavne kartice putem Stripe-a."
```

---

## PART 3: Mobile QA Checklist

Go through every single flow on an actual phone — not browser dev tools mobile view, an actual phone. Test on both iPhone (Safari) and Android (Chrome) if you have access to both; if not, prioritize whichever your target owners use most (likely a mix, so test at least one thoroughly).

### Flows to test on mobile:
```
[ ] Landing page — loads fast, readable, CTAs are tappable (44px minimum touch targets)
[ ] Signup flow — form fields don't trigger weird zoom on iOS, keyboard doesn't cover submit button
[ ] Login flow — same checks
[ ] Dashboard — sidebar/nav works on small screen (hamburger menu if needed)
[ ] Create apartment — form is usable, photo upload works from phone camera/gallery
[ ] Guide editor — text areas are usable, AI buttons are tappable and clearly visible
[ ] QR download — PNG downloads correctly on mobile browser
[ ] Public guide page /m/[slug] — THIS IS THE MOST IMPORTANT ONE
    [ ] Loads fast on 4G (test with throttled connection if possible)
    [ ] WiFi password is tap-to-copy and actually works
    [ ] All sections are readable without horizontal scrolling
    [ ] Emergency contacts are tap-to-call
    [ ] AI welcome message displays properly if set
[ ] Guest registration form /register/[token]
    [ ] Date picker works well on mobile (native picker, not custom JS that's clunky)
    [ ] Dropdown selects (nationality, document type) are usable
    [ ] GDPR checkbox is clearly tappable, not tiny
    [ ] Form submits successfully, confirmation shows
[ ] eVisitor data card — copy buttons work on mobile Safari specifically 
    (navigator.clipboard.writeText can be finicky on iOS — test thoroughly)
[ ] Pricing page — cards stack properly on narrow screens, CTAs are clear
[ ] Stripe checkout — opens properly, completes on mobile
[ ] Email rendering — open the actual emails sent (pre-arrival, checkout reminder) 
    on a mobile email client (Gmail app, Apple Mail) — HTML emails often break on mobile
```

### Fix anything broken before moving to Part 4. This is not optional — most of your owners and all guests will be on mobile.

---

## PART 4: Onboarding Flow

First-time experience for a brand new owner — this determines whether they actually finish setup or abandon halfway.

### `src/components/onboarding/OnboardingWizard.tsx`

Trigger: show this automatically the first time an owner logs in with zero apartments.

```
Step 1/4 — Welcome
"Dobrodošli u CheckinPack! / Welcome to CheckinPack!"
"Postavimo vaš prvi apartman u 4 koraka. / Let's set up your first apartment in 4 steps."
[Započni / Get started]

Step 2/4 — Apartment basics
- Name field
- Address field
- Cover photo upload (optional, can skip)
[Dalje / Next]

Step 3/4 — Welcome guide essentials
- WiFi name + password
- Check-in/checkout times
- One house rule (just to get started — they can add more later)
[Dalje / Next]

Step 4/4 — Done
"Spremno! / All set!"
Show the generated QR code immediately
"Preuzmite QR kod i postavite ga u apartmanu. / Download the QR code and place it in your apartment."
[Preuzmi QR / Download QR] [Idi na dashboard / Go to dashboard]
```

Requirements:
- Progress indicator at top (Step X of 4)
- Allow going back to previous steps
- Don't force every field — only name, address, and WiFi are required; everything else can be added later
- After completing, owner lands on their apartment's guide editor with a banner: 
  "Dobro došli! Dodajte još detalja kad budete imali vremena. / Welcome! Add more details when you have time."

---

## PART 5: Legal & Compliance Pages

### `src/pages/privacy.astro` — Privacy Policy
Must cover:
- What data is collected (owner account data, guest passport data for registration)
- Why (legal registration requirement, service provision)
- How long guest data is retained (30 days post-departure, then auto-deleted)
- Data storage location (Supabase EU region)
- Owner's role as data controller for guest data, CheckinPack as processor
- Contact for data requests

### `src/pages/terms.astro` — Terms of Service
Must cover:
- Service description
- Subscription terms (billing cycle, cancellation)
- Owner responsibilities (accuracy of eVisitor submission, legal compliance)
- Limitation of liability — IMPORTANT: be clear that CheckinPack assists with data formatting/preparation but the owner is responsible for actual eVisitor submission and compliance
- Data processing terms

### VAT consideration
Before launch, confirm with a Croatian accountant (or check Porezna uprava guidelines) whether you need to charge PDV (VAT) on subscriptions, and at what rate, based on your business registration status (obrt vs. d.o.o. vs. unregistered). This affects how Stripe should be configured (tax collection settings) and what you display on the pricing page. Don't skip this — get it right before taking real payments at scale.

---

## PART 6: Pre-Launch Checklist

```
[ ] Landing page live and polished
[ ] Pricing page live with working Stripe checkout buttons
[ ] Privacy policy and terms pages live
[ ] All mobile QA items from Part 3 completed
[ ] Onboarding wizard tested with a fresh account
[ ] Custom domain connected (checkinpack.hr pointing to Cloudflare Pages)
[ ] All environment variables confirmed in Cloudflare Pages production settings
[ ] Stripe is in LIVE mode, not test mode (double check API keys)
[ ] Stripe webhook endpoint updated to production URL
[ ] Test a real end-to-end payment with a real card (small amount, refund after if needed)
[ ] eVisitor health check confirmed working — you've received at least one test alert
[ ] Resend sending domain verified (not sending from a default/test domain)
[ ] Google Search Console set up for checkinpack.hr (for future SEO)
[ ] Favicon and meta tags set (social sharing preview looks correct when link is shared on WhatsApp)
```

---

## PART 7: Launch Sequence

### Day 1 — Soft launch to people you know
```
Send to 10 apartment owners you personally know via WhatsApp:
"Bok [ime], napravio sam alat za vlasnike apartmana — digitalni vodič 
za goste + priprema podataka za eVisitor prijavu. Besplatno za probu, 
postavljanje traje 10 minuta. Pogledaj: checkinpack.hr — javi mi što misliš!"

Goal: 5-10 signups, watch for where they get confused or stuck
```

### Day 3-7 — Collect feedback, fix critical issues
```
Call or message each person who signed up — don't just wait for them to report issues
Ask specifically: "Did you get to send a guest the pre-arrival link yet?"
Fix anything that blocks the core flow immediately
```

### Week 2 — Wider local push
```
Post in 2-3 Croatian Facebook groups for apartment/villa owners 
(search "iznajmljivači apartmana Hrvatska" type groups)
Keep the post simple — what it does, who it's for, link, "javite se za pitanja"
```

### Week 3-4 — Broader channels
```
Consider: local tourism board Facebook pages, Airbnb/Booking.com host forums,
a short post on r/croatia or r/Airbnb if relevant and allowed
```

### Ongoing — Annual renewal reminder for trial users
```
For owners on the €5/3-month trial, set a reminder (manual for now, 
automate later) to reach out near the end of their 3 months:
"Bok! Vidim da ti je probni period pri kraju. Ako ti se sviđa CheckinPack, 
godišnji plan je €20 — pokriva cijelu sljedeću sezonu."
```

---

## Build order this session

1. Landing page (Part 1) — this is the priority, build it fully
2. Pricing page (Part 2)
3. Mobile QA pass (Part 3) — go through the entire checklist, fix issues as found
4. Onboarding wizard (Part 4)
5. Privacy policy + terms pages (Part 5) — can use a template, customize for your specifics
6. Pre-launch checklist (Part 6) — go through it item by item

Part 7 (launch sequence) isn't code — that's your actual launch plan, execute it once Parts 1-6 are done and deployed.

---

## Constraints

- Don't add new backend features this week — if you find yourself wanting to build something new, write it down for a "Week 6" list and stay focused on launch readiness
- Every page needs to work on mobile first — desktop is secondary for this product
- Don't fake testimonials or social proof — skip those sections entirely until you have real ones
- Be honest in the FAQ and terms about what CheckinPack does and doesn't do — especially regarding eVisitor (you prepare the data, the owner is responsible for actual submission)

Ask me before making any architectural decisions not covered above.
Stop after the landing page (Part 1) and show me what's been built before continuing.
