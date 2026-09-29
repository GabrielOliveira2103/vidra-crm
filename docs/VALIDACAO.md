# Validação do projeto

Validação realizada em 08/09/2026, no projeto independente `vidra-crm`, com Node.js 24 e npm 11 no Windows.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| npm install | Concluído; lockfile gerado; 0 vulnerabilidades reportadas |
| npm run lint | Aprovado, sem erros ou avisos |
| npm test | 5 testes aprovados |
| npm run test:db | 29 verificações PostgreSQL aprovadas |
| npm run build | Aprovado; saída em dist; rotas e gráficos separados em chunks |
| Playwright / Chromium | 6 cenários aprovados em duas rodadas (4 fluxos + 2 cenários de arquivos/erros) |
| Responsividade | 1440, 1024, 768 e 390 px; sem overflow horizontal global nas páginas verificadas |
| Segredos | Busca em fontes e documentação sem credenciais reais encontradas; .env.example contém somente campos vazios |

### Regras comerciais

Testes unitários cobrem normalização brasileira de telefone, máscaras equivalentes, rejeição de número inválido/estrangeiro, limites de data em Brasília, base vazia sem NaN, faturamento por fechamento com orçamento aceito, exclusão de duplicidade de propostas, ticket, conversão por coorte e alertas por tempo/última interação.

### Banco

As duas migrations e os dois seeds foram **executados** em PostgreSQL via PGlite/WASM, não apenas inspecionados como texto. A validação verifica catálogo, 48 leads fictícios, reexecução idempotente, normalização/duplicidade, enums, descontos, orçamento aceito único, consistência cliente/lead/interação, proteção do cliente de um lead, caminhos privados, RLS nas nove tabelas, bucket privado, timestamp de fechamento, reabertura e histórico.

Testes com `SET ROLE` confirmam bloqueio de anônimo, autenticação sem autorização e tentativa de autoautorização; leitura/gravação autorizada; exclusão comercial bloqueada; upload permitido somente para pasta de lead existente; objetos invisíveis para usuário sem autorização.

O harness cria schemas mínimos `auth` e `storage` para simular funções/tabelas da plataforma. As policies são executadas pelo PostgreSQL. A API HTTP do Storage e o serviço Supabase Auth não são executados pelo PGlite.

### Navegador

Os testes usam a aplicação React real com interceptação da API Supabase e dados sintéticos exclusivos de `tests/browser`. Não existe modo mock/demo no código de produção.

1. Rotas protegidas, login, persistência após reload, todas as páginas, detalhes de lead/cliente e logout.
2. Cadastro de cliente com telefone normalizado, lead, orçamento com desconto, visita e interação; mudança de etapa no detalhe e no pipeline.
3. Busca, filtro de leads, realização de visita, aceite de orçamento e desativação de serviço.
4. Desktop/tablet/celular, menu recolhível e ausência de overflow global em visão geral, leads, pipeline, detalhe e relatórios.
5. Upload privado, caminho relativo nos metadados, URL assinada, miniatura e exclusão confirmada.
6. Base vazia, erro de duplicidade ao salvar preservando formulário, bloqueio de usuário sem autorização.

Nenhuma exceção JavaScript de página foi identificada nos cenários aprovados. As capturas foram inspecionadas visualmente:

- [Dashboard desktop](screenshots/dashboard-desktop.png)
- [Dashboard celular](screenshots/dashboard-mobile.png)

As capturas mostram dados simulados de teste e uma faixa de DEMONSTRAÇÃO; não representam resultados comerciais reais nem a quantidade total do seed SQL.

## Como repetir

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd test
npm.cmd run test:db
npx.cmd playwright install chromium --only-shell
npm.cmd run test:e2e
npm.cmd run build
```

O Playwright inicia o Vite em `127.0.0.1:5179` com chave sintética que não autentica em nenhum projeto real. Mantenha a porta livre. Os testes não precisam de `.env` real. O build deve ser gerado novamente depois de configurar as variáveis reais do ambiente.

## Validação pendente no projeto Supabase real

Nenhuma credencial/projeto Supabase foi fornecido nesta tarefa. Portanto, não foram aplicadas migrations em banco remoto nem criadas contas reais. Após seguir o README, validar:

1. Login com usuário criado no Auth e autorizado em `crm_usuarios`; reload e logout.
2. Usuário autenticado fora de `crm_usuarios` deve receber bloqueio.
3. Cliente → lead → orçamento enviado/aceito → lead fechado; conferir faturamento.
4. Criar/confirmar/realizar/cancelar visita; conferir filtros por data.
5. Enviar JPG/PDF, abrir URL assinada, excluir e testar arquivo grande/MIME proibido.
6. Com token anônimo, confirmar que a API não permite ler tabelas comerciais nem objetos do bucket.
7. Inserir manualmente um registro pelo SQL Editor ou REST autorizado e usar Atualizar; confirmar que aparece no CRM.
8. No host de produção, abrir diretamente uma rota `/leads/UUID` e verificar fallback SPA, HTTPS e variáveis de build.

Não foram implementados ou testados workflows n8n, WhatsApp, agentes, pagamentos, emissão de PDF ou outros itens fora do escopo.
