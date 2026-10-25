
-- Align the auto-sell table with the secure order RPC and bind each rule to
-- the Elite term under which it was created (so an expired rule cannot revive).
alter table public.metcount_auto_sell_orders
  add column if not exists elite_expires_at timestamptz;

update public.metcount_auto_sell_orders o
set elite_expires_at = coalesce(p.subscription_until, now())
from public.profiles p
where p.id=o.user_id and o.elite_expires_at is null;

update public.metcount_auto_sell_orders
set elite_expires_at=now()
where elite_expires_at is null;

alter table public.metcount_auto_sell_orders
  alter column elite_expires_at set not null;

alter table public.metcount_auto_sell_orders
  alter column shares_to_sell type integer using round(shares_to_sell)::integer;

-- The original graph prototype used a numeric-quantity overload. Remove it so
-- Supabase RPC calls with JSON numbers resolve unambiguously to the integer RPC.
drop function if exists public.metcount_create_auto_sell_order(text,numeric,text,numeric,text,text);

revoke all on function public.metcount_create_auto_sell_order(text,numeric,text,integer,text,text) from public,anon;
grant execute on function public.metcount_create_auto_sell_order(text,numeric,text,integer,text,text) to authenticated;
