-- Close the remaining gap from *_customer_auth_signup_role_fix.sql: that
-- fix only set role='customer' when raw_user_meta_data->>'account_type'
-- equals 'customer' (the marker js/signup.js sends); every other case —
-- including a request built by hand against Supabase's public signup
-- endpoint with no such marker — still fell through to role='staff',
-- which has real dashboard access. Removing that fallback entirely: every
-- new auth.users row now gets role='customer' with no exception, no
-- matter how the row was created. No other change to this function —
-- same insert shape, same ON CONFLICT DO NOTHING, same full_name handling,
-- same SECURITY DEFINER/search_path. Existing profiles rows are untouched
-- (this is an AFTER INSERT trigger; it never fires for rows that already
-- exist).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
