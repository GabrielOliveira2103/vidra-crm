import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, CalendarDays } from "lucide-react";
import { useCRM } from "../contexts/CRMContext";
import { PageHeader, SearchBox } from "../components/ui/Common";
import { LEAD_STATUS } from "../utils/constants";
import { date, daysSince, money, errorMessage } from "../utils/format";
import { latestQuote } from "../utils/analytics";
export default function Pipeline() {
  const { data, save } = useCRM();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function change(l, status) {
    if (
      status === "perdido" &&
      !window.confirm("Marcar esta oportunidade como perdida?")
    )
      return;
    setBusy(l.id);
    setError("");
    try {
      await save("leads", { status }, l.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  const rows = data.leads.filter((l) =>
    `${data.clientes.find((c) => c.id === l.cliente_id)?.nome} ${data.servicos.find((s) => s.id === l.servico)?.nome}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Pipeline comercial"
        subtitle="Uma visão clara de cada etapa. Use o menu dos cards para movimentar os leads."
      />
      <div className="pipeline-tools">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Buscar no pipeline…"
        />
        <span>{rows.length} oportunidades</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="kanban">
        {Object.entries(LEAD_STATUS).map(([status, label]) => {
          const leads = rows.filter((l) => l.status === status);
          return (
            <section className={`kanban-column column-${status}`} key={status}>
              <h2>
                <span className={`stage-dot stage-${status}`} />
                {label}
                <small>{leads.length}</small>
              </h2>
              <div className="kanban-cards">
                {leads.map((l) => {
                  const c = data.clientes.find((c) => c.id === l.cliente_id);
                  const q = latestQuote(data, l.id);
                  return (
                    <article className="kanban-card" key={l.id}>
                      <Link to={`/leads/${l.id}`}>
                        <strong>{c?.nome}</strong>
                        <span>
                          {data.servicos.find((s) => s.id === l.servico)?.nome}
                        </span>
                      </Link>
                      <p>
                        <MapPin size={13} />
                        {[l?.cidade, l?.bairro].filter(Boolean).join(" • ") ||
                          "Local não informado"}
                      </p>
                      <p>
                        <CalendarDays size={13} />
                        {date(l.created_at)}
                      </p>
                      <div className="card-values">
                        <strong>
                          {q ? money(q.valor) : "Sem orçamento"}
                        </strong>
                        <small>{daysSince(l.etapa_desde)}d na etapa</small>
                      </div>
                      <select
                        aria-label={`Etapa de ${c?.nome}`}
                        value={l.status}
                        disabled={Boolean(busy)}
                        onChange={(e) => change(l, e.target.value)}
                      >
                        {Object.entries(LEAD_STATUS).map(([v, name]) => (
                          <option key={v} value={v}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </article>
                  );
                })}
                {!leads.length && (
                  <p className="column-empty">Nenhuma oportunidade</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
