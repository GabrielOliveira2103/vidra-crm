// Notas do workflow "CRM - Pós Visita": dois fluxos disparados pelo banco (gatilhos com pg_net).
// Cores do n8n: 1 amarelo, 2 laranja, 3 vermelho, 4 verde, 5 azul, 6 roxo, 7 cinza.
// O "não" de cada decisão fica uma linha abaixo, para as ligações não cruzarem nós
export const ramosAbaixo = true;

export const renomes = {
  Webhook: "Webhook - Visita realizada",
  Webhook1: "Webhook - Orçamento enviado",
  "Dados teste pós-visita": "Preparar visita realizada",
  "Preparar orçamento enviado.": "Preparar orçamento enviado",
};

export const visaoGeral = {
  cor: 7,
  titulo: "CRM - Pós Visita: visão geral",
  texto: [
    "Dois fluxos disparados pelo próprio banco. Quando um registro muda no CRM, um gatilho do Supabase chama o webhook com uma chave secreta no cabeçalho.",
    "",
    "**Linha 1:** visita marcada como realizada. **Linha 2:** orçamento marcado como enviado.",
  ].join("\n"),
};

export const grupos = [
  { cor: 2, titulo: "Fluxo 1 · Visita realizada", texto: "O banco chama este webhook quando uma visita é marcada como realizada no CRM.",
    nos: ["Webhook - Visita realizada", "Preparar visita realizada"] },
  { cor: 4, titulo: "Lead aguardando orçamento", texto: "Busca a visita, move o lead para Orçamento pendente e registra a visita no histórico.",
    nos: ["Supabase - Buscar visita", "Supabase - Lead orçamento pendente", "Supabase - Registrar visita realizada"] },
  { cor: 7, titulo: "Fluxo 2 · Orçamento enviado", texto: "O banco chama este webhook quando um orçamento passa para Enviado no CRM.",
    nos: ["Webhook - Orçamento enviado", "Preparar orçamento enviado"] },
  { cor: 4, titulo: "Busca ou cria o orçamento", texto: "Usa o orçamento do CRM ou cria um a partir do lead.",
    nos: ["Supabase - Buscar orçamento", "Orçamento existe?", "Supabase - Buscar lead orçamento", "Supabase - Criar orçamento", "Padronizar orçamento"] },
  { cor: 1, titulo: "Confere o status", texto: "Só segue se o orçamento ainda pode ser enviado. Move o lead para Orçamento enviado.",
    nos: ["Orçamento pode ser editado?", "Orçamento está enviado?", "Supabase - Lead orçamento enviado"] },
  { cor: 5, titulo: "Envia no WhatsApp", texto: "Monta a mensagem com os dados do orçamento, envia pela Z-API e grava a data de envio.",
    nos: ["Supabase - Buscar lead para mensagem", "Supabase - Buscar cliente orçamento", "Preparar mensagem orçamento", "Z-API - Enviar orçamento", "Supabase - Marcar orçamento enviado"] },
];

export const linhas = [
  ["Fluxo 1 · Visita realizada", "Lead aguardando orçamento"],
  ["Fluxo 2 · Orçamento enviado", "Busca ou cria o orçamento", "Confere o status", "Envia no WhatsApp"],
];
