alter table public.parent_requests
  add column if not exists service_type text,
  add column if not exists budget_hourly integer,
  add column if not exists study_situation text,
  add column if not exists preferred_time_slots text[] not null default '{}'::text[],
  add column if not exists preferred_time text,
  add column if not exists preferred_time_note text,
  add column if not exists weekly_session_count integer,
  add column if not exists lesson_duration text,
  add column if not exists extra_notes text;

update public.parent_requests
set service_type = coalesce(nullif(service_type, ''), '课后辅导')
where service_type is null or btrim(service_type) = '';

update public.parent_requests
set budget_hourly = coalesce(budget_hourly, budget_max, budget_min)
where budget_hourly is null;

update public.parent_requests
set extra_notes = coalesce(nullif(extra_notes, ''), notes)
where coalesce(nullif(extra_notes, ''), '') = ''
  and coalesce(notes, '') <> '';

update public.parent_requests
set preferred_time = array_to_string(preferred_time_slots, ' / ')
where (preferred_time is null or btrim(preferred_time) = '')
  and array_length(preferred_time_slots, 1) > 0;

update public.parent_requests
set status = case
  when status is null or btrim(status) = '' then '招募中'
  when status in ('open', 'active', '招募中') then '招募中'
  when status in ('closed', 'matched', '已找到') then '已找到'
  else status
end;

update public.parent_requests
set preferred_time_slots = '{}'::text[]
where preferred_time_slots is null;

alter table public.parent_requests
  alter column service_type set default '课后辅导',
  alter column preferred_time_slots set default '{}'::text[],
  alter column status set default '招募中';

update public.parent_requests
set service_type = '课后辅导'
where service_type is null or btrim(service_type) = '';

update public.parent_requests
set status = '招募中'
where status is null or btrim(status) = '';

alter table public.parent_requests
  alter column service_type set not null,
  alter column preferred_time_slots set not null,
  alter column status set not null;

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

drop policy if exists "parent_requests_update_own" on public.parent_requests;
create policy "parent_requests_update_own"
on public.parent_requests for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.parent_requests to authenticated;

drop policy if exists "parent_requests_select_authenticated" on public.parent_requests;
