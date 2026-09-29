# Storage privado

O bucket **lead-arquivos** é privado, com limite de 10 MB por arquivo e apenas os tipos `image/jpeg`, `image/png`, `image/webp` e `application/pdf`. SVG e HTML são rejeitados pelo próprio Supabase. Não deixe o bucket público.

## Estrutura

Cada arquivo fica em `<lead_uuid>/<uuid-aleatorio>-<nome-sanitizado>`. A tabela `arquivos` guarda somente esse caminho (nunca URL pública ou assinada), além de tipo, nome, descrição e o lead relacionado.

## Políticas

Todas as políticas de `storage.objects` exigem que a primeira pasta do caminho seja um lead da empresa do usuário:

```sql
bucket_id = 'lead-arquivos'
and exists (
  select 1 from public.leads l
  where l.id::text = split_part(objects.name, '/', 1)
    and l.empresa_id = public.crm_empresa_id()
)
```

- **SELECT, INSERT e DELETE**: permitidos só nos leads da própria empresa. Um usuário de outra empresa, inclusive a conta de demonstração, não lista nem baixa esses arquivos.
- **UPDATE**: não concedido; cada envio recebe um UUID novo (`upsert: false`).
- Anônimos não têm acesso.

## Fluxo no frontend

- **Upload:** envia pelo SDK, grava os metadados em `arquivos` e remove o objeto se o registro falhar.
- **Leitura:** URL assinada de 300 segundos, renovada a cada 240 segundos enquanto a tela está aberta. URLs assinadas funcionam como credenciais temporárias: não as compartilhe.
- **Exclusão:** pede confirmação, remove o objeto e depois os metadados. Storage e PostgreSQL não formam uma transação única; em falha parcial, repetir a exclusão conclui a limpeza.
