import { useState } from "react";
import { useCRM } from "../contexts/CRMContext";
import { Modal } from "./ui/Common";
import {
  LEAD_STATUS,
  QUOTE_STATUS,
  VISIT_STATUS,
  SOURCES,
  INTERACTION_TYPES,
} from "../utils/constants";
import { errorMessage, normalizePhone, money } from "../utils/format";
const field = (name, label, type = "text", required = false, options) => ({
  name,
  label,
  type,
  required,
  options,
});
export default function RecordForm({
  table,
  record,
  defaults = {},
  onClose,
  onSaved,
}) {
  const { data, save } = useCRM();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({ ...defaults, ...record });
  const clientOptions = Object.fromEntries(
    data.clientes.map((c) => [c.id, `${c.nome} • ${c.telefone}`]),
  );
  const leadOptions = Object.fromEntries(
    data.leads.map((l) => {
      const cliente =
        data.clientes.find((c) => c.id === l.cliente_id)?.nome ||
        "Cliente";

      const servico =
        data.servicos.find((s) => s.id === l.servico)?.nome ||
        l.servico ||
        "Serviço não informado";

      return [
        l.id,
        `${cliente} • ${servico} • ${l.id.slice(0, 8)}`,
      ];
    }),
  );
  const schemas = {
    clientes: [
      field("nome", "Nome", "text", true),
      field("telefone", "Telefone com DDD", "tel", true),
      field("email", "Email", "email"),
      field("cidade", "Cidade"),
      field("bairro", "Bairro"),
      field("cep", "CEP"),
      field("endereco", "Endereço"),
      field("numero", "Número"),
      field("complemento", "Complemento"),
    ],
    leads: [
      field("cliente_id", "Cliente", "select", true, clientOptions),
      field(
        "servico",
        "Serviço",
        "select",
        true,
        Object.fromEntries(
          data.servicos
            .filter((s) => s.ativo || s.id === record?.servico)
            .map((s) => [s.id, s.nome]),
        ),
      ),
      field(
        "origem",
        "Origem",
        "select",
        true,
        Object.fromEntries(SOURCES.map((s) => [s, s])),
      ),
      field("status", "Etapa", "select", true, LEAD_STATUS),
      field("descricao", "Descrição", "textarea"),
      field("medidas", "Medidas"),
      field("tipo_vidro", "Tipo de vidro"),
      field("cor_vidro", "Cor do vidro"),
      field("prazo_desejado", "Prazo desejado", "date"),
      field("necessita_visita", "Necessita visita técnica", "checkbox"),
      field("observacoes", "Observações", "textarea"),
    ],
    orcamentos: [
      field("lead_id", "Oportunidade", "select", true, leadOptions),
      field("valor", "Valor (R$)", "number", true),
      field("desconto", "Desconto em reais", "number"),
      field("status", "Status", "select", true, QUOTE_STATUS),
      field("validade", "Validade", "date"),
      field("observacoes", "Observações", "textarea"),
    ],
    visitas: [
      field("lead_id", "Oportunidade", "select", true, leadOptions),
      field("data_visita", "Data", "date", true),
      field("horario_visita", "Horário (Brasília)", "time", true),
      field("endereco", "Endereço completo", "text", true),
      field("responsavel", "Responsável", "text", true),
      field("status", "Status", "select", true, VISIT_STATUS),
      field("observacoes", "Observações", "textarea"),
    ],
    servicos: [
      field("nome", "Nome do serviço", "text", true),
      field("descricao", "Descrição", "textarea"),
      field("ativo", "Serviço ativo", "checkbox"),
    ],
    interacoes: [
      field("tipo", "Tipo", "select", true, INTERACTION_TYPES),
      field("mensagem", "Registro da interação", "textarea", true),
    ],
  };
  const titles = {
    clientes: "cliente",
    leads: "lead",
    orcamentos: "orçamento",
    visitas: "visita",
    servicos: "serviço",
    interacoes: "interação",
  };
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        schemas[table].map((f) => [
          f.name,
          f.type === "checkbox"
            ? Boolean(values[f.name])
            : f.type === "number"
              ? Number(values[f.name] || 0)
              : String(values[f.name] || "").trim() || null,
        ]),
      );
      if (table === "clientes")
        payload.telefone = normalizePhone(payload.telefone);
      if (
        table === "clientes" &&
        payload.cep &&
        !/^\d{5}-?\d{3}$/.test(payload.cep)
      )
        throw new Error("Informe um CEP com 8 dígitos.");
      if (table === "orcamentos" && payload.desconto > payload.valor)
        throw new Error("O desconto não pode superar o valor.");
      if (table === "interacoes")
        Object.assign(payload, {
          cliente_id: defaults.cliente_id,
          lead_id: defaults.lead_id || null,
          origem: "CRM",
        });
      if (record && table === "leads") delete payload.cliente_id;
      if (record && ["orcamentos", "visitas"].includes(table))
        delete payload.lead_id;
      if (
        (payload.status === "perdido" || payload.status === "cancelada") &&
        !window.confirm(
          "Confirmar esta alteração de status? O histórico será preservado.",
        )
      ) {
        setBusy(false);
        return;
      }
      const row = await save(table, payload, record?.id);
      onSaved?.(row);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${record ? "Editar" : "Adicionar"} ${titles[table]}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          {schemas[table].map((f) => (
            <label
              key={f.name}
              className={`field ${f.type === "textarea" ? "span-2" : ""} ${f.type === "checkbox" ? "check-field" : ""}`}
            >
              <span>
                {f.label}
                {f.required && " *"}
              </span>
              {f.type === "select" ? (
                <select
                  required={f.required}
                  disabled={
                    busy ||
                    Boolean(
                      record && ["cliente_id", "lead_id"].includes(f.name),
                    )
                  }
                  value={values[f.name] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [f.name]: e.target.value })
                  }
                >
                  <option value="">Selecione…</option>
                  {Object.entries(f.options).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  maxLength={10000}
                  rows={3}
                  value={values[f.name] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [f.name]: e.target.value })
                  }
                />
              ) : (
                <input
                  type={f.type}
                  required={f.required}
                  min={f.type === "number" ? "0" : undefined}
                  max={f.type === "number" ? "999999999999" : undefined}
                  step={f.type === "number" ? "0.01" : undefined}
                  maxLength={f.type === "text" ? 500 : undefined}
                  checked={
                    f.type === "checkbox" ? Boolean(values[f.name]) : undefined
                  }
                  value={
                    f.type === "checkbox" ? undefined : (values[f.name] ?? "")
                  }
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [f.name]:
                        f.type === "checkbox"
                          ? e.target.checked
                          : e.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
        </div>
        {table === "orcamentos" && (
          <p className="form-summary">
            Valor final:{" "}
            <strong>
              {money(Number(values.valor || 0) - Number(values.desconto || 0))}
            </strong>
            <small>
              O aceite não fecha o lead automaticamente. Atualize a etapa ao
              concluir a venda.
            </small>
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="button" disabled={busy}>
            {busy ? "Salvando…" : "Salvar registro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
