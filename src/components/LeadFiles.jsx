import { useEffect, useState } from "react";
import { Upload, FileText, Trash2, ExternalLink } from "lucide-react";
import { useCRM } from "../contexts/CRMContext";
import { fileUrl, uploadFile, removeFile } from "../services/crm";
import { FILE_TYPES } from "../utils/constants";
import { errorMessage } from "../utils/format";
import { Empty } from "./ui/Common";
function FileCard({ file, onDelete, busy }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      fileUrl(file.url)
        .then((u) => {
          if (active) {
            setUrl(u);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    load();
    const timer = setInterval(load, 240000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [file.url]);
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file.nome);
  return (
    <article className="file-card">
      {url && isImage ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={file.descricao || file.nome} loading="lazy" />
        </a>
      ) : (
        <div className="file-placeholder">
          <FileText />
        </div>
      )}
      <strong>{file.nome}</strong>
      <small>
        {FILE_TYPES[file.tipo]} {file.descricao && `• ${file.descricao}`}
      </small>
      {error && <p className="error">{error}</p>}
      <div className="file-actions">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-link">
            Abrir <ExternalLink size={14} />
          </a>
        )}
        <button
          className="icon-button danger"
          disabled={busy}
          aria-label={`Excluir ${file.nome}`}
          onClick={() => onDelete(file)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
export default function LeadFiles({ leadId }) {
  const { data, refresh, notify } = useCRM();
  const [tipo, setTipo] = useState("foto");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = form.elements.arquivo.files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await uploadFile(leadId, file, tipo, description);
      await refresh();
      form.reset();
      setDescription("");
      notify("Arquivo enviado com sucesso.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(file) {
    if (!window.confirm(`Excluir permanentemente o arquivo “${file.nome}”?`))
      return;
    setBusy(true);
    setError("");
    try {
      await removeFile(file);
      await refresh();
      notify("Arquivo excluído.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const files = data.arquivos.filter((f) => f.lead_id === leadId);
  return (
    <section className="panel detail-section">
      <div className="panel-heading">
        <div>
          <h2>Fotos e arquivos</h2>
          <p>Imagens do local, medidas e documentos • acesso privado</p>
        </div>
      </div>
      <form className="upload-form" onSubmit={upload}>
        <label className="field">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(FILE_TYPES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Descrição</span>
          <input
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Arquivo (até 10 MB)</span>
          <input
            name="arquivo"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
        </label>
        <button className="button secondary" disabled={busy}>
          <Upload size={16} />
          {busy ? "Aguarde…" : "Enviar"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {files.length ? (
        <div className="files-grid">
          {files.map((f) => (
            <FileCard key={f.id} file={f} onDelete={remove} busy={busy} />
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhum arquivo anexado"
          text="Adicione fotos, referências ou documentos a esta oportunidade."
        />
      )}
    </section>
  );
}
