create extension if not exists pgcrypto;

create table public.websites (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, url text not null check (url ~ '^https?://'), industry text, created_at timestamptz not null default now()
);
create table public.audit_runs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade, score smallint not null check(score between 0 and 100),
  technical_score smallint check(technical_score between 0 and 100), content_score smallint check(content_score between 0 and 100),
  performance_score smallint check(performance_score between 0 and 100), issues_count integer not null default 0 check(issues_count >= 0),
  summary text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index audit_runs_website_date_idx on public.audit_runs(website_id, created_at desc);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, email text, phone text, company text, persona text, tags text[] not null default '{}', created_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade, status text not null default 'new' check(status in ('new','qualified','proposal','won','lost')),
  value numeric(14,2) not null default 0, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.finance_scenarios (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, name text not null,
  fixed_costs numeric(14,2) not null, price_per_unit numeric(14,2) not null, variable_cost_per_unit numeric(14,2) not null,
  expected_units integer not null default 0, created_at timestamptz not null default now()
);
create table public.connector_accounts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check(provider in ('meta','google_business_profile','ga4','gsc','semrush','ahrefs','wordpress','shopify','youtube','linkedin','x')),
  external_account_id text, display_name text, status text not null default 'pending', encrypted_credentials jsonb,
  created_at timestamptz not null default now(), unique(owner_id, provider, external_account_id)
);
create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  connector_account_id uuid references public.connector_accounts(id) on delete cascade, content text not null, media_urls text[] not null default '{}',
  scheduled_for timestamptz, status text not null default 'draft' check(status in ('draft','scheduled','publishing','published','failed')),
  external_post_id text, error_message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index scheduled_posts_queue_idx on public.scheduled_posts(status, scheduled_for) where status = 'scheduled';

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger scheduled_posts_set_updated_at before update on public.scheduled_posts for each row execute function public.set_updated_at();

alter table public.websites enable row level security;
alter table public.audit_runs enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.finance_scenarios enable row level security;
alter table public.connector_accounts enable row level security;
alter table public.scheduled_posts enable row level security;

do $$ declare t text; begin
  foreach t in array array['websites','audit_runs','contacts','leads','finance_scenarios','connector_accounts','scheduled_posts'] loop
    execute format('create policy "owner_all" on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;
