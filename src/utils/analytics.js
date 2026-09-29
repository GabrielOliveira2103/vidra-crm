import { dayKey, shiftDay, inRange, daysSince } from "./format.js";
import { ACTIVE_VISIT_STATUS } from "./constants.js";
const isClientMessage = (i) => i?.origem === "cliente";
export function latestQuote(data, leadId) {
  const quotes = data.orcamentos.filter((q) => q.lead_id === leadId);
  return (
    quotes.find((q) => q.status === "aceito") ||
    quotes.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  );
}
export function groupBy(items, getName) {
  const groups = new Map();
  items.forEach((item) => {
    const name = getName(item) || "Não informado";
    groups.set(name, (groups.get(name) || 0) + 1);
  });
  return [...groups]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
export function metrics(data, start = "", end = "") {
  const leads = data.leads.filter((l) => inRange(l.created_at, start, end));
  const quotes = data.orcamentos.filter((q) =>
    inRange(q.data_envio || q.created_at, start, end),
  );
  const closed = leads.filter((l) => l.status === "fechado");
  const revenueLeads = data.leads.filter(
    (l) => l.status === "fechado" && inRange(l.fechado_em, start, end),
  );
  const valued = revenueLeads
    .map((l) =>
      data.orcamentos.find((q) => q.lead_id === l.id && q.status === "aceito"),
    )
    .filter(Boolean);
  const revenue = valued.reduce((s, q) => s + Number(q.valor_final || 0), 0);
  const negotiation = leads
    .filter((l) => l.status === "negociacao")
    .reduce((s, l) => s + Number(latestQuote(data, l.id)?.valor_final || 0), 0);
  const quoteDelays = leads.flatMap((l) => {
    const first = data.orcamentos
      .filter((q) => q.lead_id === l.id && q.data_envio)
      .sort((a, b) => a.data_envio.localeCompare(b.data_envio))[0];
    return first
      ? [
          Math.max(
            0,
            (new Date(first.data_envio) - new Date(l.created_at)) / 86400000,
          ),
        ]
      : [];
  });
  const closeDelays = closed.flatMap((l) => {
    const q = data.orcamentos.find(
      (q) => q.lead_id === l.id && q.status === "aceito" && q.data_envio,
    );
    return q && l.fechado_em
      ? [
          Math.max(
            0,
            (new Date(l.fechado_em) - new Date(q.data_envio)) / 86400000,
          ),
        ]
      : [];
  });
  const avg = (a) =>
    a.length ? a.reduce((s, n) => s + n, 0) / a.length : null;
  return {
    leads,
    quotes,
    closed: closed.length,
    lost: leads.filter((l) => l.status === "perdido").length,
    conversion: leads.length ? (closed.length / leads.length) * 100 : 0,
    revenue,
    ticket: valued.length ? revenue / valued.length : 0,
    negotiation,
    missingAccepted: revenueLeads.length - valued.length,
    quoteDelay: avg(quoteDelays),
    closeDelay: avg(closeDelays),
    services: groupBy(
      leads,
      (l) =>
        data.servicos.find((s) => s.id === l.servico)?.nome ||
        l.servico,
    ),
    sources: groupBy(leads, (l) => l.origem),
    cities: groupBy(
      leads,
      (l) => l.cidade,
    ),
  };
}
export function timeSeries(data, period, now = new Date()) {
  const today = dayKey(now);
  const start =
    period === "7"
      ? shiftDay(today, -6)
      : period === "30"
        ? shiftDay(today, -29)
        : period === "month"
          ? `${today.slice(0, 7)}-01`
          : `${shiftDay(today, -150).slice(0, 7)}-01`;
  const buckets = new Map();
  for (let day = start; day <= today; day = shiftDay(day, 1)) {
    const key = period === "months" ? day.slice(0, 7) : day;
    if (!buckets.has(key))
      buckets.set(key, {
        name:
          period === "months"
            ? `${key.slice(5)}/${key.slice(0, 4)}`
            : `${day.slice(8)}/${day.slice(5, 7)}`,
        leads: 0,
        faturamento: 0,
      });
  }
  data.leads.forEach((l) => {
    const key = dayKey(l.created_at).slice(0, period === "months" ? 7 : 10);
    if (inRange(l.created_at, start, today) && buckets.has(key))
      buckets.get(key).leads++;
    if (
      l.status === "fechado" &&
      l.fechado_em &&
      inRange(l.fechado_em, start, today)
    ) {
      const closeKey = dayKey(l.fechado_em).slice(
        0,
        period === "months" ? 7 : 10,
      );
      const q = data.orcamentos.find(
        (q) => q.lead_id === l.id && q.status === "aceito",
      );
      if (buckets.has(closeKey))
        buckets.get(closeKey).faturamento += Number(q?.valor_final || 0);
    }
  });
  return [...buckets.values()];
}
export function attention(data, now = new Date()) {
  const today = dayKey(now);
  const alerts = [];
  data.leads
    .filter((l) => !["fechado", "perdido"].includes(l.status))
    .forEach((l) => {
      const name =
        data.clientes.find((c) => c.id === l.cliente_id)?.nome || "Cliente";
      const add = (reason, level = "medium") =>
        alerts.push({
          id: `${l.id}-${reason}`,
          leadId: l.id,
          name,
          reason,
          level,
        });
      if (l.status === "novo") add("Novo lead ainda não tratado", "high");
      if (l.status === "orcamento_pendente")
        add("Aguardando orçamento", "high");
      if (l.status === "negociacao" && daysSince(l.etapa_desde, now) >= 7)
        add("Negociação parada há 7 dias ou mais");
      const interactions = data.interacoes
        .filter((i) => i.lead_id === l.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (
        isClientMessage(interactions[0]) &&
        daysSince(interactions[0].created_at, now) >= 2
      )
        add("Cliente sem retorno há 2 dias ou mais", "high");
      data.orcamentos
        .filter((q) => q.lead_id === l.id && q.status === "enviado")
        .forEach((q) => {
          if (
            q.data_envio &&
            daysSince(q.data_envio, now) >= 5 &&
            !interactions.some(
              (i) =>
                isClientMessage(i) && i.created_at > q.data_envio,
            )
          )
            add(`${q.numero_orcamento}: sem resposta há 5 dias ou mais`);
          if (
            q.validade &&
            q.validade >= today &&
            q.validade <= shiftDay(today, 3)
          )
            add(`${q.numero_orcamento}: validade próxima`);
          if (q.validade && q.validade < today)
            add(`${q.numero_orcamento}: validade vencida`);
        });
    });
  data.visitas
    .filter(
      (v) =>
        ACTIVE_VISIT_STATUS.includes(v.status) &&
        v.data_visita >= today &&
        v.data_visita <= shiftDay(today, 2),
    )
    .forEach((v) => {
      const l = data.leads.find((l) => l.id === v.lead_id);
      alerts.push({
        id: v.id,
        leadId: v.lead_id,
        name: data.clientes.find((c) => c.id === l?.cliente_id)?.nome,
        reason: `Visita próxima: ${v.data_visita.split("-").reverse().join("/")}${v.horario_visita ? ` às ${v.horario_visita.slice(0, 5)}` : ""}`,
        level: "medium",
      });
    });
  return alerts;
}
