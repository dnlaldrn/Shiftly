-- Lets the sign-up form reject a taken username. Security definer because usernames live in auth.users metadata, which clients cannot read.
-- shortcut: check-then-signup can race (two people grabbing one name at once) and scans auth.users; move usernames to a unique column if that matters.
create function public.username_taken(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(raw_user_meta_data->>'username') = lower(trim(candidate))
  )
$$;

revoke execute on function public.username_taken(text) from public;
grant execute on function public.username_taken(text) to anon, authenticated;
