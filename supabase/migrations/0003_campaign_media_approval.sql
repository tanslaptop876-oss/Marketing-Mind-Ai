alter table public.scheduled_posts
  add column if not exists approval_status text not null default 'pending';

alter table public.scheduled_posts drop constraint if exists scheduled_posts_approval_status_check;
alter table public.scheduled_posts add constraint scheduled_posts_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

update public.scheduled_posts set approval_status = 'approved'
where status in ('scheduled', 'publishing', 'published');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-media', 'campaign-media', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "campaign_media_owner_select" on storage.objects;
drop policy if exists "campaign_media_owner_insert" on storage.objects;
drop policy if exists "campaign_media_owner_delete" on storage.objects;
create policy "campaign_media_owner_select" on storage.objects for select to authenticated
using (bucket_id = 'campaign-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "campaign_media_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'campaign-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "campaign_media_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'campaign-media' and (storage.foldername(name))[1] = auth.uid()::text);

