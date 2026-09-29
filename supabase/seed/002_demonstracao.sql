-- DEMONSTRAÇÃO: executar somente em projeto de teste. Idempotente por UUID/external_id.
begin;
do $$
declare i integer; cid uuid; lid uuid; sid uuid; estado public.lead_status; criado timestamptz; preco numeric;
 nomes text[] := array['Carlos Almeida','Maria Souza','João Santos','Ana Oliveira','Pedro Costa','Luciana Lima','Ricardo Mendes','Fernanda Alves','Roberto Dias','Camila Rocha','Paulo Martins','Beatriz Silva'];
 cidades text[] := array['Taboão da Serra','São Paulo','Osasco','Embu das Artes'];
 bairros text[] := array['Centro','Vila Mariana','Bela Vista','Jardim América'];
 produtos text[] := array['Fechamento de sacada','Box de banheiro','Película de retenção de calor','Espelho','Porta de vidro','Janela','Cobertura em vidro','Clausura para ar-condicionado'];
 estados public.lead_status[] := array['orcamento_enviado','fechado','negociacao','novo','qualificando','aguardando_visita','visita_agendada','visita_realizada','orcamento_pendente','perdido']::public.lead_status[];
 fontes text[] := array['WhatsApp','Instagram','Google','Indicação','Site','Telefone'];
begin
 for i in 1..48 loop
  cid := ('de000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid;
  lid := ('de100000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid;
  estado := estados[((i-1)%10)+1];
  criado := date_trunc('day',now()) - (((i-1)*3)%100) * interval '1 day' + interval '9 hours';
  if i = 1 then criado := criado - interval '7 days'; end if;
  if i in (4,14,24) then criado := date_trunc('day',now()) + interval '8 hours'; end if;
  select id into sid from public.servicos where nome = produtos[((i-1)%8)+1];
  preco := case i when 1 then 5800 when 2 then 1450 when 3 then 2200 else 900 + i*175 end;
  insert into public.clientes(id,nome,telefone,email,cidade,bairro,endereco,numero,cep,demonstracao,created_at)
  values(cid,nomes[((i-1)%12)+1] || case when i > 12 then ' (Demo ' || i || ')' else '' end,
  '1197' || lpad(i::text,7,'0'),'demo' || i || '@example.com',cidades[((i-1)%4)+1],bairros[((i-1)%4)+1],'Rua de Demonstração',i::text,'01001000',true,criado) on conflict(id) do nothing;
  insert into public.leads(id,cliente_id,servico,descricao,medidas,tipo_vidro,cor_vidro,origem,status,necessita_visita,observacoes,external_id,created_at,fechado_em)
  values(lid,cid,sid,'DEMONSTRAÇÃO — instalação residencial sob medida.','3,00 m x 2,10 m','Temperado','Incolor',fontes[((i-1)%6)+1],estado,i%2=0,'Registro fictício para testes.','demo-lead-' || i,criado,case when estado = 'fechado' then criado + interval '2 days' end) on conflict(id) do nothing;
  if estado in ('orcamento_enviado','fechado','negociacao','perdido') then
   insert into public.orcamentos(lead_id,numero_orcamento,valor,desconto,status,data_envio,validade,aceito_em,observacoes,external_id,created_at)
   values(lid,'DEMO-' || lpad(i::text,4,'0'),preco,0,
   case when estado = 'fechado' then 'aceito' when estado = 'perdido' then 'recusado' else 'enviado' end::public.orcamento_status,
   criado + interval '1 day',current_date + (i%12)-4,case when estado = 'fechado' then criado + interval '2 days' end,'DEMONSTRAÇÃO','demo-orc-'||i,criado + interval '1 day') on conflict(external_id) do nothing;
  end if;
  if estado in ('visita_agendada','visita_realizada','fechado') then
   insert into public.visitas(lead_id,data,horario,endereco,responsavel,status,observacoes,external_id)
   values(lid,case when estado = 'visita_agendada' then current_date+(i%5) else criado::date+1 end,'14:00','Rua de Demonstração, '||i,'Equipe técnica',case when estado = 'visita_agendada' then 'agendada' else 'realizada' end::public.visita_status,'DEMONSTRAÇÃO','demo-visita-'||i) on conflict(external_id) do nothing;
  end if;
  insert into public.interacoes(cliente_id,lead_id,origem,tipo,mensagem,external_id,created_at)
  values(cid,lid,'CRM','mensagem_cliente','DEMONSTRAÇÃO — Gostaria de solicitar um orçamento.','demo-interacao-'||i,criado) on conflict(external_id) do nothing;
 end loop;
end; $$;
commit;
