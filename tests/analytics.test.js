import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  dayKey,
  inRange,
  shiftDay,
} from "../src/utils/format.js";
import { metrics, attention, timeSeries } from "../src/utils/analytics.js";
const base = () => ({
  clientes: [],
  leads: [],
  orcamentos: [],
  servicos: [],
  visitas: [],
  interacoes: [],
});
test("telefone canônico elimina variações de máscara e DDI", () => {
  assert.equal(normalizePhone("(11) 99999-1234"), "+5511999991234");
  assert.equal(normalizePhone("+55 11 99999-1234"), "+5511999991234");
  assert.equal(normalizePhone("1133334444"), "+551133334444");
  assert.throws(() => normalizePhone("123"));
  assert.throws(() => normalizePhone("+14155552671"));
  assert.throws(() => normalizePhone("+55123456789"));
});
test("datas usam Brasília e limites inclusivos", () => {
  assert.equal(dayKey("2026-09-09T01:00:00Z"), "2026-09-08");
  assert.equal(
    inRange("2026-09-09T01:00:00Z", "2026-09-08", "2026-09-08"),
    true,
  );
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
});
test("base vazia não produz NaN ou valores comerciais fictícios", () => {
  const m = metrics(base());
  assert.equal(m.revenue, 0);
  assert.equal(m.conversion, 0);
  assert.equal(m.ticket, 0);
  assert.equal(m.quoteDelay, null);
});
test("faturamento usa fechamento e somente o orçamento aceito; conversão usa coorte", () => {
  const data = base();
  data.leads = [
    {
      id: "a",
      status: "fechado",
      created_at: "2026-08-10T12:00:00Z",
      fechado_em: "2026-09-05T12:00:00Z",
    },
    {
      id: "b",
      status: "fechado",
      created_at: "2026-09-01T12:00:00Z",
      fechado_em: "2026-09-06T12:00:00Z",
    },
    { id: "c", status: "negociacao", created_at: "2026-09-02T12:00:00Z" },
  ];
  data.orcamentos = [
    {
      id: "1",
      lead_id: "a",
      status: "aceito",
      valor_final: 5800,
      data_envio: "2026-08-12T12:00:00Z",
      created_at: "2026-08-12T12:00:00Z",
    },
    {
      id: "2",
      lead_id: "a",
      status: "recusado",
      valor_final: 9900,
      created_at: "2026-08-11T12:00:00Z",
    },
    {
      id: "3",
      lead_id: "c",
      status: "enviado",
      valor_final: 2200,
      created_at: "2026-09-03T12:00:00Z",
    },
  ];
  const m = metrics(data, "2026-09-01", "2026-09-30");
  assert.equal(m.revenue, 5800);
  assert.equal(m.ticket, 5800);
  assert.equal(m.missingAccepted, 1);
  assert.equal(m.negotiation, 2200);
  assert.equal(m.conversion, 50);
  assert.equal(
    timeSeries(data, "30", new Date("2026-09-08T12:00:00Z")).reduce(
      (s, d) => s + d.faturamento,
      0,
    ),
    5800,
  );
});
test("alertas respeitam última interação, validade e visita próxima", () => {
  const data = base();
  data.clientes = [{ id: "c", nome: "Teste" }];
  data.leads = [
    {
      id: "l",
      cliente_id: "c",
      status: "negociacao",
      created_at: "2026-08-01T12:00:00Z",
      etapa_desde: "2026-09-01T12:00:00Z",
    },
  ];
  data.interacoes = [
    {
      lead_id: "l",
      tipo: "mensagem",
      origem: "cliente",
      created_at: "2026-09-01T12:00:00Z",
    },
  ];
  data.visitas = [
    {
      id: "v",
      lead_id: "l",
      status: "agendada",
      data_visita: "2026-09-09",
      horario_visita: "10:00",
    },
  ];
  data.orcamentos = [
    {
      lead_id: "l",
      status: "enviado",
      numero_orcamento: "T-1",
      data_envio: "2026-09-02T12:00:00Z",
      validade: "2026-09-10",
    },
  ];
  let alerts = attention(data, new Date("2026-09-08T12:00:00Z"));
  assert.equal(alerts.length, 5);
  assert.ok(alerts.every((a) => a.leadId === "l"));
  data.interacoes.push({
    lead_id: "l",
    tipo: "mensagem",
    origem: "humano",
    created_at: "2026-09-07T12:00:00Z",
  });
  alerts = attention(data, new Date("2026-09-08T12:00:00Z"));
  assert.ok(!alerts.some((a) => a.reason.includes("Cliente sem retorno")));
});
