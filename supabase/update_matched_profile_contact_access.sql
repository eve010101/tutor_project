-- Allow two users in a successful match to read each other's display name and phone.
-- The application still only renders phone numbers after confirming match_records.status = 'matched'.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_matched_contacts" on public.profiles;
create policy "profiles_select_matched_contacts"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.match_records mr
    where mr.status = 'matched'
      and (
        (mr.parent_id = auth.uid() and mr.tutor_id = profiles.id)
        or
        (mr.tutor_id = auth.uid() and mr.parent_id = profiles.id)
      )
  )
);

grant select on public.profiles to authenticated;
