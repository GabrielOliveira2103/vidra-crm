# Contrato de integração futura com n8n

Este documento especifica como um futuro produtor deverá acessar o banco existente. **Não há workflow n8n, mensageria, agente IA ou automação implementados neste projeto.** Os payloads abaixo são exemplos; substitua UUIDs e valores antes do uso. Não há endpoint próprio do dashboard: utilize a API REST do Supabase.

## Conexão e autenticação

Base: `https://SEU-PROJETO.supabase.co/rest/v1`.

Recomendação para uma integração limitada pelas mesmas políticas: usuário técnico dedicado no Supabase Auth, incluído em `public.crm_usuarios`, com credenciais armazenadas somente no cofre do n8n. Obtenha uma sessão via `POST /auth/v1/token?grant_type=password`, com cabeçalho `apikey: CHAVE_PUBLICA` e corpo `{"email":"integracao@example.com","password":"SEGREDO-NO-COFRE"}`. Guarde access_token/refresh_token em credenciais seguras, renove via `POST /auth/v1/token?grant_type=refresh_token` com `{"refresh_token":"TOKEN-SEGURO"}`; use `expires_in` para renovar antes de expirar. Nunca registre tokens nos logs de execução ou em campos comerciais.

Cabeçalhos para REST:

```text
apikey: CHAVE_PUBLICA_DO_PROJETO
Authorization: Bearer ACCESS_TOKEN_DO_USUARIO_TECNICO
Content-Type: application/json
Prefer: return=representation
```

Esse usuário pode trabalhar com os dados de toda a empresa como a equipe do CRM. Se necessitar permissões mais restritas, crie papel/políticas separados antes da integração. Não use a conta pessoal de um atendente.

Alternativa exclusivamente de backend: uma credencial secreta/service role do Supabase, guardada no cofre do n8n, pode operar com privilégios elevados e ignorar RLS. Isso exige validação rigorosa de payloads no produtor e nunca deve chegar ao navegador, `.env` com prefixo VITE, repositório ou logs. Prefira o usuário técnico quando as permissões do CRM forem suficientes. Conexão PostgreSQL direta também ignora ou modifica a aplicação das políticas conforme o papel; não é necessária para o contrato REST abaixo.

O dashboard não recebe chamadas do n8n. Ele consulta os registros ao abrir as páginas, salvar, clicar em atualizar e a cada 60 segundos enquanto visível. Nenhuma publicação Realtime é necessária nesta versão.

## Convenções

- IDs: UUID. Use os IDs retornados pelo banco; exemplos simbólicos `CLIENTE_UUID`, `LEAD_UUID` e `SERVICO_UUID` abaixo devem ser substituídos.
- Datas: `YYYY-MM-DD`. Timestamps: ISO 8601 com offset, preferencialmente UTC (`Z`). Horários de visita: `HH:mm:ss`, em America/Sao_Paulo.
- Valores monetários: números decimais em reais, nunca strings `R$` nem separador de milhar. `desconto` em reais.
- PATCH: envie apenas campos alterados; campo ausente preserva valor, `null` limpa campo opcional.
- `id`, `created_at` e `updated_at` são gerados pelo banco; omita em uso normal. Importações históricas controladas podem informar `created_at`, mas precisam de validação administrativa.
- Não envie `valor_final`, `etapa_desde` ou `fechado_em` nas atualizações. Triggers controlam estes campos e a timeline de status.
- `external_id` deve ser uma string única, estável e com namespace, por exemplo `n8n:lead:conversa-123`. Não use telefone como external_id do lead, pois um cliente pode pedir vários serviços.

## Relacionamentos

```text
auth.users 1 ─ 0..1 crm_usuarios
clientes   1 ─ N leads
servicos   1 ─ N leads (campo leads.servico é UUID)
leads      1 ─ N orcamentos (máximo 1 aceito)
leads      1 ─ N visitas
clientes   1 ─ N interacoes
leads      1 ─ N interacoes (lead opcional)
leads      1 ─ N arquivos
leads      1 ─ N lead_historico (gerado por trigger)
```

FKs impedem referências inexistentes e exclusão de dados comerciais associados. O cliente de um lead não pode ser trocado depois da criação; uma interação com lead precisa apontar para o mesmo cliente desse lead.

## 1. Localizar cliente pelo telefone

Normalização brasileira: remova caracteres não numéricos. Se houver 10/11 dígitos, acrescente `55`. Se vier com DDI, valide `55` + DDD + número, total 12/13 dígitos. O formato armazenado é `+55DDDNUMERO`. Não adivinhe nono dígito e não remova dígitos de um número válido. Números de outros países precisam de evolução explícita do contrato.

Use a função do banco para compartilhar a mesma regra:

`POST /rest/v1/rpc/normalizar_telefone`

```json
{ "valor": "(11) 99999-1234" }
```

Resposta: `"+5511999991234"`.

Depois `GET /rest/v1/clientes?telefone=eq.%2B5511999991234&select=*`. **Codifique `+` como `%2B`** ou use um construtor de query string. A resposta é array vazio ou um cliente. Unicidade é imposta no banco, inclusive em inserções SQL.

## 2. Criar cliente

`POST /rest/v1/clientes`

```json
{
  "nome": "Carlos Almeida",
  "telefone": "(11) 99999-1234",
  "email": "carlos@example.com",
  "cidade": "Taboão da Serra",
  "bairro": "Centro",
  "cep": "06763000",
  "endereco": "Rua Exemplo",
  "numero": "120",
  "complemento": "Apartamento 42"
}
```

Obrigatórios: `nome` não vazio e `telefone` válido. O trigger normaliza. Opcionais: `email`, `cidade`, `bairro`, `cep`, `endereco`, `numero`, `complemento`. `demonstracao` tem default false e não deve ser usado na integração de produção. `id`, `created_at`, `updated_at` têm defaults.

Concorrência: se outro processo criar o telefone entre consulta e INSERT, o erro `23505`/HTTP 409 significa que deve consultar novamente e reaproveitar o cliente. Não crie outro cliente nem altere o telefone para contornar a duplicidade. Evite upsert cego com payload parcial, que pode apagar informações existentes.

## 3. Atualizar cliente

`PATCH /rest/v1/clientes?id=eq.CLIENTE_UUID`

```json
{
  "cidade": "Taboão da Serra",
  "bairro": "Jardim Maria Rosa",
  "endereco": "Rua Exemplo",
  "numero": "122"
}
```

Somente altere dados confirmados pelo cliente. Alterar telefone para um número já existente é rejeitado. Não há fusão automática de clientes.

## 4. Consultar serviços e criar lead

`GET /rest/v1/servicos?ativo=eq.true&select=id,nome,descricao&order=nome`

Encontre o serviço no catálogo e use seu UUID, não o nome literal:

`POST /rest/v1/leads`

```json
{
  "cliente_id": "CLIENTE_UUID",
  "servico": "SERVICO_UUID",
  "descricao": "Fechamento de sacada residencial",
  "medidas": "4,20 m de largura x 2,30 m de altura",
  "tipo_vidro": "Temperado",
  "cor_vidro": "Incolor",
  "prazo_desejado": "2026-10-15",
  "origem": "WhatsApp",
  "status": "novo",
  "necessita_visita": true,
  "observacoes": "Condomínio exige padrão incolor.",
  "external_id": "n8n:lead:conversa-123:pedido-1"
}
```

Obrigatórios: `cliente_id`, `servico`. Defaults: `origem='Outro'`, `status='novo'`, `necessita_visita=false`. Opcionais: `descricao`, `medidas`, `tipo_vidro`, `cor_vidro`, `prazo_desejado`, `observacoes`, `external_id`. `medidas` é texto livre, não JSON obrigatório. É permitido ter vários leads para o mesmo cliente; cada oportunidade tem um serviço principal.

Origens permitidas (sensíveis a maiúsculas e acentos): `WhatsApp`, `Instagram`, `Facebook`, `Google`, `Indicação`, `Site`, `Telefone`, `Outro`.

## 5. Atualizar lead / alterar status

`PATCH /rest/v1/leads?id=eq.LEAD_UUID`

```json
{
  "medidas": "4,25 m x 2,30 m",
  "tipo_vidro": "Laminado",
  "necessita_visita": true,
  "status": "aguardando_visita"
}
```

Somente status:

```json
{ "status": "orcamento_pendente" }
```

Estados permitidos:

| Valor              | Significado               |
| ------------------ | ------------------------- |
| novo               | Entrada ainda não tratada |
| qualificando       | Coleta de informações     |
| aguardando_visita  | Necessário agendar        |
| visita_agendada    | Visita agendada           |
| visita_realizada   | Visita concluída          |
| orcamento_pendente | Preparar proposta         |
| orcamento_enviado  | Proposta entregue         |
| negociacao         | Negociação em andamento   |
| fechado            | Serviço fechado           |
| perdido            | Oportunidade perdida      |

O banco permite avançar/retornar entre etapas; a decisão pertence ao operador/produtor. Mudanças preenchem `etapa_desde`, registram `lead_historico` e atualizam `fechado_em` ao fechar. Reenviar o mesmo status não reinicia o relógio nem duplica histórico. Reabrir limpa o fechamento atual. Não escreva diretamente em lead_historico.

## 6. Registrar interação

`POST /rest/v1/interacoes`

```json
{
  "cliente_id": "CLIENTE_UUID",
  "lead_id": "LEAD_UUID",
  "origem": "WhatsApp",
  "tipo": "mensagem_cliente",
  "mensagem": "Posso receber a visita na quinta-feira à tarde.",
  "external_id": "n8n:interacao:mensagem-987"
}
```

Obrigatórios: `cliente_id`, `mensagem` não vazia. `lead_id` é opcional, mas, se informado, precisa pertencer ao cliente. Sem lead, aparece apenas na timeline do cliente. `origem` é texto livre com default `CRM`; `tipo` default `observacao`. `external_id` opcional, recomendado para evitar reprocessamento duplicado. `created_at` default now; informe o timestamp real somente para importação de eventos históricos validada.

Tipos: `mensagem_cliente`, `mensagem_ia`, `mensagem_atendente`, `ligacao`, `observacao`, `followup`. A existência de `mensagem_ia` no contrato não implementa agente. O registro é informativo; nenhum envio é disparado pelo CRM.

## 7. Registrar foto / documento

São duas operações: objeto no Storage e metadados no banco.

1. Gere um caminho `LEAD_UUID/UUID-ALEATORIO-local.jpg`.
2. `POST https://SEU-PROJETO.supabase.co/storage/v1/object/lead-arquivos/LEAD_UUID/UUID-ALEATORIO-local.jpg`, com os mesmos cabeçalhos de autenticação, `Content-Type: image/jpeg`, `x-upsert: false` e o **corpo binário**. Não envie JSON/base64 para a tabela.
3. Depois de upload bem-sucedido, `POST /rest/v1/arquivos`:

```json
{
  "lead_id": "LEAD_UUID",
  "tipo": "imagem_local",
  "nome": "sacada.jpg",
  "url": "LEAD_UUID/UUID-ALEATORIO-local.jpg",
  "descricao": "Vista interna da sacada"
}
```

Obrigatórios: `lead_id`, `tipo`, `nome`, `url`. Opcional: `descricao`. Tipos: `foto`, `imagem_local`, `medidas`, `referencia`, `documento`. `url` é caminho relativo privado, deve começar pelo UUID do lead e ser único. Não aceite `../`. Não grave URL externa enviada pelo cliente ou link assinado temporário nesse campo.

Bucket: `lead-arquivos`, privado, máximo 10 MB, JPG/PNG/WebP/PDF. O dashboard gera URLs assinadas para exibição. Em falha na gravação de metadados, remova o objeto ou agende reconciliação explícita no futuro produtor. Uma repetição deve reaproveitar o caminho já registrado, sem sobrescrever arquivos. A política permite remover; não permite atualizar objeto existente. Consulte [SUPABASE_STORAGE.md](SUPABASE_STORAGE.md).

## 8. Registrar orçamento

`POST /rest/v1/orcamentos`

```json
{
  "lead_id": "LEAD_UUID",
  "valor": 6000.0,
  "desconto": 200.0,
  "status": "enviado",
  "data_envio": "2026-09-08T17:00:00Z",
  "validade": "2026-09-22",
  "observacoes": "Instalação inclusa. Prazo a confirmar após medição.",
  "external_id": "n8n:orcamento:pedido-123:v1"
}
```

Obrigatórios: `lead_id`, `valor` não negativo. Defaults: `desconto=0`, `status='rascunho'`, `numero_orcamento` gerado como `ORC-000001`. Opcionais: `numero_orcamento` se houver numeração externa única, `data_envio`, `validade`, `observacoes`, `external_id`. `data_envio` é preenchida automaticamente ao sair de rascunho se ausente. `aceito_em` é preenchido no aceite, limpo ao sair dele. `valor_final` é coluna gerada `valor - desconto`, não envie. Desconto deve estar entre zero e valor.

Status: `rascunho`, `enviado`, `aceito`, `recusado`, `expirado`. Validade vencida gera alerta, mas não altera status automaticamente.

Atualização: `PATCH /rest/v1/orcamentos?id=eq.ORCAMENTO_UUID` com `{"status":"aceito"}`. Existe no máximo um orçamento aceito por lead. Para substituir uma versão aceita, altere primeiro o status da anterior conforme a decisão comercial. O aceite **não fecha o lead**: faça PATCH explícito em leads com `{"status":"fechado"}` quando autorizado pelo processo comercial. Essas chamadas REST separadas não são atômicas; trate falhas e faça reconciliação. O dashboard sinaliza leads fechados sem orçamento aceito. Para atomicidade futura, introduza uma RPC transacional revisada em uma nova migration.

## 9. Registrar visita

`POST /rest/v1/visitas`

```json
{
  "lead_id": "LEAD_UUID",
  "data": "2026-09-10",
  "horario": "14:00:00",
  "endereco": "Rua Exemplo, 120, Centro, Taboão da Serra",
  "responsavel": "Equipe técnica / Rafael",
  "status": "agendada",
  "observacoes": "Confirmar acesso à portaria.",
  "external_id": "n8n:visita:pedido-123:1"
}
```

Obrigatórios: `lead_id`, `data`, `horario`, `endereco` não vazio, `responsavel` não vazio. Defaults: `status='agendada'`. Opcionais: `observacoes`, `external_id`. Horário local de Brasília. Status: `agendada`, `confirmada`, `realizada`, `cancelada`.

Atualização: `PATCH /rest/v1/visitas?id=eq.VISITA_UUID` com `{"status":"confirmada"}` ou `{"status":"realizada","observacoes":"Medição concluída."}`. Cancelamento: `{"status":"cancelada","observacoes":"Cliente solicitou reagendamento."}`. Isso não muda a etapa do lead automaticamente. Não existe integração com calendário externo.

## Idempotência, erros e concorrência

Para leads, interações, orçamentos e visitas, consulte `?external_id=eq.ID-CODIFICADO` antes de criar. Em HTTP 409/23505, consulte novamente: outra execução pode ter criado o registro. Para processamento de eventos já aplicados, não sobrescreva dados recentes com payload antigo. Um PATCH deve conter somente campos daquele evento e respeitar ordenação por oportunidade. `updated_at` é atualizado pelo banco; o CRM usa último salvamento, sem bloqueio otimista nesta versão.

Se precisar de inserção idempotente sem atualização, a API PostgREST oferece `POST /TABELA?on_conflict=external_id` com `Prefer: resolution=ignore-duplicates,return=representation`; consulte depois pelo external_id quando o retorno for vazio. Não use `merge-duplicates` indiscriminadamente com dados incompletos. Telefone normalizado é a chave de localização de cliente, não de lead.

| Resultado                 | Tratamento                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| 200/201 com representação | Persistir UUID retornado                                                      |
| PATCH com array vazio     | Registro não existe ou não está visível; investigar, não considerar salvo     |
| 401                       | Renovar sessão; se falhar, intervenção nas credenciais                        |
| 403 / 42501               | Conferir crm_usuarios e permissões; não contornar RLS                         |
| 409 / 23505               | Duplicidade: buscar registro existente ou tratar orçamento aceito conflitante |
| 23503                     | FK inexistente: criar/localizar pai antes do filho                            |
| 23514 / 22P02 / 22023     | Constraint, enum ou telefone inválido; corrigir payload                       |
| 429 ou 5xx transitório    | Retry limitado com backoff e idempotência                                     |

Não registre segredos nem dados pessoais completos em logs públicos. Não exponha tabelas a anon para facilitar integração. O projeto atual fornece o contrato e a base; a implementação de autenticação, reprocessamento, ordenação e reconciliação no futuro workflow permanece fora deste escopo.

Documentação oficial: [Supabase REST](https://supabase.com/docs/guides/api), [Auth REST](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Storage](https://supabase.com/docs/guides/storage/uploads/standard-uploads).
