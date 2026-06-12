-- Stripe subscription fields on owners
alter table owners
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists plan_interval text, -- 'month' | 'year'
  add column if not exists plan_expires_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

-- iCal feeds (one per apartment, optional)
create table if not exists ical_feeds (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid references apartments on delete cascade unique not null,
  feed_url text not null,
  last_synced_at timestamptz,
  sync_error text
);
alter table ical_feeds enable row level security;
create policy "Owners manage own ical feeds" on ical_feeds
  using (apartment_id in (select id from apartments where owner_id = auth.uid()));
