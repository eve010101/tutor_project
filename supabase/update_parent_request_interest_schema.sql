create table if not exists public.parent_request_interests (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.parent_requests(id) on delete cascade,
  tutor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, tutor_id)
);

alter table public.parent_request_interests enable row level security;

drop policy if exists "parent_request_interests_select_own" on public.parent_request_interests;
create policy "parent_request_interests_select_own"
on public.parent_request_interests for select
using (auth.uid() = tutor_id);

drop policy if exists "parent_request_interests_insert_own" on public.parent_request_interests;
create policy "parent_request_interests_insert_own"
on public.parent_request_interests for insert
with check (auth.uid() = tutor_id);

grant select, insert on public.parent_request_interests to authenticated;
grant usage, select on sequence public.parent_request_interests_id_seq to authenticated;
