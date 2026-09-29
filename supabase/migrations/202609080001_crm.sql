-- CRM de empresa única. Acesso apenas a usuários convidados/autorizados.
begin;
create type public.lead_status as enum ('novo','qualificando','aguardando_visita','visita_agendada','visita_realizada','orcamento_pendente','orcamento_enviado','negociacao','fechado','perdido');
create type public.orcamento_status as enum ('rascunho','enviado','aceito','recusado','expirado');
create type public.visita_status as enum ('agendada','confirmada','realizada','cancelada');
create type public.interacao_tipo as enum ('mensagem_cliente','mensagem_ia','mensagem_atendente','ligacao','observacao','followup');
create table public.crm_usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create function public.crm_autorizado() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.crm_usuarios where id = (select auth.uid()));
$$;
revoke all on function public.crm_autorizado() from public;
grant execute on function public.crm_autorizado() to authenticated;
alter table public.crm_usuarios enable row level security;
revoke all on public.crm_usuarios from authenticated;
create policy "Consultar propria autorizacao" on public.crm_usuarios for select to authenticated using (id = (select auth.uid()));
grant select on public.crm_usuarios to authenticated;

create function public.normalizar_telefone(valor text) returns text language plpgsql immutable set search_path = '' as $$
declare digitos text := regexp_replace(coalesce(valor,''), '[^0-9]', '', 'g');
begin
  if trim(coalesce(valor,'')) like '+%' and digitos !~ '^55[1-9][0-9][0-9]{8,9}$' then
    raise exception 'Informe telefone brasileiro com DDD.' using errcode = '22023';
  end if;
  if length(digitos) in (10,11) then digitos := '55' || digitos; end if;
  if digitos !~ '^55[1-9][0-9][0-9]{8,9}$' then
    raise exception 'Informe telefone brasileiro com DDD (10 ou 11 dígitos), ou 55 + DDD + número.' using errcode = '22023';
  end if;
  return '+' || digitos;
end; $$;

create table public.clientes (
  id uuid primary key default gen_random_uuid(), nome text not null check(length(trim(nome)) > 0),
  telefone text not null unique, email text, cidade text, bairro text, cep text, endereco text, numero text, complemento text,
  demonstracao boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.servicos (
  id uuid primary key default gen_random_uuid(), nome text not null unique check(length(trim(nome)) > 0),
  descricao text, ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), cliente_id uuid not null references public.clientes(id) on delete restrict,
  servico uuid not null references public.servicos(id) on delete restrict,
  descricao text, medidas text, tipo_vidro text, cor_vidro text, prazo_desejado date,
  origem text not null default 'Outro' check(origem in ('WhatsApp','Instagram','Facebook','Google','Indicação','Site','Telefone','Outro')),
  status public.lead_status not null default 'novo', necessita_visita boolean not null default false, observacoes text,
  etapa_desde timestamptz not null default now(), fechado_em timestamptz,
  external_id text unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status = 'fechado') = (fechado_em is not null))
);
create sequence public.numero_orcamento_seq;
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id) on delete restrict,
  numero_orcamento text not null unique default ('ORC-' || lpad(nextval('public.numero_orcamento_seq')::text,6,'0')),
  valor numeric(14,2) not null check(valor >= 0), desconto numeric(14,2) not null default 0 check(desconto >= 0 and desconto <= valor),
  valor_final numeric(14,2) generated always as (valor - desconto) stored,
  status public.orcamento_status not null default 'rascunho', data_envio timestamptz, validade date,
  aceito_em timestamptz, observacoes text, external_id text unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(status not in ('enviado','aceito','recusado','expirado') or data_envio is not null)
);
create unique index um_orcamento_aceito_por_lead on public.orcamentos(lead_id) where status = 'aceito';
create table public.visitas (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id) on delete restrict,
  data date not null, horario time not null, endereco text not null check(length(trim(endereco)) > 0), responsavel text not null check(length(trim(responsavel)) > 0),
  status public.visita_status not null default 'agendada', observacoes text, external_id text unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.interacoes (
  id uuid primary key default gen_random_uuid(), cliente_id uuid not null references public.clientes(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete restrict, origem text not null default 'CRM', tipo public.interacao_tipo not null default 'observacao',
  mensagem text not null check(length(trim(mensagem)) > 0), external_id text unique, created_at timestamptz not null default now()
);
create table public.arquivos (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id) on delete restrict,
  tipo text not null check(tipo in ('foto','imagem_local','medidas','referencia','documento')),
  nome text not null, url text not null unique, descricao text,
  created_at timestamptz not null default now(),
  check(url like lead_id::text || '/%'), check(url !~ '(^|/)\.\.(/|$)')
);
comment on column public.arquivos.url is 'Caminho privado no bucket lead-arquivos: <lead_uuid>/<uuid>-<nome>. Nunca URL pública ou assinada.';
create table public.lead_historico (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id) on delete restrict,
  status_anterior public.lead_status, status_novo public.lead_status not null,
  created_at timestamptz not null default now()
);

create function public.atualizar_timestamp() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create function public.preparar_cliente() returns trigger language plpgsql set search_path = '' as $$
begin new.telefone := public.normalizar_telefone(new.telefone); return new; end; $$;
create trigger normalizar_cliente before insert or update of telefone on public.clientes for each row execute function public.preparar_cliente();
create function public.preparar_lead() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.etapa_desde := new.created_at;
    if new.status = 'fechado' then new.fechado_em := coalesce(new.fechado_em,new.created_at); else new.fechado_em := null; end if;
  elsif new.status is distinct from old.status then
    new.etapa_desde := now();
    new.fechado_em := case when new.status = 'fechado' then now() else null end;
  else new.etapa_desde := old.etapa_desde; new.fechado_em := old.fechado_em;
  end if;
  return new;
end; $$;
create trigger preparar_lead before insert or update on public.leads for each row execute function public.preparar_lead();
create function public.registrar_etapa() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_historico(lead_id,status_novo,created_at) values(new.id,new.status,new.created_at);
  elsif new.status is distinct from old.status then
    insert into public.lead_historico(lead_id,status_anterior,status_novo) values(new.id,old.status,new.status);
  end if;
  return new;
end; $$;
create trigger registrar_etapa after insert or update on public.leads for each row execute function public.registrar_etapa();
create function public.preparar_orcamento() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status <> 'rascunho' then new.data_envio := coalesce(new.data_envio,now()); end if;
  if new.status = 'aceito' then new.aceito_em := coalesce(new.aceito_em,now()); else new.aceito_em := null; end if;
  return new;
end; $$;
create trigger preparar_orcamento before insert or update on public.orcamentos for each row execute function public.preparar_orcamento();
create function public.validar_interacao() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.lead_id is not null and not exists(select 1 from public.leads where id = new.lead_id and cliente_id = new.cliente_id) then
    raise exception 'O lead precisa pertencer ao cliente da interação.';
  end if;
  return new;
end; $$;
create trigger validar_interacao before insert or update on public.interacoes for each row execute function public.validar_interacao();
create function public.bloquear_troca_cliente() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.cliente_id is distinct from old.cliente_id then raise exception 'O cliente de um lead não pode ser substituído. Crie outra oportunidade.'; end if;
  return new;
end; $$;
create trigger bloquear_troca_cliente before update of cliente_id on public.leads for each row execute function public.bloquear_troca_cliente();

do $$ declare tabela text; begin
  foreach tabela in array array['clientes','servicos','leads','orcamentos','visitas'] loop
    execute format('create trigger atualizar_timestamp before update on public.%I for each row execute function public.atualizar_timestamp()',tabela);
  end loop;
  foreach tabela in array array['clientes','servicos','leads','orcamentos','visitas','interacoes','arquivos'] loop
    execute format('revoke all on public.%I from authenticated',tabela);
    execute format('alter table public.%I enable row level security',tabela);
    execute format('create policy crm_select on public.%I for select to authenticated using ((select public.crm_autorizado()))',tabela);
    execute format('create policy crm_insert on public.%I for insert to authenticated with check ((select public.crm_autorizado()))',tabela);
    execute format('create policy crm_update on public.%I for update to authenticated using ((select public.crm_autorizado())) with check ((select public.crm_autorizado()))',tabela);
    execute format('grant select, insert, update on public.%I to authenticated',tabela);
  end loop;
end; $$;
alter table public.lead_historico enable row level security;
revoke all on public.lead_historico from authenticated;
create policy crm_historico_select on public.lead_historico for select to authenticated using ((select public.crm_autorizado()));
grant select on public.lead_historico to authenticated;
create policy crm_arquivo_delete on public.arquivos for delete to authenticated using ((select public.crm_autorizado()));
grant delete on public.arquivos to authenticated;
grant usage on sequence public.numero_orcamento_seq to authenticated;
grant execute on function public.normalizar_telefone(text) to authenticated;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
create index leads_cliente_idx on public.leads(cliente_id);
create index leads_status_idx on public.leads(status,etapa_desde);
create index leads_periodo_idx on public.leads(created_at);
create index leads_servico_idx on public.leads(servico);
create index orcamentos_lead_idx on public.orcamentos(lead_id);
create index visitas_lead_idx on public.visitas(lead_id);
create index visitas_data_idx on public.visitas(data,status);
create index interacoes_cliente_idx on public.interacoes(cliente_id,created_at desc);
create index interacoes_lead_idx on public.interacoes(lead_id,created_at desc);
create index arquivos_lead_idx on public.arquivos(lead_id);
create index historico_lead_idx on public.lead_historico(lead_id,created_at);
commit;
