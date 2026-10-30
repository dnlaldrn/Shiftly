create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  hourly_rate numeric(12,2) not null check (hourly_rate > 0),
  currency text not null default 'PHP'
    check (currency in ('PHP','USD','EUR','GBP','AUD','CAD','SGD','AED','SAR'))
);

create table public.day_entries (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  status text not null check (status in ('rest','worked')),
  time_in time,
  time_out time,
  hourly_rate numeric(12,2) not null check (hourly_rate > 0),
  primary key (user_id, date),
  check (
    (status = 'rest' and time_in is null and time_out is null) or
    (status = 'worked' and time_in is not null and time_out is not null and time_in <> time_out)
  )
);

alter table public.profiles enable row level security;
alter table public.day_entries enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own entries" on public.day_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
