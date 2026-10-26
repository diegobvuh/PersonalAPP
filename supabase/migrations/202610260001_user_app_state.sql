create table if not exists public.user_app_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  data_key text not null check (char_length(data_key) between 1 and 80),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, data_key)
);

alter table public.user_app_state enable row level security;

revoke all on table public.user_app_state from anon, authenticated;
grant select, insert, update, delete on table public.user_app_state to authenticated;

create policy "Users read their own app state"
on public.user_app_state for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their own app state"
on public.user_app_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own app state"
on public.user_app_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their own app state"
on public.user_app_state for delete
to authenticated
using ((select auth.uid()) = user_id);

