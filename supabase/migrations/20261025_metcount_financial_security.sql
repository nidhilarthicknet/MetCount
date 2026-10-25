-- MetCount financial security and shared services migration.
-- Passwords are stored as bcrypt hashes; financial actions lock profile rows in transactions.
create table if not exists public.metcount_security_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  vault_password_hash text,
  bank_password_hash text,
  extra_security_enabled boolean not null default false,
  extra_pin_hash text,
  currency_code text not null default 'JP' check (currency_code in ('JP','INR','USD','EUR','GBP','JPY','KRW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.metcount_security_credentials enable row level security;
revoke all on table public.metcount_security_credentials from public, anon, authenticated;

create or replace function public._metcount_require_security(p_vault_password text,p_extra_pin text default null)
returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); v public.metcount_security_credentials%rowtype;
begin
 if u is null then raise exception 'Sign in to Metxon first.'; end if;
 select * into v from public.metcount_security_credentials where user_id=u;
 if v.user_id is null or v.vault_password_hash is null then raise exception 'Set your MetCount password first.'; end if;
 if p_vault_password is null or extensions.crypt(p_vault_password,v.vault_password_hash)<>v.vault_password_hash then raise exception 'Incorrect MetCount password.'; end if;
 if v.extra_security_enabled and (v.extra_pin_hash is null or p_extra_pin is null or extensions.crypt(p_extra_pin,v.extra_pin_hash)<>v.extra_pin_hash) then raise exception 'Incorrect extra PIN/password.'; end if;
 return u;
end; $function$;
revoke all on function public._metcount_require_security(text,text) from public,anon,authenticated;

create or replace function public.metcount_security_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $function$
declare u uuid:=auth.uid(); v public.metcount_security_credentials%rowtype;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 select * into v from public.metcount_security_credentials where user_id=u;
 return jsonb_build_object('has_vault',coalesce(v.vault_password_hash is not null,false),'has_metbank',coalesce(v.bank_password_hash is not null,false),'extra_enabled',coalesce(v.extra_security_enabled,false),'currency_code',coalesce(v.currency_code,'JP'));
end; $function$;

create or replace function public.metcount_set_vault_password(p_password text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); n integer;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 if p_password is null or length(p_password)<8 or length(p_password)>128 then raise exception 'Choose a MetCount password between 8 and 128 characters.'; end if;
 insert into public.metcount_security_credentials(user_id,vault_password_hash) values(u,extensions.crypt(p_password,extensions.gen_salt('bf',12)))
 on conflict(user_id) do update set vault_password_hash=excluded.vault_password_hash,updated_at=now() where public.metcount_security_credentials.vault_password_hash is null;
 get diagnostics n=row_count;
 if n=0 then raise exception 'A MetCount password already exists. Use unlock or recovery.'; end if;
 return jsonb_build_object('ok',true);
end; $function$;

create or replace function public.metcount_verify_vault_password(p_password text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); v public.metcount_security_credentials%rowtype;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 select * into v from public.metcount_security_credentials where user_id=u;
 if v.vault_password_hash is null then raise exception 'Create a MetCount password first.'; end if;
 if p_password is null or extensions.crypt(p_password,v.vault_password_hash)<>v.vault_password_hash then raise exception 'Incorrect MetCount password.'; end if;
 return jsonb_build_object('ok',true,'extra_enabled',v.extra_security_enabled,'has_metbank',v.bank_password_hash is not null,'currency_code',v.currency_code);
end; $function$;

create or replace function public.metcount_change_vault_password(p_old_password text,p_new_password text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); h text;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 if p_new_password is null or length(p_new_password)<8 or length(p_new_password)>128 then raise exception 'New password must be 8–128 characters.'; end if;
 select vault_password_hash into h from public.metcount_security_credentials where user_id=u for update;
 if h is null or p_old_password is null or extensions.crypt(p_old_password,h)<>h then raise exception 'Current MetCount password is incorrect.'; end if;
 update public.metcount_security_credentials set vault_password_hash=extensions.crypt(p_new_password,extensions.gen_salt('bf',12)),updated_at=now() where user_id=u;
 return jsonb_build_object('ok',true);
end; $function$;

create or replace function public.metcount_reset_vault_with_metail(p_metail_username text,p_metail_password text,p_new_password text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); a public.metail_accounts%rowtype; h text;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 if p_new_password is null or length(p_new_password)<8 or length(p_new_password)>128 then raise exception 'New password must be 8–128 characters.'; end if;
 select * into a from public.metail_accounts where user_id=u and lower(username)=lower(trim(p_metail_username)) limit 1;
 if a.id is null then raise exception 'That Met-Ail account does not belong to this profile.'; end if;
 select password_hash into h from public.metail_credentials where account_id=a.id;
 if h is null or p_metail_password is null or extensions.crypt(p_metail_password,h)<>h then raise exception 'Met-Ail password verification failed.'; end if;
 insert into public.metcount_security_credentials(user_id,vault_password_hash) values(u,extensions.crypt(p_new_password,extensions.gen_salt('bf',12)))
 on conflict(user_id) do update set vault_password_hash=excluded.vault_password_hash,updated_at=now();
 return jsonb_build_object('ok',true);
end; $function$;

create or replace function public.metcount_setup_metbank_password(p_password text,p_vault_password text,p_extra_pin text default null) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid; n integer;
begin
 u:=public._metcount_require_security(p_vault_password,p_extra_pin);
 if p_password is null or length(p_password)<8 or length(p_password)>128 then raise exception 'Choose a Metank password between 8 and 128 characters.'; end if;
 insert into public.metcount_security_credentials(user_id,bank_password_hash) values(u,extensions.crypt(p_password,extensions.gen_salt('bf',12)))
 on conflict(user_id) do update set bank_password_hash=excluded.bank_password_hash,updated_at=now() where public.metcount_security_credentials.bank_password_hash is null;
 get diagnostics n=row_count;
 if n=0 then raise exception 'Metank already has a password.'; end if;
 return jsonb_build_object('ok',true);
end; $function$;

create or replace function public.metcount_verify_metbank_password(p_password text,p_vault_password text,p_extra_pin text default null) returns boolean
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid; h text;
begin
 u:=public._metcount_require_security(p_vault_password,p_extra_pin);
 select bank_password_hash into h from public.metcount_security_credentials where user_id=u;
 if h is null then raise exception 'Set a Metank password first.'; end if;
 return p_password is not null and extensions.crypt(p_password,h)=h;
end; $function$;

create or replace function public.metcount_set_currency(p_currency text,p_vault_password text,p_extra_pin text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $function$
declare u uuid;
begin
 u:=public._metcount_require_security(p_vault_password,p_extra_pin);
 if p_currency not in ('JP','INR','USD','EUR','GBP','JPY','KRW') then raise exception 'Unsupported currency.'; end if;
 update public.metcount_security_credentials set currency_code=p_currency,updated_at=now() where user_id=u;
 return jsonb_build_object('ok',true,'currency_code',p_currency);
end; $function$;

create or replace function public.metcount_set_extra_security(p_enabled boolean,p_pin text,p_vault_password text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); h text;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 select vault_password_hash into h from public.metcount_security_credentials where user_id=u for update;
 if h is null or p_vault_password is null or extensions.crypt(p_vault_password,h)<>h then raise exception 'Verify your MetCount password first.'; end if;
 if coalesce(p_enabled,false) then
  if p_pin is null or length(p_pin)<4 or length(p_pin)>128 then raise exception 'Extra PIN/password must be 4–128 characters.'; end if;
  update public.metcount_security_credentials set extra_security_enabled=true,extra_pin_hash=extensions.crypt(p_pin,extensions.gen_salt('bf',12)),updated_at=now() where user_id=u;
 else update public.metcount_security_credentials set extra_security_enabled=false,extra_pin_hash=null,updated_at=now() where user_id=u; end if;
 return jsonb_build_object('ok',true,'enabled',coalesce(p_enabled,false));
end; $function$;

create or replace function public.metcount_verify_extra_pin(p_pin text) returns boolean
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); v public.metcount_security_credentials%rowtype;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 select * into v from public.metcount_security_credentials where user_id=u;
 if not coalesce(v.extra_security_enabled,false) then return true; end if;
 return p_pin is not null and v.extra_pin_hash is not null and extensions.crypt(p_pin,v.extra_pin_hash)=v.extra_pin_hash;
end; $function$;

create or replace function public.metcount_add_instapay(p_amount_inr numeric,p_vault_password text,p_metbank_password text,p_extra_pin text default null) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid; a public.profiles%rowtype; c public.metcount_security_credentials%rowtype; j numeric;
begin
 u:=public._metcount_require_security(p_vault_password,p_extra_pin);
 if p_amount_inr is null or p_amount_inr<=0 or p_amount_inr>100000000 then raise exception 'Enter a valid top-up amount.'; end if;
 select * into c from public.metcount_security_credentials where user_id=u;
 if c.bank_password_hash is null or p_metbank_password is null or extensions.crypt(p_metbank_password,c.bank_password_hash)<>c.bank_password_hash then raise exception 'Metank password verification failed.'; end if;
 j:=round(p_amount_inr/100,2); if j<=0 then raise exception 'Amount is too small to convert to JP.'; end if;
 select * into a from public.profiles where id=u for update;
 if a.balance<p_amount_inr then raise exception 'Insufficient Metank balance.'; end if;
 update public.profiles set balance=balance-p_amount_inr,jp_balance=jp_balance+j,updated_at=now() where id=u;
 insert into public.transactions(user_id,type,amount,note) values(u,'InstaPay top-up',-p_amount_inr,'Converted ₹'||p_amount_inr||' to '||j||' JP');
 insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(u,j,'credit','InstaPay top-up from Metank balance');
 return jsonb_build_object('ok',true,'added_jp',j);
end; $function$;

create or replace function public.metcount_transfer_jp(p_recipient_username text,p_amount_jp numeric,p_metpay_password text,p_vault_password text,p_extra_pin text default null) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid; s public.profiles%rowtype; r public.profiles%rowtype; h text;
begin
 u:=public._metcount_require_security(p_vault_password,p_extra_pin);
 if p_amount_jp is null or p_amount_jp<=0 or p_amount_jp>1000000000 then raise exception 'Enter a valid payment amount.'; end if;
 select password_hash into h from public.metpay_passwords where user_id=u;
 if h is null or p_metpay_password is null or extensions.crypt(p_metpay_password,h)<>h then raise exception 'MetPay password verification failed.'; end if;
 select * into s from public.profiles where id=u for update;
 select * into r from public.profiles where lower(username)=lower(trim(p_recipient_username)) for update;
 if r.id is null then raise exception 'Recipient not found.'; end if;
 if r.id=s.id then raise exception 'You cannot pay yourself.'; end if;
 if s.jp_balance<p_amount_jp then raise exception 'Insufficient InstaPay balance.'; end if;
 update public.profiles set jp_balance=jp_balance-p_amount_jp,updated_at=now() where id=s.id;
 update public.profiles set jp_balance=jp_balance+p_amount_jp,updated_at=now() where id=r.id;
 insert into public.transactions(user_id,type,amount,note) values(s.id,'MetPay transfer out',-p_amount_jp,'Paid '||r.username),(r.id,'MetPay transfer in',p_amount_jp,'Received from '||s.username);
 insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(s.id,-p_amount_jp,'debit','MetPay to '||r.username),(r.id,p_amount_jp,'credit','MetPay from '||s.username);
 return jsonb_build_object('ok',true,'recipient',r.username,'amount_jp',p_amount_jp);
end; $function$;

create or replace function public.metcount_buy_subscription(p_tier text,p_price numeric,p_vault_password text,p_extra_pin text default null) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid; a public.profiles%rowtype; price numeric; j numeric; start_at timestamptz; expiry timestamptz;
begin
 u:=public._metcount_require_security(p_vault_password,p_extra_pin);
 price:=case p_tier when 'Base' then 500 when 'Premium' then 2000 when 'Elite' then 10000 else null end;
 if price is null or p_price is distinct from price then raise exception 'Invalid subscription or price.'; end if;
 select * into a from public.profiles where id=u for update;
 j:=round(price/100,2); if coalesce(a.jp_balance,0)<j then raise exception 'Insufficient InstaPay balance. Required: % π',j; end if;
 select greatest(coalesce(max(expires_at) filter(where expires_at>now()),now()),now()) into start_at from public.subscriptions where user_id=u and tier=p_tier;
 expiry:=start_at+interval '1 month';
 update public.profiles set jp_balance=jp_balance-j,subscription_tier=p_tier,subscription_until=expiry,updated_at=now() where id=u;
 insert into public.subscriptions(user_id,tier,price,started_at,expires_at) values(u,p_tier,price,start_at,expiry);
 insert into public.transactions(user_id,type,amount,note) values(u,'Subscription (InstaPay)',-j,p_tier||' monthly subscription; listed price ₹'||price);
 insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(u,-j,'debit','Monthly MetCount subscription '||p_tier);
 return jsonb_build_object('success',true,'tier',p_tier,'price_inr',price,'price_jp',j,'expires_at',expiry);
end; $function$;

create or replace function public.metcount_trade_stock(p_ticker text,p_side text,p_vault_password text,p_extra_pin text default null) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid; t text; side_ text; snap public.market_snapshots%rowtype; p numeric; cur text; inr numeric; jp numeric; a public.profiles%rowtype; h public.portfolio_holdings%rowtype;
begin
 u:=public._metcount_require_security(p_vault_password,p_extra_pin);
 t:=upper(trim(coalesce(p_ticker,''))); side_:=lower(trim(coalesce(p_side,'')));
 if t !~ '^[A-Z0-9.^=-]{1,20}$' then raise exception 'Invalid stock ticker.'; end if;
 if side_ not in ('buy','sell') then raise exception 'Choose Buy or Sell.'; end if;
 select * into snap from public.market_snapshots where ticker=t and as_of>=now()-interval '15 minutes' order by as_of desc limit 1;
 if snap.id is null then raise exception 'Fresh stock quote required. Search again before trading.'; end if;
 p:=nullif(snap.payload->>'currentPrice','')::numeric; cur:=upper(coalesce(snap.payload->>'currency',''));
 if p is null or p<=0 then raise exception 'Invalid saved stock quote.'; end if;
 inr:=case cur when 'INR' then p when 'USD' then p/0.012 when 'EUR' then p/0.011 when 'GBP' then p/0.0095 when 'JPY' then p/1.8 when 'KRW' then p/16.2 else null end;
 if inr is null or inr<=0 then raise exception using message='Unsupported quote currency: '||cur; end if;
 jp:=round(inr/100,2); if jp<=0 then raise exception 'Price is below supported transaction precision.'; end if;
 select * into a from public.profiles where id=u for update;
 select * into h from public.portfolio_holdings where user_id=u and ticker=t for update;
 if side_='buy' then
  if coalesce(a.jp_balance,0)<jp then raise exception 'Insufficient InstaPay balance. Required: % π',jp; end if;
  if h.user_id is null then insert into public.portfolio_holdings(user_id,ticker,shares,average_buy) values(u,t,1,inr);
  else update public.portfolio_holdings set shares=shares+1,average_buy=((average_buy*shares)+inr)/(shares+1),updated_at=now() where user_id=u and ticker=t; end if;
  update public.profiles set jp_balance=jp_balance-jp,updated_at=now() where id=u;
  insert into public.transactions(user_id,type,amount,note) values(u,'Stock Buy (InstaPay)',-jp,t||'; listed price ₹'||round(inr,2));
  insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(u,-jp,'debit','Metrade stock purchase '||t);
 else
  if h.user_id is null or h.shares<1 then raise exception using message='You do not own a share of '||t||'.'; end if;
  if h.shares=1 then delete from public.portfolio_holdings where user_id=u and ticker=t;
  else update public.portfolio_holdings set shares=shares-1,updated_at=now() where user_id=u and ticker=t; end if;
  update public.profiles set jp_balance=jp_balance+jp,updated_at=now() where id=u;
  insert into public.transactions(user_id,type,amount,note) values(u,'Stock Sell (InstaPay)',jp,t||'; sale at ₹'||round(inr,2)||' equivalent');
  insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(u,jp,'credit','Metrade stock sale '||t);
 end if;
 insert into public.stock_observations(user_id,ticker,price) values(u,t,inr);
 return jsonb_build_object('success',true,'ticker',t,'side',side_,'price_native',p,'currency',cur,'price_inr',round(inr,2),'amount_jp',jp);
end; $function$;

create or replace function public.metcount_record_stock_observation(p_ticker text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $function$
declare u uuid:=auth.uid(); t text; snap public.market_snapshots%rowtype; p numeric; c text; inr numeric;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 t:=upper(trim(coalesce(p_ticker,''))); if t !~ '^[A-Z0-9.^=-]{1,20}$' then raise exception 'Invalid stock ticker.'; end if;
 select * into snap from public.market_snapshots where ticker=t and as_of>=now()-interval '15 minutes' order by as_of desc limit 1;
 if snap.id is null then raise exception 'Fresh quote unavailable.'; end if;
 p:=nullif(snap.payload->>'currentPrice','')::numeric;c:=upper(coalesce(snap.payload->>'currency',''));
 inr:=case c when 'INR' then p when 'USD' then p/0.012 when 'EUR' then p/0.011 when 'GBP' then p/0.0095 when 'JPY' then p/1.8 when 'KRW' then p/16.2 else null end;
 if inr is null or inr<=0 then raise exception 'Unsupported quote currency.'; end if;
 insert into public.stock_observations(user_id,ticker,price) values(u,t,inr);
 return jsonb_build_object('ok',true,'ticker',t,'price_inr',round(inr,2));
end; $function$;

create or replace function public.metcount_metail_inbox(p_username text,p_password text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); a public.metail_accounts%rowtype; h text; email_ text; rows_ jsonb;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 select * into a from public.metail_accounts where user_id=u and lower(username)=lower(trim(p_username)) limit 1;
 if a.id is null then raise exception 'Met-Ail account does not belong to this profile.'; end if;
 select password_hash into h from public.metail_credentials where account_id=a.id;
 if h is null or p_password is null or extensions.crypt(p_password,h)<>h then raise exception 'Incorrect Met-Ail password.'; end if;
 email_:=lower(a.username||'@metail.com');
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'sender',sender,'recipient',recipient,'subject',subject,'body',body,'created_at',created_at,'is_read',is_read) order by created_at desc),'[]'::jsonb)
 into rows_ from (select id,sender,recipient,subject,body,created_at,is_read from public.metmail_messages where owner_id=u and lower(account_email)=email_ and folder='Inbox' order by created_at desc limit 80) q;
 return jsonb_build_object('messages',rows_,'account',a.username);
end; $function$;

create or replace function public.metcount_metail_mark_read(p_username text,p_password text,p_message_id uuid) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); a public.metail_accounts%rowtype; h text; email_ text; n integer;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 select * into a from public.metail_accounts where user_id=u and lower(username)=lower(trim(p_username)) limit 1;
 if a.id is null then raise exception 'Met-Ail account does not belong to this profile.'; end if;
 select password_hash into h from public.metail_credentials where account_id=a.id;
 if h is null or p_password is null or extensions.crypt(p_password,h)<>h then raise exception 'Incorrect Met-Ail password.'; end if;
 email_:=lower(a.username||'@metail.com');
 update public.metmail_messages set is_read=true where id=p_message_id and owner_id=u and lower(account_email)=email_ and folder='Inbox';
 get diagnostics n=row_count;if n=0 then raise exception 'Inbox message not found.'; end if;
 return jsonb_build_object('ok',true);
end; $function$;

create or replace function public.metcount_metail_reply(p_username text,p_password text,p_message_id uuid,p_body text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare u uuid:=auth.uid(); a public.metail_accounts%rowtype; h text; email_ text; m public.metmail_messages%rowtype; recipient_ text; out_ jsonb;
begin
 if u is null then raise exception 'Sign in first.'; end if;
 if p_body is null or length(trim(p_body))<1 or length(p_body)>10000 then raise exception 'Reply must be 1–10000 characters.'; end if;
 select * into a from public.metail_accounts where user_id=u and lower(username)=lower(trim(p_username)) limit 1;
 if a.id is null then raise exception 'Met-Ail account does not belong to this profile.'; end if;
 select password_hash into h from public.metail_credentials where account_id=a.id;
 if h is null or p_password is null or extensions.crypt(p_password,h)<>h then raise exception 'Incorrect Met-Ail password.'; end if;
 email_:=lower(a.username||'@metail.com');
 select * into m from public.metmail_messages where id=p_message_id and owner_id=u and lower(account_email)=email_ and folder='Inbox' limit 1;
 if m.id is null then raise exception 'Inbox message not found.'; end if;
 recipient_:=split_part(lower(m.sender),'@',1);if length(recipient_)<3 then raise exception 'Sender is not a valid Met-Ail address.'; end if;
 out_:=public.metxon_send_metail_message(a.username,recipient_,'Re: '||left(coalesce(m.subject,''),190),trim(p_body));
 return jsonb_build_object('ok',true,'result',out_);
end; $function$;

-- Compatibility RPCs used by the existing Metxon corporate MetCount panel.
create or replace function public.metxon_sell_stock(stock_ticker text,share_price numeric) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $function$
declare a public.profiles%rowtype; h public.portfolio_holdings%rowtype; j numeric;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 if share_price is null or share_price<=0 then raise exception 'Invalid stock price.'; end if;
 select * into a from public.profiles where id=auth.uid() for update;
 select * into h from public.portfolio_holdings where user_id=a.id and ticker=upper(trim(stock_ticker)) for update;
 if h.user_id is null or h.shares<1 then raise exception 'No shares held.'; end if;
 j:=round(share_price/100,2);if j<=0 then raise exception 'Sale value is too small.'; end if;
 if h.shares=1 then delete from public.portfolio_holdings where user_id=a.id and ticker=upper(trim(stock_ticker));
 else update public.portfolio_holdings set shares=shares-1,updated_at=now() where user_id=a.id and ticker=upper(trim(stock_ticker));end if;
 update public.profiles set jp_balance=jp_balance+j,updated_at=now() where id=a.id;
 insert into public.stock_observations(user_id,ticker,price) values(a.id,upper(trim(stock_ticker)),share_price);
 insert into public.transactions(user_id,type,amount,note) values(a.id,'Stock Sell (InstaPay)',j,upper(trim(stock_ticker))||'; listed price ₹'||share_price);
 insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(a.id,j,'credit','InstaPay stock sale '||upper(trim(stock_ticker)));
 return jsonb_build_object('success',true,'ticker',upper(trim(stock_ticker)),'amount_jp',j);
end; $function$;

create or replace function public.metxon_buy_subscription(tier_name text,tier_price numeric) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $function$
declare a public.profiles%rowtype; price numeric; j numeric; start_at timestamptz; expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 select * into a from public.profiles where id=auth.uid() for update;
 price:=case tier_name when 'Base' then 500 when 'Premium' then 2000 when 'Elite' then 10000 else null end;
 if price is null or tier_price is distinct from price then raise exception 'Subscription price mismatch.'; end if;
 j:=round(price/100,2);if coalesce(a.jp_balance,0)<j then raise exception 'Insufficient InstaPay balance. Required: % π',j; end if;
 select greatest(coalesce(max(expires_at) filter(where expires_at>now()),now()),now()) into start_at from public.subscriptions where user_id=a.id and tier=tier_name;
 expiry:=start_at+interval '1 month';
 update public.profiles set jp_balance=jp_balance-j,subscription_tier=tier_name,subscription_until=expiry,updated_at=now() where id=a.id;
 insert into public.subscriptions(user_id,tier,price,started_at,expires_at) values(a.id,tier_name,price,start_at,expiry);
 insert into public.transactions(user_id,type,amount,note) values(a.id,'Subscription (InstaPay)',-j,tier_name||' monthly subscription; listed price ₹'||price);
 insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note) values(a.id,-j,'debit','Monthly MetCount subscription '||tier_name);
 return jsonb_build_object('success',true,'tier',tier_name,'expires_at',expiry);
end; $function$;

revoke all on function public.metcount_security_status() from public,anon;
revoke all on function public.metcount_set_vault_password(text) from public,anon;
revoke all on function public.metcount_verify_vault_password(text) from public,anon;
revoke all on function public.metcount_change_vault_password(text,text) from public,anon;
revoke all on function public.metcount_reset_vault_with_metail(text,text,text) from public,anon;
revoke all on function public.metcount_setup_metbank_password(text,text,text) from public,anon;
revoke all on function public.metcount_verify_metbank_password(text,text,text) from public,anon;
revoke all on function public.metcount_set_currency(text,text,text) from public,anon;
revoke all on function public.metcount_set_extra_security(boolean,text,text) from public,anon;
revoke all on function public.metcount_verify_extra_pin(text) from public,anon;
revoke all on function public.metcount_add_instapay(numeric,text,text,text) from public,anon;
revoke all on function public.metcount_transfer_jp(text,numeric,text,text,text) from public,anon;
revoke all on function public.metcount_buy_subscription(text,numeric,text,text) from public,anon;
revoke all on function public.metcount_trade_stock(text,text,text,text) from public,anon;
revoke all on function public.metcount_record_stock_observation(text) from public,anon;
revoke all on function public.metcount_metail_inbox(text,text) from public,anon;
revoke all on function public.metcount_metail_mark_read(text,text,uuid) from public,anon;
revoke all on function public.metcount_metail_reply(text,text,uuid,text) from public,anon;
revoke all on function public.metxon_sell_stock(text,numeric) from public,anon;
revoke all on function public.metxon_buy_subscription(text,numeric) from public,anon;
grant execute on function public.metcount_security_status() to authenticated;
grant execute on function public.metcount_set_vault_password(text) to authenticated;
grant execute on function public.metcount_verify_vault_password(text) to authenticated;
grant execute on function public.metcount_change_vault_password(text,text) to authenticated;
grant execute on function public.metcount_reset_vault_with_metail(text,text,text) to authenticated;
grant execute on function public.metcount_setup_metbank_password(text,text,text) to authenticated;
grant execute on function public.metcount_verify_metbank_password(text,text,text) to authenticated;
grant execute on function public.metcount_set_currency(text,text,text) to authenticated;
grant execute on function public.metcount_set_extra_security(boolean,text,text) to authenticated;
grant execute on function public.metcount_verify_extra_pin(text) to authenticated;
grant execute on function public.metcount_add_instapay(numeric,text,text,text) to authenticated;
grant execute on function public.metcount_transfer_jp(text,numeric,text,text,text) to authenticated;
grant execute on function public.metcount_buy_subscription(text,numeric,text,text) to authenticated;
grant execute on function public.metcount_trade_stock(text,text,text,text) to authenticated;
grant execute on function public.metcount_record_stock_observation(text) to authenticated;
grant execute on function public.metcount_metail_inbox(text,text) to authenticated;
grant execute on function public.metcount_metail_mark_read(text,text,uuid) to authenticated;
grant execute on function public.metcount_metail_reply(text,text,uuid,text) to authenticated;
grant execute on function public.metxon_sell_stock(text,numeric) to authenticated;
grant execute on function public.metxon_buy_subscription(text,numeric) to authenticated;
create index if not exists market_snapshots_ticker_asof_idx on public.market_snapshots(ticker,as_of desc);
create index if not exists subscriptions_user_tier_expiry_idx on public.subscriptions(user_id,tier,expires_at desc);
