-- EMPRESA DE DEMONSTRAÇÃO (acesso de recrutadores)
-- Cria ou RESETA a empresa demo com dados fictícios. Pode ser executado várias vezes:
-- apaga somente os dados da empresa demo e recria tudo com datas relativas a hoje.
-- Automações do n8n (webhooks) são ignoradas para empresas marcadas como demonstração.
--
-- Usuário demo configurado na seção 3 (UUID de Authentication → Users). Não use o UUID da conta principal.
begin;

-- 1. Marcação de empresa de demonstração
alter table public.empresas add column if not exists demonstracao boolean not null default false;

insert into public.empresas (id, nome, demonstracao)
values ('d3e30000-0000-4000-8000-000000000001', 'Vidraçaria Demonstração', true)
on conflict (id) do update set demonstracao = true, ativo = true;

-- 2. Webhooks do n8n não disparam para empresas de demonstração
create or replace function public.notificar_orcamento_enviado()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.empresas e where e.id = new.empresa_id and e.demonstracao) then
    return new;
  end if;
  perform net.http_post(
    url := 'https://n8n.srv1703523.hstgr.cloud/webhook/crm-orcamento-enviado',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'n8n_webhook_secret')
    ),
    body := jsonb_build_object('evento', 'orcamento_enviado', 'record', to_jsonb(new), 'old_record', to_jsonb(old))
  );
  return new;
end; $$;

create or replace function public.notificar_visita_realizada()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.empresas e where e.id = new.empresa_id and e.demonstracao) then
    return new;
  end if;
  perform net.http_post(
    url := 'https://n8n.srv1703523.hstgr.cloud/webhook/crm-visita-realizada',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'n8n_webhook_secret')
    ),
    body := jsonb_build_object('evento', 'visita_realizada', 'record', to_jsonb(new), 'old_record', to_jsonb(old))
  );
  return new;
end; $$;

revoke execute on function public.notificar_orcamento_enviado() from public, anon, authenticated;
revoke execute on function public.notificar_visita_realizada() from public, anon, authenticated;

-- 3. Usuário demo vinculado à empresa demo (não altera usuários existentes)
insert into public.crm_usuarios (id, empresa_id, ativo)
values ('a721283e-0531-4c6d-9ea9-a3d0c48092b0', 'd3e30000-0000-4000-8000-000000000001', true)
on conflict (id) do nothing;

-- 4. Reset: remove somente os dados da empresa demo
delete from public.lead_historico
where lead_id in (select id from public.leads where empresa_id = 'd3e30000-0000-4000-8000-000000000001');
delete from public.arquivos
where lead_id in (select id from public.leads where empresa_id = 'd3e30000-0000-4000-8000-000000000001');
delete from public.atendimentos where empresa_id = 'd3e30000-0000-4000-8000-000000000001';
delete from public.interacoes   where empresa_id = 'd3e30000-0000-4000-8000-000000000001';
delete from public.visitas      where empresa_id = 'd3e30000-0000-4000-8000-000000000001';
delete from public.orcamentos   where empresa_id = 'd3e30000-0000-4000-8000-000000000001';
delete from public.leads        where empresa_id = 'd3e30000-0000-4000-8000-000000000001';
delete from public.clientes     where empresa_id = 'd3e30000-0000-4000-8000-000000000001';

-- 5. Clientes (telefones com DDD 00, que não existe: nenhuma mensagem chega a alguém real)
insert into public.clientes (id, empresa_id, nome, telefone, email, cidade, bairro, created_at)
select ('d3e3c000-0000-4000-8000-0000000000' || n)::uuid, 'd3e30000-0000-4000-8000-000000000001',
       nome, '+55009000000' || n, email, cidade, bairro, now() - (dias || ' days')::interval
from (values
  ('01', 'Carlos Almeida',  'carlos.almeida@example.com',  'Taboão da Serra', 'Centro',            70),
  ('02', 'Mariana Souza',   'mariana.souza@example.com',   'São Paulo',       'Vila Mariana',      45),
  ('03', 'João Pereira',    'joao.pereira@example.com',    'Osasco',          'Centro',            40),
  ('04', 'Ana Oliveira',    'ana.oliveira@example.com',    'São Paulo',       'Pinheiros',         70),
  ('05', 'Pedro Costa',     'pedro.costa@example.com',     'Embu das Artes',  'Jardim América',    15),
  ('06', 'Luciana Lima',    'luciana.lima@example.com',    'São Paulo',       'Moema',             14),
  ('07', 'Ricardo Mendes',  'ricardo.mendes@example.com',  'Taboão da Serra', 'Jardim Maria Rosa',  5),
  ('08', 'Fernanda Alves',  'fernanda.alves@example.com',  'Osasco',          'Km 18',              3),
  ('09', 'Roberto Dias',    'roberto.dias@example.com',    'São Paulo',       'Butantã',            6),
  ('10', 'Camila Rocha',    'camila.rocha@example.com',    'Cotia',           'Granja Viana',       4),
  ('11', 'Paulo Martins',   'paulo.martins@example.com',   'São Paulo',       'Santana',            9),
  ('12', 'Beatriz Silva',   'beatriz.silva@example.com',   'Taboão da Serra', 'Parque Pinheiros',   4)
) as v(n, nome, email, cidade, bairro, dias);

-- 6. Leads cobrindo todas as etapas do funil
-- (criado, etapa e fechado = dias atrás; o serviço é gravado pelo ID do catálogo)
create temporary table demo_leads on commit drop as
select * from (values
  ('01', '01', 'Fechamento de sacada',          'fechado',            'WhatsApp',  40, 30,   30, true,  'Envidraçamento de sacada de 4 m',        '4,00 x 1,20 m'),
  ('02', '02', 'Box de banheiro',               'fechado',            'Instagram', 25, 18,   18, false, 'Box de canto até o teto',                 '1,20 x 2,40 m'),
  ('03', '03', 'Espelho',                       'fechado',            'Indicação', 12,  5,    5, false, 'Espelho bisotado para sala',              '1,50 x 0,90 m'),
  ('04', '04', 'Cobertura em vidro',            'fechado',            'Google',    70, 60,   60, true,  'Cobertura para área gourmet',             '5,00 x 3,00 m'),
  ('05', '05', 'Porta de vidro',                'negociacao',         'WhatsApp',  15,  8, null, true,  'Porta pivotante na entrada',              '1,00 x 2,20 m'),
  ('06', '06', 'Película de retenção de calor', 'orcamento_enviado',  'Site',      14,  6, null, false, 'Película em 6 janelas do escritório',     '6 x 1,20 x 1,50 m'),
  ('07', '07', 'Janela',                        'orcamento_enviado',  'WhatsApp',   5,  1, null, false, 'Janela de correr para quarto',            '1,50 x 1,00 m'),
  ('08', '08', 'Box de banheiro',               'orcamento_pendente', 'Instagram',  3,  2, null, false, 'Box frontal com puxador preto',           '1,00 x 1,90 m'),
  ('09', '09', 'Fechamento de sacada',          'visita_agendada',    'WhatsApp',   6,  3, null, true,  'Sacada em L no 8º andar',                 null),
  ('10', '10', 'Clausura para ar-condicionado', 'visita_agendada',    'Google',     4,  2, null, true,  'Clausura para 2 condensadoras',           null),
  ('11', '11', 'Porta de vidro',                'visita_realizada',   'Indicação',  9,  2, null, true,  'Porta de correr para varanda',            '2,40 x 2,20 m'),
  ('12', '12', 'Espelho',                       'aguardando_visita',  'WhatsApp',   4,  4, null, true,  'Parede espelhada na academia',            null),
  ('13', '01', 'Janela',                        'qualificando',       'WhatsApp',   1,  1, null, false, 'Cliente quer trocar janela da cozinha',   null),
  ('14', '03', 'Película de retenção de calor', 'novo',               'Instagram',  0,  0, null, false, 'Pediu orçamento de película',             null),
  ('15', '06', 'Fechamento de sacada',          'novo',               'WhatsApp',   0,  0, null, false, 'Indicação da Luciana para a mãe',         null),
  ('16', '02', 'Cobertura em vidro',            'perdido',            'Site',      30, 20, null, false, 'Cobertura de garagem',                    '6,00 x 3,00 m')
) as v(n, cliente, servico, status, origem, criado, etapa, fechado, visita, descricao, medidas);

insert into public.leads (id, empresa_id, cliente_id, servico, status, origem, necessita_visita, descricao, medidas, created_at)
select ('d3e31000-0000-4000-8000-0000000000' || d.n)::uuid, 'd3e30000-0000-4000-8000-000000000001',
       ('d3e3c000-0000-4000-8000-0000000000' || d.cliente)::uuid,
       coalesce(s.id::text, d.servico), d.status, d.origem, d.visita, d.descricao, d.medidas,
       now() - (d.criado || ' days')::interval
from demo_leads d
left join public.servicos s on s.nome = d.servico;

-- As automações do banco usam "agora" ao inserir; aqui as datas voltam para o histórico fictício
update public.leads l
set etapa_desde = now() - (d.etapa || ' days')::interval,
    fechado_em  = case when d.fechado is null then null else now() - (d.fechado || ' days')::interval end
from demo_leads d
where l.id = ('d3e31000-0000-4000-8000-0000000000' || d.n)::uuid;

update public.lead_historico h
set created_at = l.created_at
from public.leads l
where h.lead_id = l.id and l.empresa_id = 'd3e30000-0000-4000-8000-000000000001';

-- 7. Orçamentos (4 aceitos = faturamento; enviados geram alertas de follow-up e validade)
create temporary table demo_orcamentos on commit drop as
select * from (values
  ('01', 5800.00,   0.00, 'aceito',   35,  25),
  ('02', 3200.00, 200.00, 'aceito',   21,  -6),
  ('03', 1450.00,   0.00, 'aceito',    8,  10),
  ('04', 7400.00, 400.00, 'aceito',   65, -50),
  ('05', 4200.00,   0.00, 'enviado',  10,   2),
  ('06', 2600.00,   0.00, 'enviado',   6,  10),
  ('07', 1900.00,   0.00, 'enviado',   1,  15),
  ('16', 3000.00,   0.00, 'recusado', 25, -10)
) as v(lead, valor, desconto, status, enviado, validade);

insert into public.orcamentos (empresa_id, cliente_id, lead_id, valor, desconto, status, validade, created_at)
select 'd3e30000-0000-4000-8000-000000000001', l.cliente_id, l.id, o.valor, o.desconto, o.status,
       current_date + o.validade, now() - (o.enviado || ' days')::interval
from demo_orcamentos o
join public.leads l on l.id = ('d3e31000-0000-4000-8000-0000000000' || o.lead)::uuid;

update public.orcamentos q
set enviado_em = now() - (o.enviado || ' days')::interval
from demo_orcamentos o
where q.lead_id = ('d3e31000-0000-4000-8000-0000000000' || o.lead)::uuid;

-- 8. Visitas (próximas, aguardando confirmação e realizadas)
insert into public.visitas (empresa_id, cliente_id, lead_id, data_visita, horario_visita, endereco, responsavel, status, created_at)
select 'd3e30000-0000-4000-8000-000000000001', l.cliente_id, l.id,
       current_date + v.dia, v.hora::time, v.endereco, v.responsavel, v.status,
       l.created_at + interval '1 day'
from (values
  ('09',    1, '09:30', 'Rua das Acácias, 120 - Butantã',            'Marcos', 'agendada'),
  ('10',    3, '14:00', 'Estrada da Granja, 850 - Granja Viana',     'Marcos', 'aguardando_confirmacao'),
  ('11',   -2, '10:00', 'Rua Voluntários da Pátria, 45 - Santana',   'Júlia',  'realizada'),
  ('01',  -38, '15:00', 'Av. Aprígio Bezerra da Silva, 300 - Centro', 'Marcos', 'realizada'),
  ('04',  -68, '11:00', 'Rua dos Pinheiros, 1500 - Pinheiros',       'Júlia',  'realizada')
) as v(lead, dia, hora, endereco, responsavel, status)
join public.leads l on l.id = ('d3e31000-0000-4000-8000-0000000000' || v.lead)::uuid;

insert into public.visitas (empresa_id, cliente_id, lead_id, endereco, status, created_at)
select 'd3e30000-0000-4000-8000-000000000001', l.cliente_id, l.id,
       'Av. Paulo Ayres, 200 - Parque Pinheiros', 'aguardando_disponibilidade', now() - interval '3 days'
from public.leads l where l.id = 'd3e31000-0000-4000-8000-000000000012';

-- 9. Conversas (origem: cliente, ia, humano)
insert into public.interacoes (empresa_id, cliente_id, lead_id, origem, tipo, mensagem, created_at)
select 'd3e30000-0000-4000-8000-000000000001', l.cliente_id, l.id, v.origem, v.tipo, v.mensagem,
       now() - (v.horas || ' hours')::interval
from (values
  ('01', 'cliente', 'mensagem',  'Oi, quero fechar a sacada do meu apartamento.',                 960),
  ('01', 'ia',      'mensagem',  'Olá, Carlos! Pode me enviar as medidas aproximadas da sacada?', 959),
  ('05', 'cliente', 'mensagem',  'Consegue fazer um desconto à vista?',                            216),
  ('05', 'humano',  'ligacao',   'Liguei para negociar condições de pagamento.',                   192),
  ('06', 'ia',      'followup',  'Olá, Luciana! Conseguiu avaliar o orçamento da película?',        24),
  ('07', 'cliente', 'imagem',    'Foto da janela atual enviada.',                                   110),
  ('09', 'cliente', 'mensagem',  'Pode vir amanhã de manhã?',                                        70),
  ('09', 'ia',      'mensagem',  'Visita confirmada para amanhã às 9h30.',                           69),
  ('12', 'cliente', 'audio',     'Áudio: cliente pediu visita para medir a parede.',                  72),
  ('14', 'cliente', 'mensagem',  'Bom dia! Quanto fica película para 3 janelas?',                     2),
  ('15', 'cliente', 'mensagem',  'A Luciana me indicou, queria fechar minha sacada.',                 1)
) as v(lead, origem, tipo, mensagem, horas)
join public.leads l on l.id = ('d3e31000-0000-4000-8000-0000000000' || v.lead)::uuid;

commit;

-- Conferência (rode depois): quantidades e datas da empresa demo
-- select
--   (select count(*) from public.clientes   where empresa_id = 'd3e30000-0000-4000-8000-000000000001') as clientes,
--   (select count(*) from public.leads      where empresa_id = 'd3e30000-0000-4000-8000-000000000001') as leads,
--   (select count(*) from public.orcamentos where empresa_id = 'd3e30000-0000-4000-8000-000000000001') as orcamentos,
--   (select count(*) from public.visitas    where empresa_id = 'd3e30000-0000-4000-8000-000000000001') as visitas,
--   (select min(fechado_em)::date from public.leads where empresa_id = 'd3e30000-0000-4000-8000-000000000001') as fechamento_mais_antigo;
