// Notas (sticky notes) do workflow "Agente Comercial", agrupadas por etapa.
// Cores do n8n: 1 amarelo, 2 laranja, 3 vermelho, 4 verde, 5 azul, 6 roxo, 7 cinza.
// Nomes de nós corrigidos ao gerar a versão com notas (nome antigo -> novo)
export const renomes = {
  "avisar vendendor": "Z-API - Avisar profissional",
  "Create a row": "Supabase - Registrar horário indisponível",
  "Update a row": "Supabase - Lead em negociação",
};

export const visaoGeral = {
  cor: 7,
  titulo: "Agente Comercial: visão geral",
  texto: [
    "Atende clientes de vidraçaria pelo WhatsApp (Z-API), grava tudo no Supabase e alimenta o CRM.",
    "",
    "**Cores:** 🟦 entrada · 🟩 dados no CRM · 🟪 IA · 🟨 decisões · 🟧 visitas · ⬜ orçamentos · 🟥 atendimento humano e cancelamento",
  ].join("\n"),
};

export const grupos = [
  { cor: 5, titulo: "1. Recebe a mensagem", texto: "A Z-API chama este webhook a cada mensagem. O switch separa texto, áudio e imagem.",
    nos: ["Recebe mensagem WhatsApp", "organizando dados", "Identificador tipo de mensagem"] },
  { cor: 5, titulo: "2. Áudio e imagem viram texto", texto: "Áudios são transcritos e imagens descritas pela OpenAI. Tudo chega ao agente como texto.",
    nos: ["Baixar Audio", "Transcribe a recording", "Baixar imagem", "Analyze image", "MergeImagem", "Preparar imagem", "Padronizar mensagem do cliente"] },
  { cor: 4, titulo: "3. Identifica o cliente", texto: "Busca o cliente pelo telefone e o atendimento aberto. Cria os dois no primeiro contato.",
    nos: ["Supabase - Buscar cliente", "Cliente existe?", "Supabase - Criar cliente", "Padronizar dados cliente", "Supabase - Buscar atendimento", "Merge", "Atendimento existe?", "Supabase - Criar atendimento"] },
  { cor: 3, titulo: "4. Humano assumiu?", texto: "Se a equipe assumiu a conversa, a IA fica em silêncio e só registra a mensagem.",
    nos: ["Cliente está com humano?", "Supabase - Registrar mensagem em atendimento humano"] },
  { cor: 6, titulo: "5. Agente de IA", texto: "Conversa com o cliente e devolve a resposta junto com os dados extraídos: serviço, local, medidas e intenção.",
    nos: ["OpenAI Chat Model", "Simple Memory", "Agente vidraçaria", "Converter resposta do agente", "Merge1"] },
  { cor: 4, titulo: "6. Salva a conversa", texto: "Registra a mensagem do cliente e a resposta da IA. Atualiza o nome quando o cliente se apresenta.",
    nos: ["Supabase - Registrar mensagem cliente", "Nome foi informado?", "Supabase - Atualizar nome cliente", "Supabase - Registrar resposta IA"] },
  { cor: 4, titulo: "7. Cria ou atualiza o lead", texto: "Grava serviço, local e medidas no lead que aparece no CRM.",
    nos: ["Supabase - Buscar lead", "Padronizar busca lead", "Merge2", "Lead existe?", "Supabase - Criar lead", "Supabase - Atualizar lead", "Padronizar lead salvo", "Merge Agendamento"] },
  { cor: 3, titulo: "8. Transferência para humano", texto: "Orçamento direto ou negociação: a conversa passa para a equipe, que recebe um aviso no WhatsApp.",
    nos: ["Precisa atendimento humano?", "É orçamento direto?", "Supabase - Lead orçamento pendente", "Supabase - Transferir para humano", "Preparar aviso atendimento humano", "Z-API - Avisar atendimento humano", "Supabase - Registrar aviso atendimento humano"] },
  { cor: 1, titulo: "9. Qual é a intenção?", texto: "Cancelamento, aceite, recusa ou negociação de orçamento seguem para o seu ramo.",
    nos: ["É cancelamento?", "É aceite de orçamento?", "É recusa de orçamento?", "É negociação de orçamento?"] },
  { cor: 1, titulo: "10. Agenda ou resposta simples", texto: "Desistência encerra o orçamento. Pedido de visita consulta a agenda. O resto é respondido direto.",
    nos: ["É desistência do orçamento?", "Precisa consultar agenda?", "Z-API - Responder cliente"] },
  { cor: 2, titulo: "11. Salva a visita", texto: "Cria ou atualiza a visita técnica com a data e o horário pedidos.",
    nos: ["Supabase - Buscar visita", "Padronizar busca visita", "Merge Visita", "Visita existe?", "Supabase - Criar visita", "Supabase - Atualizar visita", "Padronizar visita salva"] },
  { cor: 2, titulo: "12. Confere a agenda", texto: "Consulta o Google Calendar. Se o horário está livre, cria o evento.",
    nos: ["Get availability in a calendar", "Merge Disponibilidade", "Horário disponível?", "Create an event", "Padronizar evento criado"] },
  { cor: 2, titulo: "Horário ocupado", texto: "Avisa o cliente e registra a resposta.",
    nos: ["Preparar horário indisponível", "Z-API - Horário indisponível", "Supabase - Registrar horário indisponível"] },
  { cor: 2, titulo: "13. Confirma a visita", texto: "Marca a visita como agendada no CRM, confirma com o cliente e avisa o profissional.",
    nos: ["Merge Evento Confirmado", "Supabase - Confirmar visita", "Supabase - Lead visita agendada", "Preparar confirmação visita", "Z-API - Confirmar visita", "Supabase - Atualizar resumo visita", "Preparar aviso profissional", "Z-API - Avisar profissional", "Supabase - Registrar confirmação cliente", "Supabase - Registrar aviso profissional"] },
  { cor: 2, titulo: "14. Reagendamento", texto: "Busca a visita, confere o novo horário no Google Calendar e move ou recria o evento. Se o horário estiver ocupado, avisa o cliente.",
    nos: ["É reagendamento?", "Tem nova data para reagendar?", "Buscar visita reagendamento", "Padronizar visita reagendamento", "Merge Reagendamento", "Google Calendar - Verificar reagendamento", "Merge Disponibilidade Reagendamento", "Novo horário disponível?", "Preparar reagendamento indisponível", "Z-API - Reagendamento indisponível", "Existe evento para reagendar?", "Google Calendar - Reagendar visita", "Google Calendar - Criar novo evento reagendamento", "Padronizar evento reagendado"] },
  { cor: 2, titulo: "15. Confirma o reagendamento", texto: "Atualiza o CRM, confirma com o cliente e avisa o profissional.",
    nos: ["Merge Reagendamento Confirmado", "Supabase - Confirmar reagendamento", "Preparar confirmação reagendamento", "Z-API - Confirmar reagendamento", "Supabase - Registrar reagendamento cliente", "Preparar aviso profissional reagendamento", "Z-API - Avisar reagendamento profissional", "Supabase - Registrar aviso reagendamento profissional", "Supabase - Atualizar resumo reagendamento"] },
  { cor: 3, titulo: "16. Cancelamento", texto: "Remove o evento do Google Calendar, cancela a visita no CRM, confirma com o cliente e avisa o profissional.",
    nos: ["Supabase - Buscar visita cancelamento", "Padronizar visita cancelamento", "Delete an event", "Evento já estava excluído?", "Supabase - Confirmar cancelamento", "Supabase - Lead visita cancelada", "Preparar confirmação cancelamento", "Z-API - Confirmar cancelamento", "Supabase - Registrar cancelamento cliente", "Preparar aviso profissional cancelamento", "Z-API - Avisar cancelamento profissional", "Supabase - Registrar aviso cancelamento profissional"] },
  { cor: 7, titulo: "17. Aceite do orçamento", texto: "Aceita o orçamento, fecha o lead (entra no faturamento do CRM) e confirma com o cliente.",
    nos: ["Supabase - Buscar orçamento aceite", "Supabase - Aceitar orçamento", "Supabase - Fechar lead", "Supabase - Registrar aceite orçamento", "Preparar confirmação aceite", "Z-API - Confirmar aceite orçamento", "Supabase - Registrar confirmação aceite cliente"] },
  { cor: 7, titulo: "18. Recusa do orçamento", texto: "Marca o orçamento como recusado e responde o cliente.",
    nos: ["Supabase - Buscar orçamento recusa", "Orçamento pode ser recusado?", "Supabase - Recusar orçamento", "Supabase - Lead em negociação", "Preparar resposta recusa orçamento", "Z-API - Responder recusa orçamento", "Supabase - Registrar recusa orçamento"] },
  { cor: 7, titulo: "19. Desistência", texto: "Encerra o orçamento, marca o lead como perdido e confirma com o cliente.",
    nos: ["Supabase - Buscar orçamento desistência", "Orçamento pode ser encerrado?", "Supabase - Encerrar orçamento", "Supabase - Marcar lead perdido", "Preparar confirmação desistência", "Z-API - Confirmar desistência", "Supabase - Registrar desistência"] },
];

// Ordem das etapas no canvas: cada linha segue a ordem do atendimento.
// Um item em lista empilha etapas na mesma coluna (ramo alternativo embaixo).
export const linhas = [
  ["1. Recebe a mensagem", "2. Áudio e imagem viram texto", "3. Identifica o cliente", "4. Humano assumiu?", "5. Agente de IA", "6. Salva a conversa", "7. Cria ou atualiza o lead"],
  ["8. Transferência para humano", "9. Qual é a intenção?", "10. Agenda ou resposta simples", "11. Salva a visita", ["12. Confere a agenda", "Horário ocupado"], "13. Confirma a visita"],
  ["14. Reagendamento", "15. Confirma o reagendamento", "16. Cancelamento"],
  ["17. Aceite do orçamento", "18. Recusa do orçamento", "19. Desistência"],
];

// Correções de fluxo: caminhos que preparavam ou tinham uma resposta, mas não enviavam ao cliente
export function corrigir({ workflow, liga, randomUUID }) {
  if (!workflow.nodes.some((n) => n.name === "Z-API - Reagendamento indisponível")) {
    const modelo = workflow.nodes.find((n) => n.name === "Z-API - Horário indisponível");
    workflow.nodes.push({ ...structuredClone(modelo), id: randomUUID(), name: "Z-API - Reagendamento indisponível" });
  }
  liga("Preparar reagendamento indisponível", 0, "Z-API - Reagendamento indisponível");
  // No "não" destes IFs, o agente já escreveu a resposta: envia pelo mesmo nó das conversas normais
  for (const decisao of ["Tem nova data para reagendar?", "Orçamento pode ser recusado?", "Orçamento pode ser encerrado?"])
    liga(decisao, 1, "Z-API - Responder cliente");
}
