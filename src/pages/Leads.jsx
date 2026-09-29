import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useCRM } from "../contexts/CRMContext";
import {
  PageHeader,
  SearchBox,
  Filter,
  Table,
  Badge,
} from "../components/ui/Common";
import RecordForm from "../components/RecordForm";
import { LEAD_STATUS, SOURCES } from "../utils/constants";
import { date, money, inRange } from "../utils/format";
import { latestQuote } from "../utils/analytics";
export default function Leads() {
  const { data } = useCRM();
  const navigate = useNavigate();
  const [form, setForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [source, setSource] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const client = (l) => data.clientes.find((c) => c.id === l.cliente_id) || {};
  const serviceName = (l) => {
    const service = data.servicos.find((s) => s.id === l.servico);

    return service?.nome || l.servico || "—";
  };
  const rows = data.leads
    .filter(
      (l) =>
        (!status || l.status === status) &&
        (!service || l.servico === service) &&
        (!source || l.origem === source) &&
        inRange(l.created_at, start, end) &&
        `${client(l).nome} ${client(l).telefone} ${serviceName(l)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const columns = [
    {
      key: "cliente",
      label: "Cliente",
      sortValue: (l) => client(l).nome || client(l).telefone || "",
      render: (l) => (
        <strong>{client(l).nome || client(l).telefone || "—"}</strong>
      ),
    },
    {
      key: "telefone",
      label: "Telefone",
      sortValue: (l) => client(l).telefone,
      render: (l) => client(l).telefone,
    },
    {
      key: "servico",
      label: "Serviço",
      sortValue: serviceName,
      render: serviceName,
    },
    {
      key: "cidade",
      label: "Cidade",
      sortValue: (l) => l.cidade || "",
      render: (l) => l.cidade || "—",
    },
    {
      key: "bairro",
      label: "Bairro",
      sortValue: (l) => l.bairro || "",
      render: (l) => l.bairro || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (l) => <Badge value={l.status} />,
    },
    { key: "origem", label: "Origem" },
    { key: "created_at", label: "Entrada", render: (l) => date(l.created_at) },
    {
      key: "valor",
      label: "Orçamento",
      sortValue: (l) => Number(latestQuote(data, l.id)?.valor || 0),
      render: (l) =>
        latestQuote(data, l.id)
          ? money(latestQuote(data, l.id).valor)
          : "—",
    },
  ];
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Todas as oportunidades, do primeiro contato ao fechamento."
      >
        <button className="button" onClick={() => setForm(true)}>
          <Plus size={17} />
          Novo lead
        </button>
      </PageHeader>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Buscar cliente, telefone ou serviço…"
          />
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={LEAD_STATUS}
          />
          <Filter
            label="Serviço"
            value={service}
            onChange={setService}
            options={Object.fromEntries(
              data.servicos.map((s) => [s.id, s.nome]),
            )}
          />
          <Filter
            label="Origem"
            value={source}
            onChange={setSource}
            options={Object.fromEntries(SOURCES.map((s) => [s, s]))}
          />
          <label className="filter">
            <span>De</span>
            <input
              aria-label="Data inicial"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="filter">
            <span>Até</span>
            <input
              aria-label="Data final"
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        {start && end && start > end ? (
          <p className="error">
            O fim do período deve ser posterior ao início.
          </p>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            onRowClick={(l) => navigate(`/leads/${l.id}`)}
          />
        )}
      </section>
      {form && (
        <RecordForm
          table="leads"
          defaults={{ status: "novo", origem: "Outro" }}
          onClose={() => setForm(false)}
          onSaved={(l) => navigate(`/leads/${l.id}`)}
        />
      )}
    </>
  );
}
