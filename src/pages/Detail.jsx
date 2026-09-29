import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Phone, MapPin } from "lucide-react";
import { useCRM } from "../contexts/CRMContext";
import { Badge, PageHeader, Table, Empty } from "../components/ui/Common";
import RecordForm from "../components/RecordForm";
import LeadFiles from "../components/LeadFiles";
import { LEAD_STATUS, INTERACTION_TYPES } from "../utils/constants";
import {
  date,
  dateTime,
  daysSince,
  money,
  errorMessage,
} from "../utils/format";
function DetailsList({ values }) {
  return (
    <dl className="details-list">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function Detail({ clientMode = false }) {
  const { id } = useParams();
  const { data, save } = useCRM();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lead = clientMode ? null : data.leads.find((l) => l.id === id);
  const client = data.clientes.find(
    (c) => c.id === (clientMode ? id : lead?.cliente_id),
  );
  if (!client || (!clientMode && !lead))
    return (
      <>
        <Link to={clientMode ? "/clientes" : "/leads"} className="text-link">
          Voltar à lista
        </Link>
        <Empty
          title="Registro não encontrado"
          text="O registro não está disponível neste banco."
        />
      </>
    );
  const leads = clientMode
    ? data.leads.filter((l) => l.cliente_id === client.id)
    : [lead];
  const related = (table) =>
    data[table].filter((r) => leads.some((l) => l.id === r.lead_id));
  const interactions = data.interacoes.filter((i) =>
    clientMode ? i.cliente_id === client.id : i.lead_id === lead.id,
  );
  const timeline = [
    ...interactions.map((i) => ({
      id: i.id,
      title: INTERACTION_TYPES[i.tipo],
      text: i.mensagem,
      created_at: i.created_at,
      source: i.origem,
    })),
    ...related("lead_historico").map((h) => ({
      id: h.id,
      title: h.status_anterior ? "Etapa atualizada" : "Oportunidade criada",
      text: `${h.status_anterior ? `${LEAD_STATUS[h.status_anterior]} → ` : ""}${LEAD_STATUS[h.status_novo]}`,
      created_at: h.created_at,
      source: "CRM / Banco",
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const openForm = (table, record, defaults = {}) =>
    setForm({ table, record, defaults });
  async function changeStatus(status) {
    if (
      status === "perdido" &&
      !window.confirm("Confirmar que esta oportunidade foi perdida?")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await save("leads", { status }, lead.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to={clientMode ? "/clientes" : "/leads"}>
        <ArrowLeft size={16} />
        {clientMode ? "Clientes" : "Leads"}
      </Link>
      <PageHeader
        eyebrow={clientMode ? "RELACIONAMENTO" : "OPORTUNIDADE"}
        title={client.nome}
        subtitle={
          clientMode
            ? "Histórico completo do relacionamento comercial."
            : data.servicos.find((s) => s.id === lead.servico)?.nome
        }
      >
        <button
          className="button secondary"
          onClick={() => openForm("clientes", client)}
        >
          <Pencil size={16} />
          Editar cliente
        </button>
        {clientMode ? (
          <button
            className="button"
            onClick={() =>
              openForm("leads", null, {
                cliente_id: client.id,
                status: "novo",
                origem: "Outro",
              })
            }
          >
            <Plus size={16} />
            Novo lead
          </button>
        ) : (
          <button className="button" onClick={() => openForm("leads", lead)}>
            <Pencil size={16} />
            Editar lead
          </button>
        )}
      </PageHeader>
      <div className="detail-grid">
        <section className="panel detail-section">
          <h2>Dados do cliente</h2>
          <div className="contact-line">
            <Phone size={16} />
            {client.telefone}
          </div>
          <div className="contact-line">
            <MapPin size={16} />
            {[client.cidade, client.bairro].filter(Boolean).join(" • ") ||
              "Local não informado"}
          </div>
          <DetailsList
            values={[
              ["Email", client.email],
              ["Cidade", client.cidade],
              ["Bairro", client.bairro],
              ["CEP", client.cep],
              [
                "Endereço",
                [client.endereco, client.numero, client.complemento]
                  .filter(Boolean)
                  .join(", "),
              ],
              ["Cliente desde", date(client.created_at)],
            ]}
          />
          {!clientMode && (
            <Link className="text-link" to={`/clientes/${client.id}`}>
              Ver histórico do cliente →
            </Link>
          )}
        </section>
        {!clientMode ? (
          <section className="panel detail-section">
            <div className="panel-heading">
              <h2>Serviço e qualificação</h2>
              <Badge value={lead.status} />
            </div>
            <DetailsList
              values={[
                ["Descrição", lead.descricao],
                ["Medidas", lead.medidas],
                ["Tipo de vidro", lead.tipo_vidro],
                ["Cor", lead.cor_vidro],
                ["Prazo desejado", date(lead.prazo_desejado)],
                ["Necessita visita", lead.necessita_visita ? "Sim" : "Não"],
                ["Origem", lead.origem],
                ["Entrada", dateTime(lead.created_at)],
                ["Tempo no funil", `${daysSince(lead.created_at)} dias`],
                ["Tempo na etapa", `${daysSince(lead.etapa_desde)} dias`],
                ["Observações", lead.observacoes],
              ]}
            />
            <label className="field">
              <span>Alterar etapa</span>
              <select
                value={lead.status}
                disabled={busy}
                onChange={(e) => changeStatus(e.target.value)}
              >
                {Object.entries(LEAD_STATUS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        ) : (
          <section className="panel detail-section">
            <h2>Oportunidades e serviços contratados</h2>
            {leads.length ? (
              <div className="opportunity-list">
                {leads.map((l) => (
                  <Link key={l.id} to={`/leads/${l.id}`}>
                    <div>
                      <strong>
                        {data.servicos.find((s) => s.id === l.servico)?.nome}
                      </strong>
                      <small>
                        {date(l.created_at)}{" "}
                        {l.status === "fechado" ? "• Serviço contratado" : ""}
                      </small>
                    </div>
                    <Badge value={l.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </section>
        )}
      </div>
      <section className="panel detail-section">
        <div className="panel-heading">
          <h2>Orçamentos</h2>
          {!clientMode && (
            <button
              className="button secondary"
              onClick={() =>
                openForm("orcamentos", null, {
                  lead_id: lead.id,
                  status: "rascunho",
                  desconto: 0,
                })
              }
            >
              <Plus size={16} />
              Novo orçamento
            </button>
          )}
        </div>
        <Table
          rows={related("orcamentos")}
          onRowClick={(q) => openForm("orcamentos", q)}
          columns={[
            { key: "numero_orcamento", label: "Número" },
            {
              key: "valor_final",
              label: "Valor final",
              render: (q) => money(q.valor_final),
            },
            {
              key: "status",
              label: "Status",
              render: (q) => <Badge value={q.status} />,
            },
            {
              key: "data_envio",
              label: "Envio",
              render: (q) => date(q.data_envio),
            },
            {
              key: "validade",
              label: "Validade",
              render: (q) => date(q.validade),
            },
            { key: "observacoes", label: "Observações" },
          ]}
        />
      </section>
      <section className="panel detail-section">
        <div className="panel-heading">
          <h2>Visitas técnicas</h2>
          {!clientMode && (
            <button
              className="button secondary"
              onClick={() =>
                openForm("visitas", null, {
                  lead_id: lead.id,
                  status: "agendada",
                  endereco: [
                    client.endereco,
                    client.numero,
                    client.bairro,
                    client.cidade,
                  ]
                    .filter(Boolean)
                    .join(", "),
                })
              }
            >
              <Plus size={16} />
              Agendar visita
            </button>
          )}
        </div>
        <Table
          rows={related("visitas")}
          onRowClick={(v) => openForm("visitas", v)}
          columns={[
            {
              key: "data_visita",
              label: "Data",
              render: (v) => date(v.data_visita),
            },
            {
              key: "horario_visita",
              label: "Horário",
              render: (v) =>
                v.horario_visita ? v.horario_visita.slice(0, 5) : "—",
            },
            { key: "endereco", label: "Endereço" },
            { key: "responsavel", label: "Responsável" },
            {
              key: "status",
              label: "Status",
              render: (v) => <Badge value={v.status} />,
            },
            { key: "observacoes", label: "Observações" },
          ]}
        />
      </section>
      {!clientMode && <LeadFiles leadId={lead.id} />}
      <section className="panel detail-section">
        <div className="panel-heading">
          <div>
            <h2>Timeline de interações</h2>
            <p>Mensagens registradas, observações e mudanças de etapa</p>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              openForm("interacoes", null, {
                cliente_id: client.id,
                lead_id: lead?.id,
                tipo: "observacao",
              })
            }
          >
            <Plus size={16} />
            Registrar interação
          </button>
        </div>
        {timeline.length ? (
          <ol className="timeline">
            {timeline.map((i) => (
              <li key={i.id}>
                <span className="timeline-dot" />
                <div>
                  <small>
                    {dateTime(i.created_at)} • {i.source}
                  </small>
                  <strong>{i.title}</strong>
                  <p>{i.text}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="Nenhuma interação registrada" />
        )}
      </section>
      {form && <RecordForm {...form} onClose={() => setForm(null)} />}
    </>
  );
}
