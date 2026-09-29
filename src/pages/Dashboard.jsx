import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Users,
  Target,
  Wallet,
  TrendingUp,
  Plus,
  AlertCircle,
  Clock,
  Timer,
  Flame,
  Megaphone,
} from "lucide-react";
import { useCRM } from "../contexts/CRMContext";
import { PageHeader, Empty } from "../components/ui/Common";
import {
  TrendChart,
  RankingChart,
  ConversionChart,
} from "../components/Charts";
import RecordForm from "../components/RecordForm";
import { metrics, timeSeries, attention } from "../utils/analytics";
import { money, percent, dayKey } from "../utils/format";
import { ACTIVE_VISIT_STATUS } from "../utils/constants";
export default function Dashboard() {
  const { data } = useCRM();
  const [period, setPeriod] = useState("30");
  const [form, setForm] = useState(false);
  const m = metrics(data);
  const today = dayKey();
  const series = timeSeries(data, period);
  const alerts = attention(data);
  const count = (status) =>
    data.leads.filter((l) => l.status === status).length;
  const cards = [
    [
      "Novos leads no mês",
      data.leads.filter((l) =>
        dayKey(l.created_at).startsWith(today.slice(0, 7)),
      ).length,
      Users,
      "Oportunidades recebidas",
    ],
    [
      "Leads em aberto",
      data.leads.filter((l) => !["fechado", "perdido"].includes(l.status))
        .length,
      Target,
      "Relacionamentos em andamento",
    ],
    [
      "Faturamento fechado",
      money(m.revenue),
      Wallet,
      "Leads fechados com orçamento aceito",
      true,
    ],
    [
      "Taxa de conversão",
      percent(m.conversion),
      TrendingUp,
      "Fechados / total de leads",
    ],
  ];
  const secondary = [
    [
      "Novos leads hoje",
      data.leads.filter((l) => dayKey(l.created_at) === today).length,
    ],
    ["Aguardando visita", count("aguardando_visita")],
    [
      "Visitas agendadas",
      data.visitas.filter(
        (v) =>
          ACTIVE_VISIT_STATUS.includes(v.status) && v.data_visita >= today,
      ).length,
    ],
    ["Orçamentos pendentes", count("orcamento_pendente")],
    [
      "Orçamentos enviados",
      data.orcamentos.filter((q) => q.status === "enviado").length,
    ],
    ["Negociações abertas", count("negociacao")],
    ["Serviços fechados", m.closed],
    ["Leads perdidos", m.lost],
    ["Valor em negociação", money(m.negotiation)],
    ["Ticket médio", money(m.ticket)],
  ];
  const days = (value) =>
    value === null || value === undefined ? "—" : `${Math.round(value)}d`;
  const indicators = [
    [
      "Tempo até orçamento",
      days(m.quoteDelay),
      Clock,
      "Média entre lead criado e 1º orçamento enviado",
    ],
    [
      "Tempo até fechamento",
      days(m.closeDelay),
      Timer,
      "Média entre orçamento enviado e fechamento",
    ],
    [
      "Serviço mais procurado",
      m.services[0]?.name || "—",
      Flame,
      m.services[0] ? `${m.services[0].value} lead(s) no histórico` : "Sem dados suficientes",
    ],
    [
      "Principal canal",
      m.sources[0]?.name || "—",
      Megaphone,
      m.sources[0] ? `${m.sources[0].value} lead(s) de origem` : "Sem dados suficientes",
    ],
  ];
  const funnel = [
    ["Novos leads", count("novo")],
    [
      "Qualificados",
      data.leads.filter((l) =>
        [
          "qualificando",
          "aguardando_visita",
          "visita_agendada",
          "visita_realizada",
        ].includes(l.status),
      ).length,
    ],
    ["Orçamentos", count("orcamento_pendente") + count("orcamento_enviado")],
    ["Negociação", count("negociacao")],
    ["Fechados", count("fechado")],
  ];
  const funnelMax = Math.max(1, ...funnel.map(([, value]) => value));
  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Cada oportunidade conta. Acompanhe o que move seu negócio."
      >
        <button className="button" onClick={() => setForm(true)}>
          <Plus size={17} />
          Novo lead
        </button>
      </PageHeader>
      <div className="stats-grid">
        {cards.map(([title, value, Icon, caption, highlight]) => (
          <div
            className={`stat-card${highlight ? " highlight" : ""}`}
            key={title}
          >
            <div className="stat-top">
              <span>{title}</span>
              <span className="stat-icon">
                <Icon size={19} />
              </span>
            </div>
            <strong className={String(value).length > 10 ? "is-text" : undefined}>
              {value}
            </strong>
            <small>{caption}</small>
          </div>
        ))}
      </div>
      <span className="eyebrow">INDICADORES OPERACIONAIS</span>
      <div className="stats-grid">
        {indicators.map(([title, value, Icon, caption]) => (
          <div className="stat-card" key={title}>
            <div className="stat-top">
              <span>{title}</span>
              <span className="stat-icon">
                <Icon size={19} />
              </span>
            </div>
            <strong className={String(value).length > 10 ? "is-text" : undefined}>
              {value}
            </strong>
            <small>{caption}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>Leads por período</h2>
              <p>O ritmo das suas novas oportunidades</p>
            </div>
            <select
              aria-label="Período dos gráficos"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="month">Este mês</option>
              <option value="months">Últimos meses</option>
            </select>
          </div>
          <TrendChart data={series} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Serviços mais procurados</h2>
              <p>Interesse dos clientes • todo o histórico</p>
            </div>
          </div>
          <RankingChart data={m.services} />
        </section>
      </div>
      <div className="secondary-stats">
        {secondary.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Funil comercial</h2>
              <p>Distribuição atual das oportunidades</p>
            </div>
            <Link className="text-link" to="/pipeline">
              Ver pipeline <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="funnel">
            {funnel.map(([label, value]) => (
              <div className="funnel-step" key={label}>
                <div
                  className="funnel-bar"
                  style={{
                    width: `${Math.max(38, (value / funnelMax) * 100)}%`,
                  }}
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>
                <AlertCircle size={18} />
                Requer atenção{" "}
                <span className="count-pill">{alerts.length}</span>
              </h2>
              <p>Próximos passos para manter as vendas em movimento</p>
            </div>
          </div>
          <div className="attention-list">
            {alerts.length ? (
              alerts.map((a) => (
                <Link
                  to={`/leads/${a.leadId}`}
                  key={a.id}
                  className="attention-item"
                >
                  <span className={`alert-dot ${a.level}`} aria-hidden="true" />
                  <div>
                    <strong>{a.name}</strong>
                    <small>{a.reason}</small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <Empty
                title="Tudo em dia"
                text="Nenhuma pendência identificada pelas regras atuais."
              />
            )}
          </div>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Faturamento por período</h2>
              <p>Valor dos orçamentos aceitos por data de fechamento</p>
            </div>
          </div>
          <TrendChart data={series} revenue />
          {m.missingAccepted > 0 && (
            <p className="hint">
              {m.missingAccepted} lead(s) fechado(s) sem orçamento aceito,
              excluído(s) do faturamento.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Conversão comercial</h2>
              <p>Todo o histórico</p>
            </div>
          </div>
          <ConversionChart value={m.conversion} total={data.leads.length} />
        </section>
      </div>
      {form && (
        <RecordForm
          table="leads"
          defaults={{
            status: "novo",
            origem: "Outro",
            necessita_visita: false,
          }}
          onClose={() => setForm(false)}
        />
      )}
    </>
  );
}
