alter table public.scheduled_posts
  add column if not exists persona_id uuid references public.buyer_personas(id) on delete set null;

create index if not exists scheduled_posts_persona_idx
  on public.scheduled_posts(persona_id)
  where persona_id is not null;

