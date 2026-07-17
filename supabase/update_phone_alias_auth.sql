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
