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

-- Guest registrations (passport data - encrypted)
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
