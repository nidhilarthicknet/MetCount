
-- Elite-only simulated auto-sell rules for the MetCount portfolio chart.
-- A server-recorded fresh market snapshot evaluates matching pending orders.
create table if not exists public.metcount_auto_sell_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z0-9.^=-]{1,20}$'),
  target_price_inr numeric(18,6) not null check (target_price_inr > 0),
  condition text not null check (condition in ('at_or_above','at_or_below')),
  shares_to_sell integer not null check (shares_to_sell between 1 and 1000000),
  elite_expires_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','triggered','cancelled','expired','insufficient_shares')),
  created_at timestamptz not null default now(),
  triggered_at timestamptz,
  executed_price_inr numeric(18,6),
  proceeds_jp numeric(18,2)
);
create index if not exists metcount_auto_sell_pending_ticker_idx
  on public.metcount_auto_sell_orders (ticker, created_at) where status = 'pending';
create index if not exists metcount_auto_sell_user_created_idx
  on public.metcount_auto_sell_orders (user_id, created_at desc);
alter table public.metcount_auto_sell_orders enable row level security;
revoke all on table public.metcount_auto_sell_orders from public, anon, authenticated;
grant select on table public.metcount_auto_sell_orders to authenticated;
drop policy if exists metcount_auto_sell_select_own on public.metcount_auto_sell_orders;
create policy metcount_auto_sell_select_own on public.metcount_auto_sell_orders
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.metcount_create_auto_sell_order(
  p_ticker text, p_target_price_inr numeric, p_condition text, p_shares integer,
  p_vault_password text, p_extra_pin text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp
as $function$
declare v_uid uuid; v_profile public.profiles%rowtype; v_holdings numeric; v_ticker text := upper(trim(coalesce(p_ticker,''))); v_id uuid;
begin
  v_uid := public._metcount_require_security(p_vault_password,p_extra_pin);
  if v_ticker !~ '^[A-Z0-9.^=-]{1,20}$' then raise exception 'Choose a valid stock ticker.'; end if;
  if p_target_price_inr is null or p_target_price_inr <= 0 or p_target_price_inr > 1000000000000 then raise exception 'The selected line price is invalid.'; end if;
  if p_condition not in ('at_or_above','at_or_below') then raise exception 'Choose a sell trigger condition.'; end if;
  if p_shares is null or p_shares < 1 or p_shares > 1000000 then raise exception 'Choose a valid whole-share quantity.'; end if;
  select * into v_profile from public.profiles where id=v_uid for update;
  if v_profile.id is null or v_profile.subscription_tier <> 'Elite' or v_profile.subscription_until is null or v_profile.subscription_until <= now() then
    raise exception 'Simulated auto-sell requires an active Elite subscription.';
  end if;
  select shares into v_holdings from public.portfolio_holdings where user_id=v_uid and ticker=v_ticker for update;
  if v_holdings is null or v_holdings < p_shares then raise exception 'You do not own enough shares of the selected stock.'; end if;
  insert into public.metcount_auto_sell_orders(user_id,ticker,target_price_inr,condition,shares_to_sell,elite_expires_at)
  values(v_uid,v_ticker,round(p_target_price_inr,6),p_condition,p_shares,v_profile.subscription_until) returning id into v_id;
  return jsonb_build_object('ok',true,'order_id',v_id,'ticker',v_ticker,'target_price_inr',round(p_target_price_inr,6),'condition',p_condition,'shares',p_shares,'expires_at',v_profile.subscription_until);
end;
$function$;

create or replace function public.metcount_cancel_auto_sell_order(
  p_order_id uuid, p_vault_password text, p_extra_pin text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp
as $function$
declare v_uid uuid;
begin
  v_uid := public._metcount_require_security(p_vault_password,p_extra_pin);
  update public.metcount_auto_sell_orders set status='cancelled'
   where id=p_order_id and user_id=v_uid and status='pending';
  if not found then raise exception 'Pending auto-sell rule not found or already processed.'; end if;
  return jsonb_build_object('ok',true,'order_id',p_order_id,'status','cancelled');
end;
$function$;

create or replace function public.metcount_process_auto_sell_snapshot()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp
as $function$
declare
  o public.metcount_auto_sell_orders%rowtype; a public.profiles%rowtype; h public.portfolio_holdings%rowtype;
  v_native_price numeric; v_currency text; v_price_inr numeric; v_unit_jp numeric; v_proceeds_jp numeric;
begin
  if new.as_of < now() - interval '5 minutes' then return new; end if;
  begin v_native_price := nullif(new.payload->>'currentPrice','')::numeric; exception when others then return new; end;
  v_currency := upper(coalesce(new.payload->>'currency',''));
  if v_native_price is null or v_native_price <= 0 then return new; end if;
  v_price_inr := case v_currency
    when 'INR' then v_native_price when 'USD' then v_native_price / 0.012
    when 'EUR' then v_native_price / 0.011 when 'GBP' then v_native_price / 0.0095
    when 'JPY' then v_native_price / 1.8 when 'KRW' then v_native_price / 16.2 else null end;
  if v_price_inr is null or v_price_inr <= 0 then return new; end if;
  v_unit_jp := round(v_price_inr / 100, 2);
  if v_unit_jp <= 0 then return new; end if;

  for o in select * from public.metcount_auto_sell_orders
    where ticker=upper(new.ticker) and status='pending' order by created_at for update skip locked
  loop
    select * into a from public.profiles where id=o.user_id for update;
    if a.id is null or a.subscription_tier <> 'Elite' or a.subscription_until is null
       or a.subscription_until <= now() or o.elite_expires_at <= now() then
      update public.metcount_auto_sell_orders set status='expired' where id=o.id and status='pending';
      continue;
    end if;
    if not ((o.condition='at_or_above' and v_price_inr >= o.target_price_inr)
         or (o.condition='at_or_below' and v_price_inr <= o.target_price_inr)) then continue; end if;
    select * into h from public.portfolio_holdings where user_id=o.user_id and ticker=o.ticker for update;
    if h.user_id is null or h.shares < o.shares_to_sell then
      update public.metcount_auto_sell_orders set status='insufficient_shares' where id=o.id and status='pending';
      continue;
    end if;
    v_proceeds_jp := v_unit_jp * o.shares_to_sell;
    if h.shares = o.shares_to_sell then
      delete from public.portfolio_holdings where user_id=o.user_id and ticker=o.ticker;
    else
      update public.portfolio_holdings set shares=shares-o.shares_to_sell,updated_at=now() where user_id=o.user_id and ticker=o.ticker;
    end if;
    update public.profiles set jp_balance=jp_balance+v_proceeds_jp,updated_at=now() where id=o.user_id;
    insert into public.transactions(user_id,type,amount,note) values(o.user_id,'Auto Stock Sell (InstaPay)',v_proceeds_jp,
      'Metrade simulated auto-sell '||o.ticker||'; sold '||o.shares_to_sell||' share(s) at ₹'||round(v_price_inr,2)||' each');
    insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(o.user_id,v_proceeds_jp,'credit',
      'Metrade simulated auto-sell '||o.ticker||' at ₹'||round(v_price_inr,2)||' each');
    insert into public.stock_observations(user_id,ticker,price) values(o.user_id,o.ticker,v_price_inr);
    update public.metcount_auto_sell_orders set status='triggered',triggered_at=now(),executed_price_inr=round(v_price_inr,6),proceeds_jp=round(v_proceeds_jp,2)
      where id=o.id and status='pending';
  end loop;
  return new;
end;
$function$;

drop trigger if exists metcount_process_auto_sell_after_quote on public.market_snapshots;
create trigger metcount_process_auto_sell_after_quote after insert on public.market_snapshots
for each row execute function public.metcount_process_auto_sell_snapshot();

revoke all on function public.metcount_create_auto_sell_order(text,numeric,text,integer,text,text) from public, anon;
grant execute on function public.metcount_create_auto_sell_order(text,numeric,text,integer,text,text) to authenticated;
revoke all on function public.metcount_cancel_auto_sell_order(uuid,text,text) from public, anon;
grant execute on function public.metcount_cancel_auto_sell_order(uuid,text,text) to authenticated;
revoke all on function public.metcount_process_auto_sell_snapshot() from public, anon, authenticated;
