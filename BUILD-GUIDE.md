# CheckinPack.hr — Claude Code Build Prompt (Week 1)
# Paste everything below this line into Claude Code

---

I'm building **CheckinPack.hr** — a SaaS tool for Croatian holiday apartment owners.

It has two features that work as one product:
1. **Digital welcome guide** — guests scan a QR on arrival and see WiFi, house rules, local tips, checkout info on their phone. Replaces the laminated A4 sheet every owner has.
2. **Guest registration assistant** — guest fills a pre-arrival form with their passport details. Owner gets the data pre-formatted for copy-pasting into the Croatian eVisitor government portal (required by Croatian law within 48hrs of guest arrival).

## Tech Stack
- Astro 4 (App Router) with `@astrojs/react` and `@astrojs/tailwind`
- Supabase (auth + PostgreSQL + Storage)
- TypeScript throughout
- Resend for transactional emails
- Stripe for subscriptions (3-month trial €5 + annual €20/year)
- `qrcode` npm package for QR generation
- Vercel for deployment

## Week 1 Scope — Build exactly this, nothing more

### Step 1: Project setup
Install these packages:
```bash
npx astro add react tailwind
npm install @supabase/supabase-js @supabase/auth-helpers-astro
npm install qrcode @types/qrcode
npm install resend
```

Create `.env.example`:
```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Step 2: Folder structure to create
```
src/
├── pages/
│   ├── index.astro                          # Landing page (placeholder — just a coming soon for now)
│   ├── login.astro                          # Owner login
│   ├── signup.astro                         # Owner signup
│   ├── dashboard/
│   │   ├── index.astro                      # Dashboard home — list apartments
│   │   ├── apartment/
│   │   │   ├── new.astro                    # Create apartment
│   │   │   └── [id]/
│   │   │       ├── guide.astro              # Edit welcome guide
│   │   │       ├── bookings.astro           # Manage bookings + registrations
│   │   │       └── qr.astro                 # QR code download
│   │   └── settings.astro                   # Account settings
│   ├── m/
│   │   └── [slug].astro                     # 🔑 Public welcome guide — what guests see
│   ├── register/
│   │   └── [token].astro                    # 🔑 Guest pre-arrival registration form
│   └── api/
│       ├── apartments/
│       │   ├── index.ts                     # GET list / POST create
│       │   └── [id].ts                      # GET / PUT / DELETE
│       ├── guide/
│       │   └── [id].ts                      # GET / PUT guide content
│       ├── bookings/
│       │   ├── index.ts                     # GET list / POST create
│       │   └── [id]/
│       │       └── send-link.ts             # POST — send pre-arrival link to guest
│       ├── guest/
│       │   └── register.ts                  # POST — guest submits registration form
│       └── scan.ts                          # POST — log QR scan event
├── components/
│   ├── dashboard/
│   │   ├── ApartmentCard.tsx                # Apartment overview card
│   │   ├── BookingRow.tsx                   # Single booking row with status
│   │   └── RegistrationCard.tsx             # Pre-formatted eVisitor data for copy-paste
│   ├── guide-editor/
│   │   ├── GuideEditor.tsx                  # Main guide editor (React island)
│   │   ├── LocalTipsEditor.tsx              # Add/edit/remove local tips
│   │   └── ContactsEditor.tsx               # Emergency contacts editor
│   ├── guest/
│   │   ├── WelcomeGuide.tsx                 # Public guide display (mobile-first)
│   │   └── RegistrationForm.tsx             # Pre-arrival form with GDPR consent
│   └── qr/
│       └── QRDownloader.tsx                 # QR generation + download PNG/SVG
├── layouts/
│   ├── Base.astro                           # HTML shell, head, fonts
│   ├── Dashboard.astro                      # Sidebar + auth guard
│   └── Public.astro                         # Minimal shell for /m/[slug]
├── middleware/
│   └── index.ts                             # Protect /dashboard/* — redirect to /login
└── lib/
    ├── supabase.ts                          # Browser client + server client
    ├── evisitor-format.ts                   # Format guest data to match eVisitor fields
    └── qr.ts                               # QR code generation wrapper
```

### Step 3: Database migration
Create `supabase/migrations/001_initial.sql`:

```sql
-- Enable pgcrypto for encryption
create extension if not exists pgcrypto;

-- Owners (synced with auth.users)
create table owners (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  plan text default 'free',
  created_at timestamptz default now()
);
alter table owners enable row level security;
create policy "Owners manage own record" on owners using (auth.uid() = id);

-- Apartments
create table apartments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners on delete cascade not null,
  name text not null,
  slug text unique not null,
  address text,
  cover_image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table apartments enable row level security;
create policy "Owners manage own apartments" on apartments using (owner_id = auth.uid());
create policy "Public can read active apartments" on apartments for select using (is_active = true);

-- Guide content (one per apartment)
create table guide_content (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid references apartments on delete cascade unique not null,
  wifi_name text,
  wifi_password text,
  checkin_time text,
  checkout_time text,
  house_rules text,
  local_tips jsonb default '[]',
  emergency_contacts jsonb default '[]',
  custom_sections jsonb default '[]',
  updated_at timestamptz default now()
);
alter table guide_content enable row level security;
create policy "Owners manage own guide" on guide_content
  using (apartment_id in (select id from apartments where owner_id = auth.uid()));
create policy "Public can read guide" on guide_content for select using (true);

-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid references apartments on delete cascade not null,
  guest_name text,
  guest_email text,
  arrival_date date not null,
  departure_date date not null,
  pre_arrival_token text unique default encode(gen_random_bytes(32), 'hex'),
  pre_arrival_link_sent boolean default false,
  registration_status text default 'pending',
  created_at timestamptz default now()
);
alter table bookings enable row level security;
create policy "Owners manage own bookings" on bookings
  using (apartment_id in (select id from apartments where owner_id = auth.uid()));
-- Public can read booking by token (for guest form)
create policy "Public read booking by token" on bookings for select using (true);

-- Guest registrations (passport data — encrypted)
create table guest_registrations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings on delete cascade unique not null,
  full_name text not null,
  document_type text not null,
  document_number_encrypted text,
  nationality text not null,
  date_of_birth date not null,
  gdpr_consent boolean not null default false,
  gdpr_consent_at timestamptz,
  submitted_at timestamptz default now(),
  auto_delete_at timestamptz
);
alter table guest_registrations enable row level security;
create policy "Anyone can insert registration" on guest_registrations for insert with check (true);
create policy "Owners read own registrations" on guest_registrations for select
  using (booking_id in (
    select b.id from bookings b
    join apartments a on a.id = b.apartment_id
    where a.owner_id = auth.uid()
  ));

-- Scan events
create table scan_events (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid references apartments,
  scanned_at timestamptz default now(),
  device_type text
);
alter table scan_events enable row level security;
create policy "Anyone can insert scan" on scan_events for insert with check (true);
create policy "Owners read own scans" on scan_events for select
  using (apartment_id in (select id from apartments where owner_id = auth.uid()));
```

### Step 4: Key implementations

**`src/lib/supabase.ts`** — two clients:
```typescript
import { createClient } from '@supabase/supabase-js'

// Browser client (use in React components)
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)

// Server client (use in API routes and .astro server-side)
export const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
)
```

**`src/lib/evisitor-format.ts`** — formats guest data to match eVisitor field order:
```typescript
export interface GuestData {
  full_name: string
  document_type: string
  document_number: string
  nationality: string
  date_of_birth: string
}

export function formatForEvisitor(guest: GuestData, booking: { arrival_date: string, departure_date: string }) {
  return [
    { field: "Prezime i ime (Surname and name)", value: guest.full_name },
    { field: "Vrsta isprave (Document type)", value: guest.document_type === 'passport' ? 'Putovnica / Passport' : 'Osobna iskaznica / ID Card' },
    { field: "Broj isprave (Document number)", value: guest.document_number },
    { field: "Državljanstvo (Nationality)", value: guest.nationality },
    { field: "Datum rođenja (Date of birth)", value: guest.date_of_birth },
    { field: "Datum dolaska (Arrival date)", value: booking.arrival_date },
    { field: "Datum odlaska (Departure date)", value: booking.departure_date },
  ]
}
```

### Step 5: The public welcome guide — build this beautifully

`src/pages/m/[slug].astro`:
- Fetch apartment + guide_content server-side by slug
- Return 404 if not found or inactive
- Log scan event to scan_events via POST /api/scan
- Render `<WelcomeGuide client:load data={guideData} />` React island

`src/components/guest/WelcomeGuide.tsx` must:
- Be fully mobile-first — designed for 390px iPhone screen
- Show apartment name at top with cover photo as a hero banner
- Large WiFi section at top (most important to guests) — tap to copy password
- Collapsible sections: House Rules, Local Tips, Emergency Contacts, Checkout Info
- Local tips grouped by category (restaurants, beaches, transport, etc.)
- Emergency contacts as tap-to-call links
- Soft green (#1a6b4a) as primary brand color — clean, Mediterranean feel
- Footer: "Powered by CheckinPack.hr"

### Step 6: Auth flow
- `src/pages/signup.astro` — email + password form, creates auth user + owners record
- `src/pages/login.astro` — email + password, redirect to /dashboard on success  
- `src/middleware/index.ts` — protect all /dashboard/* routes, redirect to /login if no session

### Step 7: Dashboard home
`src/pages/dashboard/index.astro`:
- List owner's apartments as cards (ApartmentCard.tsx)
- Each card: apartment name, cover photo, link to edit guide, link to bookings, link to QR
- Booking summary: how many bookings this month, how many registrations pending
- "Add new apartment" button
- If no apartments yet: friendly onboarding prompt to create the first one

### Pricing & Stripe configuration

Two Stripe products to create in your Stripe dashboard before building:

| Product | Stripe Price ID | Amount | Interval |
|---|---|---|---|
| CheckinPack Pro 3-Month | `price_pro_3month` | €5.00 | every 3 months |
| CheckinPack Pro Annual | `price_pro_annual` | €20.00 | yearly |

Add to `.env.example`:
```
STRIPE_PRICE_PRO_MONTHLY=price_pro_monthly
STRIPE_PRICE_PRO_ANNUAL=price_pro_annual
```

**`src/lib/stripe.ts`** — plan config:
```typescript
export const PLANS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    max_apartments: 1,
    max_bookings_per_month: 3,
  },
  pro: {
    name: 'Pro',
    price_monthly: 5, // €5 billed every 3 months
    price_annual: 20,
    stripe_price_monthly: import.meta.env.STRIPE_PRICE_PRO_MONTHLY,
    stripe_price_annual: import.meta.env.STRIPE_PRICE_PRO_ANNUAL,
    max_apartments: 999,
    max_bookings_per_month: 999,
  }
}

// Annual saves owner €40 vs monthly — highlight this on pricing page
// "€20/year — pay once before season, covered until October"
```

**Pricing page copy to use:**
- 3-month trial: "€5 / 3 months — low risk, cancel anytime"
- Annual: "€20/year — best value, pay before season, covered until October" ← lead with this
- Free: "1 apartment, 3 bookings/month — try before you buy"

**Plan gating logic** (check in dashboard pages):
- Free: max 1 apartment, max 3 bookings/month — show upgrade banner when limit approached
- Pro monthly + Pro annual: unlimited everything
- Store `plan` as `free | pro` on the owners table — Stripe webhook sets it to `pro` on subscription created, back to `free` on cancellation

## Design direction
- **Public guide page**: warm, Mediterranean, feels like a local host welcoming you personally. Green (#1a6b4a) primary, cream/white background, generous spacing, large readable text.
- **Dashboard**: clean, professional, minimal. Owners are not tech people — make every action obvious.
- **No overengineering**: no animations, no complex state management. Simple, fast, works on a 4G connection in Hvar.

## Constraints
- TypeScript everywhere — define proper types for all DB entities
- Every API route needs try/catch with meaningful error responses
- Mobile-first on the public guide — this is what guests see
- GDPR: guest registration form must have explicit consent checkbox, cannot submit without it
- Supabase Row Level Security is already defined in the migration — don't bypass it

## Build order this session
1. Project setup + packages
2. Run the migration in Supabase Studio
3. `src/lib/supabase.ts` and `src/lib/evisitor-format.ts`
4. Auth pages + middleware
5. Public guide page `/m/[slug]` + WelcomeGuide component — make it look excellent
6. Dashboard home with apartment list
7. Apartment creation flow
8. Guide editor

Ask me before making any architectural decisions not covered above.
Stop after completing the guide editor and show me what's been built.
