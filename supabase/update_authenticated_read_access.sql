-- Stable read access for the two marketplace data sources.
-- Run this migration once in the Supabase SQL editor for existing projects.

alter table public.tutor_profiles enable row level security;
alter table public.parent_requests enable row level security;

drop policy if exists "tutor_profiles_select_authenticated" on public.tutor_profiles;
create policy "tutor_profiles_select_authenticated"
on public.tutor_profiles for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "parent_requests_select_authenticated" on public.parent_requests;
create policy "parent_requests_select_authenticated"
on public.parent_requests for select
to authenticated
using (auth.uid() is not null);

grant select on public.tutor_profiles to authenticated;
grant select on public.parent_requests to authenticated;

-- PostgreSQL views do not have their own RLS policies. Access is controlled by
-- the view grant and its approved-only WHERE clause. The approved directory is
-- public, and authenticated users retain the same read access.
grant select on public.approved_tutor_cards to anon, authenticated;
