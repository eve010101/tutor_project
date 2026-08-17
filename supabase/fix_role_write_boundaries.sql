-- Enforce the account role at the database write boundary.
-- This migration is idempotent and does not alter existing rows or user roles.

alter table public.tutor_profiles enable row level security;
alter table public.parent_requests enable row level security;

drop policy if exists "tutor_profiles_insert_own" on public.tutor_profiles;
create policy "tutor_profiles_insert_own"
on public.tutor_profiles for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'tutor'::public.user_role
  )
);

drop policy if exists "tutor_profiles_update_own" on public.tutor_profiles;
create policy "tutor_profiles_update_own"
on public.tutor_profiles for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'tutor'::public.user_role
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'tutor'::public.user_role
  )
);

drop policy if exists "parent_requests_insert_own" on public.parent_requests;
create policy "parent_requests_insert_own"
on public.parent_requests for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'parent'::public.user_role
  )
);

drop policy if exists "parent_requests_update_own" on public.parent_requests;
create policy "parent_requests_update_own"
on public.parent_requests for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'parent'::public.user_role
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'parent'::public.user_role
  )
);
