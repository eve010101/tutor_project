-- Apply this migration once to existing projects after taking a database backup.
-- It closes privilege escalation, forged match consent, and private-file exposure.

begin;

alter table public.profiles enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.parent_requests enable row level security;
alter table public.match_records enable row level security;

-- Profiles: users may edit presentation fields, but identity and role are immutable.
revoke update on public.profiles from authenticated;
grant update (full_name, city, bio, avatar_url) on public.profiles to authenticated;

create or replace function public.enforce_profile_identity_security()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'authenticated' and (
    new.id is distinct from old.id
    or new.phone is distinct from old.phone
    or new.role is distinct from old.role
  ) then
    raise exception 'profile identity fields cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_identity_security on public.profiles;
create trigger profiles_enforce_identity_security
before update on public.profiles
for each row execute function public.enforce_profile_identity_security();

-- Tutor profiles: only the owner can read the base row. Public consumers use
-- approved_tutor_cards, which excludes verification paths and unapproved rows.
drop policy if exists "tutor_profiles_select_authenticated" on public.tutor_profiles;

revoke all on public.approved_tutor_cards from anon;
grant select on public.approved_tutor_cards to authenticated;

create or replace function public.enforce_tutor_profile_security()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'authenticated' then
    return new;
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'tutor profile owner cannot be changed';
  end if;

  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'new tutor profiles must be pending';
  end if;

  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status <> 'pending' then
    raise exception 'review status can only be changed by the review service';
  end if;

  if new.verification_image_path is not null
     and split_part(new.verification_image_path, '/', 1) <> auth.uid()::text then
    raise exception 'verification file must belong to the tutor';
  end if;

  return new;
end;
$$;

drop trigger if exists tutor_profiles_enforce_security on public.tutor_profiles;
create trigger tutor_profiles_enforce_security
before insert or update on public.tutor_profiles
for each row execute function public.enforce_tutor_profile_security();

-- Parent requests: parents read their own rows; tutors use the role-scoped policy.
drop policy if exists "parent_requests_select_authenticated" on public.parent_requests;

-- Match records: a participant can only set fields owned by that participant.
-- Derived match status and contact_unlocked_at remain controlled by the sync trigger.
create or replace function public.enforce_match_record_security()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  actor_role text;
begin
  if auth.role() <> 'authenticated' then
    return new;
  end if;

  if auth.uid() = new.parent_id then
    actor_role := 'parent';
  elsif auth.uid() = new.tutor_id then
    actor_role := 'tutor';
  else
    raise exception 'match participant mismatch';
  end if;

  if new.parent_id = new.tutor_id then
    raise exception 'match participants must be different users';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending'
       or new.contact_unlocked_at is not null
       or new.rejected_by is not null
       or new.reject_reason is not null
       or new.rejected_at is not null then
      raise exception 'new match has protected state';
    end if;

    if actor_role = 'parent' and (
      new.tutor_interested
      or new.tutor_interest_at is not null
      or new.tutor_shared_verification_path is not null
      or new.tutor_shared_verification_at is not null
      or new.tutor_review_comment is not null
      or new.tutor_review_created_at is not null
    ) then
      raise exception 'parent cannot set tutor-owned match fields';
    end if;

    if actor_role = 'tutor' and (
      new.parent_interested
      or new.parent_interest_at is not null
      or new.parent_requested_verification_at is not null
      or new.parent_review_rating is not null
      or new.parent_review_comment is not null
      or new.parent_review_created_at is not null
    ) then
      raise exception 'tutor cannot set parent-owned match fields';
    end if;

  elsif new.id is distinct from old.id
     or new.request_id is distinct from old.request_id
     or new.parent_id is distinct from old.parent_id
     or new.tutor_id is distinct from old.tutor_id
     or new.created_at is distinct from old.created_at then
    raise exception 'match identity and derived contact state are immutable';
  end if;

  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status <> 'rejected' then
    raise exception 'match status is derived from participant consent';
  end if;

  if tg_op = 'UPDATE' and new.status = 'rejected' and (
    new.rejected_by <> actor_role
    or nullif(btrim(new.reject_reason), '') is null
    or new.rejected_at is null
  ) then
    raise exception 'rejection must identify the acting participant and reason';
  end if;

  if tg_op = 'UPDATE' and actor_role = 'parent' and (
    new.tutor_interested is distinct from old.tutor_interested
    or new.tutor_interest_at is distinct from old.tutor_interest_at
    or new.tutor_shared_verification_path is distinct from old.tutor_shared_verification_path
    or new.tutor_shared_verification_at is distinct from old.tutor_shared_verification_at
    or new.tutor_review_comment is distinct from old.tutor_review_comment
    or new.tutor_review_created_at is distinct from old.tutor_review_created_at
  ) then
    raise exception 'parent cannot change tutor-owned match fields';
  end if;

  if tg_op = 'UPDATE' and actor_role = 'tutor' and (
    new.parent_interested is distinct from old.parent_interested
    or new.parent_interest_at is distinct from old.parent_interest_at
    or new.parent_requested_verification_at is distinct from old.parent_requested_verification_at
    or new.parent_review_rating is distinct from old.parent_review_rating
    or new.parent_review_comment is distinct from old.parent_review_comment
    or new.parent_review_created_at is distinct from old.parent_review_created_at
  ) then
    raise exception 'tutor cannot change parent-owned match fields';
  end if;

  if tg_op = 'UPDATE'
     and actor_role = 'parent'
     and new.parent_review_created_at is distinct from old.parent_review_created_at
     and old.status <> 'matched' then
    raise exception 'reviews require a matched record';
  end if;

  if tg_op = 'UPDATE'
     and actor_role = 'tutor'
     and new.tutor_review_created_at is distinct from old.tutor_review_created_at
     and old.status <> 'matched' then
    raise exception 'reviews require a matched record';
  end if;

  if tg_op = 'UPDATE'
     and actor_role = 'tutor'
     and new.tutor_shared_verification_path is distinct from old.tutor_shared_verification_path
     and old.parent_requested_verification_at is null then
    raise exception 'verification sharing must be requested by the parent';
  end if;

  if new.tutor_shared_verification_path is not null
     and split_part(new.tutor_shared_verification_path, '/', 1) <> new.tutor_id::text then
    raise exception 'shared verification file must belong to the tutor';
  end if;

  return new;
end;
$$;

drop trigger if exists match_records_enforce_actor_fields on public.match_records;
create trigger match_records_enforce_actor_fields
before insert or update on public.match_records
for each row execute function public.enforce_match_record_security();

-- Verification documents are private. Owners retain access; the authorized
-- review page uses the service role to create five-minute signed URLs.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf']::text[]
where id in ('tutor-verifications', 'match-verifications');

drop policy if exists "tutor_verifications_public_read" on storage.objects;

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
      and split_part(name, '/', 1) = mr.tutor_id::text
      and (
        mr.tutor_id = auth.uid()
        or (
          mr.parent_id = auth.uid()
          and mr.parent_requested_verification_at is not null
        )
      )
  )
);

drop policy if exists "match_verifications_insert_tutor" on storage.objects;
create policy "match_verifications_insert_tutor"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'match-verifications'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.match_records mr
    where mr.tutor_id = auth.uid()
      and mr.parent_requested_verification_at is not null
      and name = auth.uid()::text || '/match-' || mr.id::text || '-verification'
  )
);

drop policy if exists "match_verifications_update_tutor" on storage.objects;
create policy "match_verifications_update_tutor"
on storage.objects for update
to authenticated
using (
  bucket_id = 'match-verifications'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'match-verifications'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.match_records mr
    where mr.tutor_id = auth.uid()
      and mr.parent_requested_verification_at is not null
      and name = auth.uid()::text || '/match-' || mr.id::text || '-verification'
  )
);

drop policy if exists "match_verifications_delete_tutor" on storage.objects;
create policy "match_verifications_delete_tutor"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'match-verifications'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.match_records mr
    where mr.tutor_id = auth.uid()
      and name = auth.uid()::text || '/match-' || mr.id::text || '-verification'
  )
);

commit;
