alter table public.contacts
  add column if not exists persona_id uuid references public.buyer_personas(id) on delete set null;

create index if not exists contacts_persona_idx
  on public.contacts(persona_id)
  where persona_id is not null;

