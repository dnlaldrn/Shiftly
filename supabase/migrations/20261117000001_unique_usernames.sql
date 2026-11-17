-- One row per username so the database itself refuses duplicates, even when two sign-ups race.
-- Usernames still live in auth.users metadata (the app reads them there); a trigger keeps this table in step.
create table public.usernames (
  user_id uuid primary key references auth.users on delete cascade,
  username text not null
);
create unique index usernames_lower_key on public.usernames (lower(username));
-- No policies: clients never touch this table, only the security definer functions below.
alter table public.usernames enable row level security;

-- Existing users: a confirmed account, then the oldest, keeps a name that is already duplicated.
insert into public.usernames (user_id, username)
select distinct on (lower(trim(raw_user_meta_data->>'username'))) id, trim(raw_user_meta_data->>'username')
from auth.users
where coalesce(trim(raw_user_meta_data->>'username'), '') <> ''
order by lower(trim(raw_user_meta_data->>'username')), email_confirmed_at is null, created_at;

create function public.sync_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := trim(new.raw_user_meta_data->>'username');
begin
  if coalesce(wanted, '') = ''
    or (tg_op = 'UPDATE' and wanted is not distinct from trim(old.raw_user_meta_data->>'username')) then
    return new;
  end if;
  -- An unconfirmed sign-up gives the name up once its link has expired (1 day is the longest expiry Supabase allows).
  delete from public.usernames n using auth.users u
  where n.user_id = u.id and lower(n.username) = lower(wanted) and u.id <> new.id
    and u.email_confirmed_at is null and coalesce(u.confirmation_sent_at, u.created_at) < now() - interval '1 day';
  -- Raises unique_violation if someone else holds the name, which fails the sign-up or rename.
  insert into public.usernames (user_id, username) values (new.id, wanted)
  on conflict (user_id) do update set username = excluded.username;
  return new;
end
$$;

create trigger sync_username after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_username();

-- Friendly pre-check for the forms. Same rules as the trigger, so a name it calls free is one the trigger accepts.
-- candidate_email lets someone re-submit sign-up for their own unconfirmed account without their name counting as taken.
drop function public.username_taken(text);
create function public.username_taken(candidate text, candidate_email text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usernames n join auth.users u on u.id = n.user_id
    where lower(n.username) = lower(trim(candidate))
      and u.id is distinct from auth.uid()
      and not (
        u.email_confirmed_at is null
        and (coalesce(lower(u.email) = lower(candidate_email), false)
          or coalesce(u.confirmation_sent_at, u.created_at) < now() - interval '1 day')
      )
  )
$$;

revoke execute on function public.username_taken(text, text) from public;
grant execute on function public.username_taken(text, text) to anon, authenticated;
