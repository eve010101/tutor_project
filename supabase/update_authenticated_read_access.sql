-- Restrict base-table access to each table's role- and owner-scoped policies.
-- Marketplace tutor cards remain available through the approved-only view.

alter table public.tutor_profiles enable row level security;
alter table public.parent_requests enable row level security;

drop policy if exists "tutor_profiles_select_authenticated" on public.tutor_profiles;

drop policy if exists "parent_requests_select_authenticated" on public.parent_requests;

grant select on public.tutor_profiles to authenticated;
grant select on public.parent_requests to authenticated;

revoke all on public.approved_tutor_cards from anon;
grant select on public.approved_tutor_cards to authenticated;
