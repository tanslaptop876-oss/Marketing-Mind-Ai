Exit code: 0
Wall time: 1.4 seconds
Output:
alter table public.scheduled_posts
  add column if not exists platform text;

update public.scheduled_posts p
set platform = c.provider
from public.connector_accounts c
where p.connector_account_id = c.id and p.platform is null;

alter table public.scheduled_posts
  add constraint scheduled_posts_platform_check
  check (platform in ('meta','google_business_profile','wordpress','youtube','linkedin','x'));

create index if not exists scheduled_posts_owner_schedule_idx
  on public.scheduled_posts(owner_id, scheduled_for desc);

