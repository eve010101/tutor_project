-- Repair existing databases created before custom availability notes were added.
alter table public.tutor_profiles
  add column if not exists available_time_note text;

-- Ask PostgREST to reload its schema immediately after the DDL change.
notify pgrst, 'reload schema';
