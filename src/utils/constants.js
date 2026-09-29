export const LEAD_STATUS = {
  novo: "Novo",
  qualificando: "Qualificando",
  aguardando_visita: "Aguardando visita",
  visita_agendada: "Visita agendada",
  visita_realizada: "Visita realizada",
  orcamento_pendente: "Orçamento pendente",
  orcamento_enviado: "Orçamento enviado",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};
export const QUOTE_STATUS = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aceito: "Aceito",
  recusado: "Recusado",
  expirado: "Expirado",
};
export const VISIT_STATUS = {
  aguardando_disponibilidade: "Aguardando disponibilidade",
  aguardando_confirmacao: "Aguardando confirmação",
  agendada: "Agendada",
  reagendamento_solicitado: "Reagendamento solicitado",
  cancelamento_solicitado: "Cancelamento solicitado",
  realizada: "Realizada",
  cancelada: "Cancelada",
};
// Visitas com data definida que ainda vão acontecer
export const ACTIVE_VISIT_STATUS = ["agendada", "aguardando_confirmacao"];
export const SOURCES = [
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Google",
  "Indicação",
  "Site",
  "Telefone",
  "Outro",
];
export const INTERACTION_TYPES = {
  mensagem: "Mensagem",
  audio: "Áudio",
  imagem: "Imagem",
  ligacao: "Ligação",
  observacao: "Observação",
  followup: "Follow-up",
};
export const FILE_TYPES = {
  foto: "Foto",
  imagem_local: "Imagem do local",
  medidas: "Medidas",
  referencia: "Referência",
  documento: "Documento",
};
