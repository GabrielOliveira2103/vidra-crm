import { useState } from "react";
import { useCRM } from "../contexts/CRMContext";
import { PageHeader } from "../components/ui/Common";
import { RankingChart, ConversionChart } from "../components/Charts";
import { metrics } from "../utils/analytics";
import { dayKey, money, percent } from "../utils/format";
export default function Reports() {
  const { data } = useCRM();
  const [start, setStart] = useState(`${dayKey().slice(0, 7)}-01`);
  const [end, setEnd] = useState(dayKey());
  const m = metrics(data, start, end);
  const q = (status) => m.quotes.filter((q) => q.status === status).length;
  const items = [
    ["Quantidade de leads", m.leads.length],
    ["Leads fechados", m.closed],
    ["Leads perdidos", m.lost],
    ["Taxa de conversão", percent(m.conversion)],
    ["Orçamentos enviados", m.quotes.filter((q) => q.data_envio).length],
    ["Orçamentos aceitos", q("aceito")],
    ["Orçamentos recusados", q("recusado")],
    ["Valor em negociação", money(m.negotiation)],
    ["Faturamento", money(m.revenue)],
    ["Ticket médio", money(m.ticket)],
    [
      "Lead → primeiro orçamento",
      m.quoteDelay === null
        ? "—"
        : `${m.quoteDelay.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`,
    ],
    [
      "Orçamento → fechamento",
      m.closeDelay === null
        ? "—"
        : `${m.closeDelay.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`,
    ],
  ];
  return (
    <>
      <PageHeader
        eyebrow="INTELIGÊNCIA COMERCIAL"
        title="Relatórios"
        subtitle="Transforme o histórico comercial em decisões mais claras."
      />
      <div className="panel toolbar">
        <label className="filter">
          <span>Data inicial</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="filter">
          <span>Data final</span>
          <input
            type="date"
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <button
          className="button secondary"
          onClick={() => {
            setStart("");
            setEnd("");
          }}
        >
          Todo o histórico
        </button>
      </div>
      {start && end && start > end ? (
        <p className="error" role="alert">
          A data final deve ser posterior à inicial.
        </p>
      ) : (
        <>
          <div className="report-stats">
            {items.map(([label, value]) => (
              <div className="stat-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {m.missingAccepted > 0 && (
            <p className="hint">
              {m.missingAccepted} fechamento(s) sem orçamento aceito não
              entra(m) no faturamento.
            </p>
          )}
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Serviços mais procurados</h2>
              </div>
              <RankingChart data={m.services} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Cidades com mais clientes</h2>
              </div>
              <RankingChart data={m.cities} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Origens com mais leads</h2>
              </div>
              <RankingChart data={m.sources} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Conversão dos leads do período</h2>
              </div>
              <ConversionChart value={m.conversion} total={m.leads.length} />
            </section>
          </div>
          <section className="panel detail-section">
            <h2>Como os indicadores são calculados</h2>
            <p className="hint">
              Leads, conversão, negociação e tempos médios usam oportunidades
              criadas no intervalo. Orçamentos usam a data de envio (ou criação
              para rascunhos), com seu status atual. Faturamento usa a data de
              fechamento e somente o orçamento aceito de cada lead atualmente
              fechado. Ticket médio divide esse faturamento pelos fechamentos
              com orçamento aceito. Cidades contam clientes distintos com leads
              no intervalo. Datas seguem o horário de Brasília.
            </p>
            <p className="hint">
              Faturamento é o valor comercial fechado, sem controle de
              recebimentos. Os gráficos de ranking mostram os seis primeiros; a
              relação completa está abaixo.
            </p>
          </section>
          <div className="dashboard-grid">
            {[
              ["Serviços", m.services],
              ["Cidades", m.cities],
              ["Origens", m.sources],
            ].map(([title, rows]) => (
              <section className="panel detail-section" key={title}>
                <h2>{title} • relação completa</h2>
                {rows.length ? (
                  <ul className="ranking-list">
                    {rows.map((r) => (
                      <li key={r.name}>
                        <span>{r.name}</span>
                        <strong>{r.value}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hint">Sem registros no intervalo.</p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
