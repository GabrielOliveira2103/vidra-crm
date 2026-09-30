// Notas do workflow "CRM - Follow-up Orçamentos": lembrete automático de orçamentos sem resposta.
// Cores do n8n: 1 amarelo, 2 laranja, 3 vermelho, 4 verde, 5 azul, 6 roxo, 7 cinza.
export const ramosAbaixo = true;

export const renomes = {
  "Schedule Trigger": "Todo dia às 9h",
  "Get many rows": "Supabase - Buscar cliente",
};

export const visaoGeral = {
  cor: 7,
  titulo: "CRM - Follow-up Orçamentos: visão geral",
  texto: "Todo dia às 9h, lembra no WhatsApp os clientes que receberam um orçamento há mais de 48 horas e ainda não responderam. Cada orçamento recebe no máximo um follow-up. A empresa de demonstração fica de fora.",
};

export const grupos = [
  { cor: 5, titulo: "1. Busca orçamentos enviados", texto: "Roda todo dia às 9h e busca os orçamentos com status Enviado, exceto os da empresa de demonstração.",
    nos: ["Todo dia às 9h", "Supabase - Buscar orçamentos enviados"] },
  { cor: 1, titulo: "2. Precisa de follow-up?", texto: "Segue só se o orçamento foi enviado há 48 horas ou mais e ainda não recebeu follow-up.",
    nos: ["Já passou tempo para follow-up?", "Pode enviar follow-up?"] },
  { cor: 5, titulo: "3. Envia o lembrete", texto: "Busca o cliente, monta a mensagem e envia pela Z-API.",
    nos: ["Supabase - Buscar cliente", "Preparar follow-up orçamento", "Z-API - Enviar follow-up orçamento"] },
  { cor: 4, titulo: "4. Registra no CRM", texto: "Marca o orçamento para não repetir o lembrete e registra a mensagem no histórico do cliente.",
    nos: ["Supabase - Marcar follow-up enviado", "Supabase - Registrar follow-up orçamento"] },
];

export const linhas = [["1. Busca orçamentos enviados", "2. Precisa de follow-up?", "3. Envia o lembrete", "4. Registra no CRM"]];
