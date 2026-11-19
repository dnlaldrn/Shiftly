-- The leaderboard is opt-in. Pay stays hidden until its owner joins, and only people who joined can see the rankings.
-- Users flip the flag on their own profile row, which the existing "own profile" policy already allows.
alter table public.profiles add column participating boolean not null default false;

-- Same rules as before, plus both the viewer and each ranked user must have joined. Leaving hides past cut-offs too.
create or replace function public.leaderboard(start_date date)
returns table (rank bigint, username text, pay_centavos bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by t.pay_centavos desc), n.username, t.pay_centavos
  from public.profiles viewer
  join public.pay_totals t on t.currency = viewer.currency
  join public.profiles p on p.user_id = t.user_id
  join public.usernames n on n.user_id = t.user_id
  where viewer.user_id = (select auth.uid())
    and viewer.participating
    and p.participating
    and t.cutoff_start = start_date
    and t.pay_centavos > 0
    and case when extract(day from start_date) = 1 then start_date + 14
             else (date_trunc('month', start_date) + interval '1 month - 1 day')::date
        end < (now() at time zone 'Asia/Manila')::date
  order by 1, 2
$$;
