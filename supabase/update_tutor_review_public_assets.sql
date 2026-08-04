insert into storage.buckets (id, name, public)
values ('tutor-verifications', 'tutor-verifications', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "tutor_verifications_public_read" on storage.objects;
create policy "tutor_verifications_public_read"
on storage.objects for select
using (bucket_id = 'tutor-verifications');
