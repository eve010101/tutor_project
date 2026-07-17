alter table public.tutor_profiles
  add column if not exists gender text,
  add column if not exists school text,
  add column if not exists department text,
  add column if not exists academic_stage text,
  add column if not exists gaokao_origin text,
  add column if not exists service_types text[] not null default '{}'::text[],
  add column if not exists grade_ranges text[] not null default '{}'::text[],
  add column if not exists service_areas text[] not null default '{}'::text[],
  add column if not exists available_time_slots text[] not null default '{}'::text[],
  add column if not exists weekly_capacity integer,
  add column if not exists tagline text,
  add column if not exists order_status text not null default '接单中',
  add column if not exists status text not null default 'pending',
  add column if not exists verification_image_path text;

update public.tutor_profiles
set status = 'pending'
where status is null;

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
  tp.subjects,
  tp.service_types,
  tp.grade_ranges,
  tp.service_areas,
  tp.hourly_rate,
  tp.available_time_slots,
  tp.tagline,
  tp.intro,
  tp.order_status,
  tp.updated_at
from public.tutor_profiles as tp
join public.profiles as p
  on p.id = tp.user_id
where tp.status = 'approved';

grant select on public.approved_tutor_cards to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

insert into storage.buckets (id, name, public)
values ('tutor-verifications', 'tutor-verifications', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

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
