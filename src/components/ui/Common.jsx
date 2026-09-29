import { useEffect, useRef, useState } from "react";
import {
  X,
  Search,
  Inbox,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LEAD_STATUS, QUOTE_STATUS, VISIT_STATUS } from "../../utils/constants";
export function Badge({ value }) {
  return (
    <span className={`badge badge-${value}`}>
      {LEAD_STATUS[value] ||
        QUOTE_STATUS[value] ||
        VISIT_STATUS[value] ||
        value}
    </span>
  );
}
export function Empty({
  title = "Nenhum registro encontrado",
  text = "Cadastre um registro ou ajuste os filtros para começar.",
}) {
  return (
    <div className="empty">
      <Inbox size={32} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="empty" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>Carregando informações…</p>
    </div>
  );
}
export function PageHeader({
  eyebrow = "COMERCIAL",
  title,
  subtitle,
  children,
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function SearchBox({ value, onChange, placeholder = "Buscar…" }) {
  return (
    <div className="search">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Filter({ label, value, onChange, options, all = "Todos" }) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{all}</option>
        {Object.entries(options).map(([v, name]) => (
          <option key={v} value={v}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Modal({ title, onClose, children, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Table({
  columns,
  rows,
  onRowClick,
  rowLabel = "Abrir registro",
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "", direction: 1 });
  const size = 12;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const col = columns.find((c) => c.key === sort.key);
  const sorted = [...rows].sort((a, b) => {
    if (!col) return 0;
    const av = col.sortValue ? col.sortValue(a) : a[col.key];
    const bv = col.sortValue ? col.sortValue(b) : b[col.key];
    return (
      (typeof av === "number"
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR", {
            numeric: true,
          })) * sort.direction
    );
  });
  if (!rows.length) return <Empty />;
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort.key === c.key
                      ? sort.direction === 1
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {c.sortable === false ? (
                    c.label
                  ) : (
                    <button
                      className="sort-button"
                      onClick={() => {
                        setSort({
                          key: c.key,
                          direction: sort.key === c.key ? -sort.direction : 1,
                        });
                        setPage(1);
                      }}
                    >
                      {c.label}
                      <ArrowUpDown size={12} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice((current - 1) * size, current * size).map((row) => (
              <tr
                key={row.id}
                className={onRowClick ? "clickable" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c, i) => (
                  <td key={c.key}>
                    {i === 0 && onRowClick ? (
                      <button
                        className="table-link"
                        aria-label={`${rowLabel}: ${c.sortValue ? c.sortValue(row) : row[c.key]}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(row);
                        }}
                      >
                        {c.render ? c.render(row) : row[c.key] || "—"}
                      </button>
                    ) : c.render ? (
                      c.render(row)
                    ) : (
                      (row[c.key] ?? "—")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          {rows.length} registros • página {current} de {pages}
        </span>
        <div>
          <button
            className="icon-button"
            disabled={current === 1}
            aria-label="Página anterior"
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            disabled={current === pages}
            aria-label="Próxima página"
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
