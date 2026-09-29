# Storage privado

A migration `202609080002_storage.sql` cria o bucket **lead-arquivos**, privado, limite 10 MB por arquivo, MIME types `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Se criado manualmente, use os mesmos valores e aplique as políticas da migration; não deixe o bucket público.

Estrutura: `<lead_uuid>/<uuid-aleatorio>-<nome-sanitizado>`. O campo `arquivos.url` armazena **somente esse caminho**, não o conteúdo, URL pública ou URL assinada. A tabela guarda tipo, nome, descrição e relação com lead.

O frontend faz upload pelo SDK com `upsert: false`, registra os metadados e tenta remover o objeto se o INSERT falhar. Leitura usa URL assinada de 300 segundos, renovada a cada 240 segundos na tela. URLs assinadas funcionam como credenciais temporárias: não persista nem compartilhe publicamente. Upload aceita apenas os tipos indicados. SVG/HTML são rejeitados.

Políticas:

- SELECT: bucket lead-arquivos e `crm_autorizado()`.
- INSERT: mesmas condições e primeiro diretório correspondendo a um lead existente visível.
- DELETE: bucket lead-arquivos e membro autorizado.
- UPDATE de objetos não é concedido por política; cada novo envio recebe outro UUID.

Todos os membros deste CRM de empresa única podem acessar seus arquivos. Anônimos e usuários sem entrada em crm_usuarios não podem. Não configure regras públicas adicionais. A migração não altera políticas de outros buckets.

A exclusão exige confirmação na interface. Primeiro remove o objeto, depois os metadados. Storage e PostgreSQL não formam uma única transação: em falha parcial pode restar um metadado sem objeto; repetir a remoção conclui a limpeza. Em falha no rollback do upload pode restar objeto órfão; o administrador deve comparar `storage.objects` com `arquivos.url` antes de remover qualquer objeto manualmente. Não há rotina automática de limpeza.

Teste real: autentique um usuário autorizado, abra um lead, envie JPG, abra a miniatura, envie PDF e abra o documento. Tente um arquivo >10 MB e MIME proibido. Saia e confirme que a aplicação não permite consulta. Uma URL assinada já emitida permanece válida até expirar; teste acesso anônimo ao bucket sem esse token para verificar RLS.
