-- Customer Auth Integration — fix handle_new_user()'s default role
--
-- Previously every new auth.users row (regardless of how it was created)
-- got role='staff' in profiles — fine when the only way to create a user
-- was an admin manually inviting staff via the Supabase dashboard, but
-- unsafe now that a public customer-facing signup.html is being added:
-- every public registration would silently mint a staff-level admin
-- dashboard account otherwise.
--
-- Fix: the public signup flow (js/signup.js) passes
-- `options: { data: { full_name, account_type: 'customer' } }` to
-- auth.signUp(). This function now reads that marker — if
-- raw_user_meta_data->>'account_type' = 'customer', the new profile gets
-- role='customer'; anything else (including the admin dashboard's
-- "Authentication > Users > Add user" flow, which sets no such marker)
-- keeps the exact previous behavior, role='staff'. No other change to
-- this function — same insert shape, same ON CONFLICT DO NOTHING, same
-- SECURITY DEFINER/search_path, same full_name handling.
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
    case
      when new.raw_user_meta_data->>'account_type' = 'customer' then 'customer'
      else 'staff'
    end,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
