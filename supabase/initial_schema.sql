create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('tutor', 'parent');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  role public.user_role not null default 'tutor',
  full_name text,
  city text not null default '北京',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text,
  school text,
  department text,
  academic_stage text,
  gaokao_origin text,
  subjects text[] not null default '{}'::text[],
  service_types text[] not null default '{}'::text[],
  grade_ranges text[] not null default '{}'::text[],
  grade text,
  service_areas text[] not null default '{}'::text[],
  service_area text,
  hourly_rate integer,
  available_time_slots text[] not null default '{}'::text[],
  available_time_note text,
  available_days text,
  weekly_capacity integer,
  tagline text,
  intro text,
  order_status text not null default '接单中',
  status text not null default 'pending',
  verification_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  service_type text not null default '课后辅导',
  grade text not null,
  city text not null default '北京',
  area text not null,
  budget_hourly integer,
  budget_min integer,
  budget_max integer,
  study_situation text,
  preferred_time_slots text[] not null default '{}'::text[],
  preferred_time text,
  preferred_time_note text,
  weekly_session_count integer,
  lesson_duration text,
  extra_notes text,
  notes text,
  status text not null default '招募中',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tutor_profiles_set_updated_at on public.tutor_profiles;
create trigger tutor_profiles_set_updated_at
before update on public.tutor_profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_phone text;
begin
  signup_phone := coalesce(
    nullif(new.raw_user_meta_data->>'phone', ''),
    new.phone
  );

  insert into public.profiles (id, phone, role, full_name, city)
  values (
    new.id,
    signup_phone,
    case
      when new.raw_user_meta_data->>'role' = 'parent' then 'parent'::public.user_role
      else 'tutor'::public.user_role
    end,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'city', ''), '北京')
  )
  on conflict (id) do update
  set phone = excluded.phone,
      role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.parent_requests enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "tutor_profiles_select_own" on public.tutor_profiles;
create policy "tutor_profiles_select_own"
on public.tutor_profiles for select
using (auth.uid() = user_id);

drop policy if exists "tutor_profiles_select_authenticated" on public.tutor_profiles;

drop policy if exists "tutor_profiles_insert_own" on public.tutor_profiles;
create policy "tutor_profiles_insert_own"
on public.tutor_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "tutor_profiles_update_own" on public.tutor_profiles;
create policy "tutor_profiles_update_own"
on public.tutor_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "parent_requests_select_own" on public.parent_requests;
create policy "parent_requests_select_own"
on public.parent_requests for select
using (auth.uid() = user_id);

drop policy if exists "parent_requests_select_tutor" on public.parent_requests;
create policy "parent_requests_select_tutor"
on public.parent_requests for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'tutor'::public.user_role
  )
);

drop policy if exists "parent_requests_select_authenticated" on public.parent_requests;

drop policy if exists "parent_requests_insert_own" on public.parent_requests;
create policy "parent_requests_insert_own"
on public.parent_requests for insert
with check (auth.uid() = user_id);

drop policy if exists "parent_requests_update_own" on public.parent_requests;
create policy "parent_requests_update_own"
on public.parent_requests for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, city, bio, avatar_url) on public.profiles to authenticated;
grant select, insert, update on public.tutor_profiles to authenticated;
grant select, insert, update on public.parent_requests to authenticated;
grant usage, select on sequence public.parent_requests_id_seq to authenticated;

create or replace view public.approved_tutor_cards as
select
  tp.user_id,
  case
    when p.full_name is null or btrim(p.full_name) = '' then '教员'
    else left(btrim(p.full_name), 1) || '老师'
  end as display_name,
  p.avatar_url,
  tp.gender,
  tp.school,
  tp.department,
  tp.academic_stage,
  tp.gaokao_origin,
  tp.subjects,
  tp.service_types,
  tp.grade_ranges,
  tp.service_areas,
  tp.hourly_rate,
  tp.available_time_slots,
  tp.available_time_note,
  tp.weekly_capacity,
  tp.tagline,
  tp.intro,
  tp.order_status,
  tp.updated_at
from public.tutor_profiles as tp
join public.profiles as p
  on p.id = tp.user_id
where tp.status = 'approved';

revoke all on public.approved_tutor_cards from anon;
grant select on public.approved_tutor_cards to authenticated;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

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

drop policy if exists "profile_avatars_public_read" on storage.objects;
create policy "profile_avatars_public_read"
on storage.objects for select
using (bucket_id = 'profile-avatars');

drop policy if exists "profile_avatars_insert_own" on storage.objects;
create policy "profile_avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_avatars_update_own" on storage.objects;
create policy "profile_avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_avatars_delete_own" on storage.objects;
create policy "profile_avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "tutor_verifications_select_own" on storage.objects;
create policy "tutor_verifications_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'tutor-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "tutor_verifications_insert_own" on storage.objects;
create policy "tutor_verifications_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tutor-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "tutor_verifications_update_own" on storage.objects;
create policy "tutor_verifications_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'tutor-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'tutor-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "tutor_verifications_delete_own" on storage.objects;
create policy "tutor_verifications_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tutor-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);
