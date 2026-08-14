create table if not exists public.match_records (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.parent_requests(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  tutor_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  parent_interested boolean not null default false,
  tutor_interested boolean not null default false,
  parent_interest_at timestamptz,
  tutor_interest_at timestamptz,
  contact_unlocked_at timestamptz,
  rejected_by text,
  reject_reason text,
  rejected_at timestamptz,
  parent_requested_verification_at timestamptz,
  tutor_shared_verification_path text,
  tutor_shared_verification_at timestamptz,
  review_reminder_at timestamptz,
  parent_review_rating integer check (parent_review_rating between 1 and 5),
  parent_review_comment text,
  parent_review_created_at timestamptz,
  tutor_review_comment text,
  tutor_review_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, tutor_id)
);

create or replace function public.sync_match_record_status()
returns trigger
language plpgsql
as $$
begin
  if new.parent_interested and new.tutor_interested then
    new.status := 'matched';
    if new.contact_unlocked_at is null then
      new.contact_unlocked_at := now();
    end if;
  elsif new.status <> 'rejected' then
    new.status := 'pending';
    new.contact_unlocked_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists match_records_sync_status on public.match_records;
create trigger match_records_sync_status
before insert or update on public.match_records
for each row execute function public.sync_match_record_status();

drop trigger if exists match_records_set_updated_at on public.match_records;
create trigger match_records_set_updated_at
before update on public.match_records
for each row execute function public.set_updated_at();

alter table public.match_records enable row level security;

drop policy if exists "match_records_select_related" on public.match_records;
create policy "match_records_select_related"
on public.match_records for select
to authenticated
using (auth.uid() = parent_id or auth.uid() = tutor_id);

drop policy if exists "match_records_insert_parent" on public.match_records;
create policy "match_records_insert_parent"
on public.match_records for insert
to authenticated
with check (
  auth.uid() = parent_id
  and exists (
    select 1
    from public.parent_requests pr
    where pr.id = request_id
      and pr.user_id = auth.uid()
  )
);

drop policy if exists "match_records_insert_tutor" on public.match_records;
create policy "match_records_insert_tutor"
on public.match_records for insert
to authenticated
with check (
  auth.uid() = tutor_id
  and exists (
    select 1
    from public.parent_requests pr
    where pr.id = request_id
      and pr.user_id = parent_id
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'tutor'::public.user_role
  )
);

drop policy if exists "match_records_update_related" on public.match_records;
create policy "match_records_update_related"
on public.match_records for update
to authenticated
using (auth.uid() = parent_id or auth.uid() = tutor_id)
with check (auth.uid() = parent_id or auth.uid() = tutor_id);

grant select, insert, update on public.match_records to authenticated;
grant usage, select on sequence public.match_records_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-verifications',
  'match-verifications',
  false,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "match_verifications_select_related" on storage.objects;
create policy "match_verifications_select_related"
on storage.objects for select
to authenticated
using (
  bucket_id = 'match-verifications'
  and exists (
    select 1
    from public.match_records mr
    where mr.tutor_shared_verification_path = name
      and (mr.parent_id = auth.uid() or mr.tutor_id = auth.uid())
  )
);

drop policy if exists "match_verifications_insert_tutor" on storage.objects;
create policy "match_verifications_insert_tutor"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'match-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "match_verifications_update_tutor" on storage.objects;
create policy "match_verifications_update_tutor"
on storage.objects for update
to authenticated
using (
  bucket_id = 'match-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'match-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "match_verifications_delete_tutor" on storage.objects;
create policy "match_verifications_delete_tutor"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'match-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);
