-- Each user's gross pay per cut-off, for the leaderboard. The app writes its own row whenever a cut-off is viewed or changed,
-- since pay rules (holidays, night, overtime) live in the app. Rate and hours are self-reported anyway, so the database
-- computing it would not make the totals more trustworthy.
create table public.pay_totals (
  user_id uuid not null references auth.users on delete cascade,
  cutoff_start date not null check (extract(day from cutoff_start) in (1, 16)),
  pay_centavos bigint not null check (pay_centavos >= 0),
  currency text not null,
  primary key (user_id, cutoff_start)
);

alter table public.pay_totals enable row level security;
create policy "own totals" on public.pay_totals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Rankings for one cut-off. Empty until the cut-off has ended in Manila time, so nobody can see them early.
-- Only totals in the viewer's currency are ranked, because amounts in different currencies don't compare.
create function public.leaderboard(start_date date)
returns table (rank bigint, username text, pay_centavos bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by t.pay_centavos desc), n.username, t.pay_centavos
  from public.pay_totals t
  join public.usernames n on n.user_id = t.user_id
  where t.cutoff_start = start_date
    and t.pay_centavos > 0
    and t.currency = (select p.currency from public.profiles p where p.user_id = (select auth.uid()))
    and case when extract(day from start_date) = 1 then start_date + 14
             else (date_trunc('month', start_date) + interval '1 month - 1 day')::date
        end < (now() at time zone 'Asia/Manila')::date
  order by 1, 2
$$;

-- Supabase grants anon execute on new functions by default, so revoking from public alone is not enough.
revoke execute on function public.leaderboard(date) from public, anon;
grant execute on function public.leaderboard(date) to authenticated;
