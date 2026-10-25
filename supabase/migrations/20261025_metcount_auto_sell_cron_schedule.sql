-- Schedule a secure server-side quote monitor for pending MetCount auto-sell rules.
-- Secrets are stored in Supabase Vault and are not included in this migration.
do $schedule$
declare j record;
begin
  for j in select jobid from cron.job where jobname='metcount-auto-sell-monitor' loop
    perform cron.unschedule(j.jobid);
  end loop;
  perform cron.schedule(
    'metcount-auto-sell-monitor',
    '* * * * *',
    $command$
      select net.http_post(
        url := 'https://brahcvovidgjjzpkxsms.supabase.co/functions/v1/metcount-auto-sell-monitor',
        body := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'apikey',(select decrypted_secret from vault.decrypted_secrets where name='metcount_auto_sell_publishable_key'),
          'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='metcount_auto_sell_cron_secret')
        )
      );
    $command$
  );
end;
$schedule$;
