-- MetCount-only secure Care checkout and password recovery normalization.
-- Payments verify the separate MetCount password and configured extra PIN.
create or replace function public.metcount_buy_care_plan(
  p_plan_code text,
  p_plan_price numeric,
  p_vault_password text,
  p_extra_pin text default null
) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp
as $function$
declare
  v_uid uuid;
  v_profile public.profiles%rowtype;
  v_plan text := lower(trim(coalesce(p_plan_code,'')));
  v_canonical_price numeric(14,2) := 500000;
  v_jp numeric(14,2) := 5000;
  v_start timestamptz;
  v_expiry timestamptz;
begin
  v_uid := public._metcount_require_security(p_vault_password,p_extra_pin);
  if v_plan not in ('care_plus','care_ultra') then raise exception 'Invalid Metxon Care plan.'; end if;
  if p_plan_price is null or p_plan_price is distinct from v_canonical_price then raise exception 'Care plan price changed. Refresh and try again.'; end if;
  select * into v_profile from public.profiles where id=v_uid for update;
  if not found then raise exception 'Your Metxon profile was not found.'; end if;
  if coalesce(v_profile.jp_balance,0)<v_jp then raise exception 'Insufficient InstaPay balance. Required: π5,000 JP.'; end if;
  select greatest(now(),coalesce(max(expires_at) filter(where expires_at>now()),now()))
    into v_start from public.metxon_care_subscriptions where user_id=v_uid and plan_code=v_plan;
  if v_plan='care_plus' then v_expiry:=v_start+interval '3 months';
  else v_expiry:=v_start+interval '1 month'; end if;
  update public.profiles set jp_balance=jp_balance-v_jp,updated_at=now() where id=v_uid;
  insert into public.metxon_care_subscriptions(user_id,plan_code,price,started_at,expires_at)
    values(v_uid,v_plan,v_canonical_price,v_start,v_expiry);
  insert into public.transactions(user_id,type,amount,note)
    values(v_uid,'Metxon Care (InstaPay)',-v_jp,
      case when v_plan='care_plus' then 'Metxon Care+ subscription, 3 months; listed price ₹500000'
      else 'Metxon Care Ultra subscription, 1 month; listed price ₹500000' end);
  insert into public.metxon_jp_transactions(user_id,amount,transaction_type,note)
    values(v_uid,-v_jp,'debit',
      case when v_plan='care_plus' then 'Metxon Care+ subscription' else 'Metxon Care Ultra subscription' end);
  return jsonb_build_object('success',true,'plan_code',v_plan,'price_inr',v_canonical_price,
    'debited_jp',v_jp,'started_at',v_start,'expires_at',v_expiry);
end;
$function$;
revoke all on function public.metcount_buy_care_plan(text,numeric,text,text) from public,anon;
grant execute on function public.metcount_buy_care_plan(text,numeric,text,text) to authenticated;

create or replace function public.metcount_reset_vault_with_metail(
  p_metail_username text,p_metail_password text,p_new_password text
) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp
as $function$
declare
  v_uid uuid:=auth.uid();
  v_account public.metail_accounts%rowtype;
  v_hash text;
  v_name text:=lower(trim(coalesce(p_metail_username,'')));
begin
  if v_uid is null then raise exception 'Sign in to the matching Metxon account first.'; end if;
  if p_new_password is null or char_length(p_new_password)<8 or char_length(p_new_password)>128 then
    raise exception 'New MetCount password must be 8–128 characters.';
  end if;
  if right(v_name,11)='@metail.com' then v_name:=left(v_name,length(v_name)-11); end if;
  if v_name='' then raise exception 'Enter your Met-Ail username or full @metail.com address.'; end if;
  select * into v_account from public.metail_accounts
   where user_id=v_uid and lower(username)=v_name limit 1;
  if v_account.id is null then raise exception 'That Met-Ail account is not linked to your signed-in Metxon profile.'; end if;
  select password_hash into v_hash from public.metail_credentials where account_id=v_account.id;
  if v_hash is null or p_metail_password is null or extensions.crypt(p_metail_password,v_hash)<>v_hash then
    raise exception 'Met-Ail password verification failed. Use the Met-Ail password, not your Metxon account password.';
  end if;
  insert into public.metcount_security_credentials(user_id,vault_password_hash)
    values(v_uid,extensions.crypt(p_new_password,extensions.gen_salt('bf',12)))
    on conflict(user_id) do update set vault_password_hash=excluded.vault_password_hash,updated_at=now();
  return jsonb_build_object('ok',true,'metail_username',v_account.username);
end;
$function$;
revoke all on function public.metcount_reset_vault_with_metail(text,text,text) from public,anon;
grant execute on function public.metcount_reset_vault_with_metail(text,text,text) to authenticated;
