insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutor-verifications',
  'tutor-verifications',
  false,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tutor_verifications_public_read" on storage.objects;
