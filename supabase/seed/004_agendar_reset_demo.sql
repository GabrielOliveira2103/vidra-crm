-- Agenda o reset diário da empresa de demonstração (requer 003_empresa_demonstracao.sql).
-- Antes: Supabase → Database → Extensions → ative "pg_cron".
-- Horário em UTC: 06:00 UTC = 03:00 em Brasília. Rodar de novo apenas atualiza o agendamento.
select cron.schedule(
  'resetar-empresa-demonstracao',
  '0 6 * * *',
  'select public.resetar_empresa_demonstracao()'
);

-- Conferir:  select jobname, schedule, active from cron.job;
-- Histórico: select status, start_time, return_message from cron.job_run_details order by start_time desc limit 5;
-- Remover:   select cron.unschedule('resetar-empresa-demonstracao');
