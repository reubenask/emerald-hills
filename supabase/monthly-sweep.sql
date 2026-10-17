-- Server check: every 5 minutes, finish marking submitted tests the student left unfinished and email them.
-- Before running: set the SWEEP_SECRET function secret, and store the same value in Vault as monthly_sweep_secret:
--   select vault.create_secret('<same value as SWEEP_SECRET>','monthly_sweep_secret');
-- <gateway anon key> is the gatewayKey in monthly-exams/shared/cloud-config.js.
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule('monthly-mark-sweep','*/5 * * * *', $$
  select net.http_post(
    url:='https://vknfagvmdirmpgtjlhjr.supabase.co/functions/v1/monthly-mark',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer <gateway anon key>',
      'x-sweep-secret',(select decrypted_secret from vault.decrypted_secrets where name='monthly_sweep_secret')),
    body:='{}'::jsonb, timeout_milliseconds:=150000);
$$);
