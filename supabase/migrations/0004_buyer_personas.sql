create table if not exists public.buyer_personas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  segment text not null,
  demographics text,
  goals text[] not null default '{}',
  pain_points text[] not null default '{}',
  preferred_channels text[] not null default '{}',
  messaging_notes text,
  budget_range text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_personas_owner_created_idx
  on public.buyer_personas(owner_id, created_at desc);

alter table public.buyer_personas enable row level security;

drop policy if exists "owner_all" on public.buyer_personas;
create policy "owner_all" on public.buyer_personas for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists buyer_personas_set_updated_at on public.buyer_personas;
create trigger buyer_personas_set_updated_at before update on public.buyer_personas
  for each row execute function public.set_updated_at();

