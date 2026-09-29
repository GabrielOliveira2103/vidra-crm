import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
// PostgreSQL real via WASM. Stubs apenas dos schemas pertencentes à plataforma Supabase.
const db = new PGlite();
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
  console.log(`OK ${message}`);
};
async function expectFailure(sql, pattern, label) {
  let failed = false;
  try {
    await db.exec(sql);
  } catch (e) {
    failed = pattern.test(e.message);
  }
  check(failed, label);
}
try {
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated,anon;
    grant usage on schema public to authenticated,anon;`);
  for (const file of [
    "supabase/migrations/202609080001_crm.sql",
    "supabase/migrations/202609080002_storage.sql",
    "supabase/seed/001_servicos.sql",
    "supabase/seed/002_demonstracao.sql",
  ]) {
    await db.exec(
      await readFile(new URL(`../${file}`, import.meta.url), "utf8"),
    );
    console.log(`SQL executado: ${file}`);
  }
  const scalar = async (sql) => (await db.query(sql)).rows[0].n;
  check(
    (await scalar("select count(*)::int n from public.leads")) === 48,
    "seed contém 48 leads",
  );
  check(
    (await scalar("select count(*)::int n from public.servicos")) === 16,
    "catálogo contém 16 serviços",
  );
  for (const file of ["001_servicos.sql", "002_demonstracao.sql"])
    await db.exec(
      await readFile(
        new URL(`../supabase/seed/${file}`, import.meta.url),
        "utf8",
      ),
    );
  check(
    (await scalar("select count(*)::int n from public.leads")) === 48,
    "seed idempotente",
  );
  check(
    (await scalar("select count(*)::int n from public.lead_historico")) === 48,
    "histórico automático sem duplicação no seed",
  );
  await expectFailure(
    `insert into clientes(nome,telefone) values('Duplicado','(11) 97000-0001')`,
    /duplicate key/,
    "telefone formatado duplicado é rejeitado",
  );
  await expectFailure(
    `insert into clientes(nome,telefone) values('Inválido','123')`,
    /telefone brasileiro/,
    "telefone inválido rejeitado",
  );
  await expectFailure(
    `insert into clientes(nome,telefone) values('Exterior','+14155552671')`,
    /telefone brasileiro/,
    "DDI estrangeiro explícito rejeitado",
  );
  await expectFailure(
    `insert into leads(cliente_id,servico,status) select cliente_id,servico,'invalido' from leads limit 1`,
    /invalid input value/,
    "enum de status validado",
  );
  await expectFailure(
    `insert into orcamentos(lead_id,valor,desconto) select id,100,101 from leads limit 1`,
    /check constraint/,
    "desconto maior que valor rejeitado",
  );
  await expectFailure(
    `insert into orcamentos(lead_id,valor,status) select lead_id,100,'aceito' from orcamentos where status='aceito' limit 1`,
    /duplicate key/,
    "mais de um orçamento aceito por lead rejeitado",
  );
  await expectFailure(
    `insert into interacoes(cliente_id,lead_id,mensagem) values('de000000-0000-4000-8000-000000000001','de100000-0000-4000-8000-000000000002','Inválida')`,
    /pertencer/,
    "interação não pode cruzar clientes",
  );
  await expectFailure(
    `update leads set cliente_id='de000000-0000-4000-8000-000000000002' where id='de100000-0000-4000-8000-000000000001'`,
    /substituído/,
    "cliente de lead imutável preserva consistência",
  );
  await expectFailure(
    `insert into arquivos(lead_id,tipo,nome,url) values('de100000-0000-4000-8000-000000000001','foto','teste','https://example.com/a.jpg')`,
    /check constraint/,
    "arquivo exige caminho privado do lead",
  );
  check(
    (await scalar(
      `select count(*)::int n from pg_class where relname in ('clientes','leads','servicos','orcamentos','visitas','interacoes','arquivos','lead_historico','crm_usuarios') and relrowsecurity`,
    )) === 9,
    "RLS ativa nas nove tabelas",
  );
  check(
    (await scalar(
      `select count(*)::int n from storage.buckets where id='lead-arquivos' and public=false`,
    )) === 1,
    "bucket privado",
  );
  await db.exec(`set role anon`);
  await expectFailure(
    "select * from clientes",
    /permission denied/,
    "anônimo não lê clientes",
  );
  await expectFailure(
    `insert into clientes(nome,telefone) values('Anon','11999998888')`,
    /permission denied/,
    "anônimo não escreve clientes",
  );
  await db.exec(
    `reset role; insert into auth.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'); insert into crm_usuarios(id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); set role authenticated; set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'`,
  );
  check(
    (await scalar("select count(*)::int n from clientes")) === 0,
    "autenticado não autorizado não lê dados",
  );
  await expectFailure(
    `insert into clientes(nome,telefone) values('Intruso','11999998888')`,
    /row-level security/,
    "autenticado não autorizado não escreve",
  );
  await expectFailure(
    `insert into crm_usuarios(id) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')`,
    /permission denied/,
    "usuário não pode autorizar a si mesmo",
  );
  await db.exec(
    `set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'`,
  );
  check(
    (await scalar("select count(*)::int n from clientes")) === 48,
    "usuário autorizado lê a base",
  );
  await db.exec(
    `insert into clientes(nome,telefone) values('Teste RLS','11999998888'); update leads set status='fechado' where id='de100000-0000-4000-8000-000000000001'`,
  );
  check(
    (await scalar(
      `select count(*)::int n from leads where id='de100000-0000-4000-8000-000000000001' and fechado_em is not null`,
    )) === 1,
    "fechamento preenche timestamp",
  );
  check(
    (await scalar(
      `select count(*)::int n from lead_historico where lead_id='de100000-0000-4000-8000-000000000001'`,
    )) === 2,
    "mudança registra histórico com RLS",
  );
  await db.exec(
    `update leads set status='negociacao' where id='de100000-0000-4000-8000-000000000001'`,
  );
  check(
    (await scalar(
      `select count(*)::int n from leads where id='de100000-0000-4000-8000-000000000001' and fechado_em is null`,
    )) === 1,
    "reabertura limpa data do fechamento atual",
  );
  await db.exec(
    `insert into orcamentos(lead_id,valor,desconto,status) values('de100000-0000-4000-8000-000000000004',1500,50,'enviado')`,
  );
  check(
    (await scalar(
      `select valor_final::int n from orcamentos where lead_id='de100000-0000-4000-8000-000000000004'`,
    )) === 1450,
    "valor final calculado pelo PostgreSQL",
  );
  await expectFailure(
    `delete from clientes where nome='Teste RLS'`,
    /permission denied/,
    "exclusão comercial não permitida",
  );
  await db.exec(
    `insert into storage.objects(bucket_id,name) values('lead-arquivos','de100000-0000-4000-8000-000000000001/teste.jpg')`,
  );
  check(
    (await scalar("select count(*)::int n from storage.objects")) === 1,
    "Storage autorizado aceita pasta de lead existente",
  );
  await expectFailure(
    `insert into storage.objects(bucket_id,name) values('lead-arquivos','inexistente/teste.jpg')`,
    /row-level security/,
    "Storage rejeita pasta sem lead",
  );
  await db.exec(
    `set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'`,
  );
  check(
    (await scalar("select count(*)::int n from storage.objects")) === 0,
    "Storage oculto a usuário não autorizado",
  );
  console.log(
    `\n${checks} verificações PostgreSQL aprovadas. Auth e API Storage reais requerem smoke test no Supabase.`,
  );
} finally {
  await db.close();
}
