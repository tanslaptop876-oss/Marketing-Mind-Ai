alter table public.scheduled_posts
  add column if not exists publish_mode text not null default 'publish';

alter table public.scheduled_posts drop constraint if exists scheduled_posts_publish_mode_check;
alter table public.scheduled_posts add constraint scheduled_posts_publish_mode_check
  check (publish_mode in ('draft', 'publish'));

