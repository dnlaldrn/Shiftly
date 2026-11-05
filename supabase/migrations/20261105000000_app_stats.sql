-- Public totals for the home page. Security definer so signed-out visitors get counts without reading anyone's rows.
create function public.app_stats()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'users', (select count(*) from auth.users),
    'logs', (select count(*) from public.day_entries)
  )
$$;

revoke execute on function public.app_stats() from public;
grant execute on function public.app_stats() to anon, authenticated;
