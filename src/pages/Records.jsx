import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import { useCRM } from "../contexts/CRMContext";
import {
  PageHeader,
  SearchBox,
  Filter,
  Table,
  Badge,
} from "../components/ui/Common";
import RecordForm from "../components/RecordForm";
import {
  ACTIVE_VISIT_STATUS,
  QUOTE_STATUS,
  VISIT_STATUS,
} from "../utils/constants";
import { date, money, dayKey, shiftDay, errorMessage } from "../utils/format";
export default function Records({ table }) {
  const { data, save } = useCRM();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const title = {
    clientes: "Clientes",
    orcamentos: "Orçamentos",
    visitas: "Visitas técnicas",
    servicos: "Serviços",
  }[table];
  const singular = {
    clientes: "cliente",
    orcamentos: "orçamento",
    visitas: "visita",
    servicos: "serviço",
  }[table];
  const lead = (r) => data.leads.find((l) => l.id === r.lead_id);
  const client = (r) => data.clientes.find((c) => c.id === lead(r)?.cliente_id);
  const service = (r) => {
    const leadData = lead(r);
    const servicoCadastrado = data.servicos.find(
      (s) => s.id === leadData?.servico
    );

    return servicoCadastrado?.nome || leadData?.servico || "—";
  };
  const opportunityCols = [
    {
      key: "cliente",
      label: "Cliente",
      sortValue: (r) => client(r)?.nome,
      render: (r) => client(r)?.nome,
    },
    { key: "servico", label: "Serviço", sortValue: service, render: service },
  ];
  const clientLeads = (c) => data.leads.filter((l) => l.cliente_id === c.id);
  const latestClientLead = (c) =>
    clientLeads(c)
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const lastContact = (c) =>
    data.interacoes
      .filter((i) => i.cliente_id === c.id)
      .map((i) => i.created_at)
      .sort()
      .at(-1);
  const closedValue = (c) =>
    data.orcamentos
      .filter(
        (q) =>
          q.status === "aceito" &&
          clientLeads(c).some(
            (l) => l.id === q.lead_id && l.status === "fechado",
          ),
      )
      .reduce((s, q) => s + Number(q.valor || 0), 0);
  async function change(row, values) {
    setBusy(true);
    setError("");
    try {
      await save(table, values, row.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const edit = {
    key: "acoes",
    label: "Ações",
    sortable: false,
    render: (r) => (
      <button
        className="icon-button"
        aria-label={`Editar ${singular}`}
        onClick={(e) => {
          e.stopPropagation();
          setForm(r);
        }}
      >
        <Pencil size={16} />
      </button>
    ),
  };
  const columns = {
    clientes: [
      { key: "nome", label: "Nome", render: (c) => <strong>{c.nome}</strong> },
      { key: "telefone", label: "Telefone" },
      {
        key: "cidade",
        label: "Cidade",
        sortValue: (c) => latestClientLead(c)?.cidade || "",
        render: (c) => latestClientLead(c)?.cidade || "—",
      },
      {
        key: "bairro",
        label: "Bairro",
        sortValue: (c) => latestClientLead(c)?.bairro || "",
        render: (c) => latestClientLead(c)?.bairro || "—",
      },
      {
        key: "leads",
        label: "Leads",
        sortValue: (c) => clientLeads(c).length,
        render: (c) => clientLeads(c).length,
      },
      {
        key: "contato",
        label: "Último contato",
        sortValue: lastContact,
        render: (c) => date(lastContact(c)),
      },
      {
        key: "valor",
        label: "Total fechado",
        sortValue: closedValue,
        render: (c) => money(closedValue(c)),
      },
      edit,
    ],
    orcamentos: [
      { key: "numero_orcamento", label: "Número" },
      ...opportunityCols,
      {
        key: "valor",
        label: "Valor",
        sortValue: (q) => Number(q.valor),
        render: (q) => money(q.valor),
      },
      { key: "desconto", label: "Desconto", render: (q) => money(q.desconto) },
      {
        key: "valor_final",
        label: "Valor final",
        sortValue: (q) => Number(q.valor_final ?? q.valor ?? 0),
        render: (q) => (
          <strong>{money(q.valor_final ?? q.valor ?? 0)}</strong>
        ),
      },
      {
        key: "data_envio",
        label: "Envio",
        render: (q) => date(q.data_envio ?? q.enviado_em),
      },
      { key: "validade", label: "Validade", render: (q) => date(q.validade) },
      {
        key: "status",
        label: "Status",
        render: (q) => <Badge value={q.status} />,
      },
      edit,
    ],
    visitas: [
      ...opportunityCols,
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
      {
        key: "endereco",
        label: "Endereço",
        render: (v) =>
          v.endereco ||
          lead(v)?.endereco_servico ||
          "—",
      },
      { key: "responsavel", label: "Responsável" },
      {
        key: "status",
        label: "Status",
        render: (v) => <Badge value={v.status} />,
      },
      edit,
    ],
    servicos: [
      {
        key: "nome",
        label: "Serviço",
        render: (s) => <strong>{s.nome}</strong>,
      },
      { key: "descricao", label: "Descrição" },
      {
        key: "ativo",
        label: "Disponibilidade",
        render: (s) => (
          <button
            className={`badge ${s.ativo ? "badge-fechado" : "badge-perdido"}`}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              change(s, { ativo: !s.ativo });
            }}
          >
            {s.ativo ? "Ativo • desativar" : "Inativo • ativar"}
          </button>
        ),
      },
      edit,
    ],
  };
  const today = dayKey();
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = shiftDay(today, -(weekday === 0 ? 6 : weekday - 1));
  const rows = data[table]
    .filter((r) => {
      if (
        !`${r.nome || ""} ${r.telefone || ""} ${r.numero_orcamento || ""} ${client(r)?.nome || ""} ${service(r)}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      if (status && r.status !== status) return false;
      if (table === "visitas" && view) {
        if (view === "realizadas") return r.status === "realizada";
        if (!ACTIVE_VISIT_STATUS.includes(r.status)) return false;
        if (view === "hoje") return r.data_visita === today;
        if (view === "amanha") return r.data_visita === shiftDay(today, 1);
        if (view === "semana")
          return r.data_visita >= monday && r.data_visita <= shiftDay(monday, 6);
        if (view === "proximas") return r.data_visita >= today;
      }
      return true;
    })
    .sort((a, b) =>
      table === "visitas"
        ? `${a.data_visita}${a.horario_visita}`.localeCompare(`${b.data_visita}${b.horario_visita}`)
        : b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          {
            clientes: "Pessoas, relacionamentos e novas possibilidades.",
            orcamentos: "Propostas organizadas para negociar com clareza.",
            visitas: "Organize a agenda da sua equipe técnica.",
            servicos: "Gerencie o catálogo de soluções da sua vidraçaria.",
          }[table]
        }
      >
        <button className="button" onClick={() => setForm({})}>
          <Plus size={17} />
          Adicionar {singular}
        </button>
      </PageHeader>
      {table === "visitas" && (
        <div className="tabs">
          {Object.entries({
            "": "Todas",
            hoje: "Hoje",
            amanha: "Amanhã",
            semana: "Esta semana",
            proximas: "Próximas",
            realizadas: "Realizadas",
          }).map(([key, label]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={`Buscar ${title.toLowerCase()}…`}
          />
          {["orcamentos", "visitas"].includes(table) && (
            <Filter
              label="Status"
              value={status}
              onChange={setStatus}
              options={table === "orcamentos" ? QUOTE_STATUS : VISIT_STATUS}
            />
          )}
        </div>
        <Table
          columns={columns[table]}
          rows={rows}
          onRowClick={
            table === "clientes"
              ? (c) => navigate(`/clientes/${c.id}`)
              : table === "servicos"
                ? undefined
                : (r) => setForm(r)
          }
        />
      </section>
      {form && (
        <RecordForm
          table={table}
          record={form.id ? form : undefined}
          defaults={{
            status: table === "orcamentos" ? "rascunho" : "agendada",
            ativo: true,
            desconto: 0,
          }}
          onClose={() => setForm(null)}
        />
      )}
    </>
  );
}
