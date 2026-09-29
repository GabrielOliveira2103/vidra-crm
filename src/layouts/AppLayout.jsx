import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Columns3,
  ContactRound,
  FileText,
  CalendarDays,
  Layers,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Gem,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCRM } from "../contexts/CRMContext";
import { supabase } from "../lib/supabase";
import { Loading } from "../components/ui/Common";
const links = [
  ["/", "Visão Geral", LayoutDashboard],
  ["/leads", "Leads", Users],
  ["/pipeline", "Pipeline", Columns3],
  ["/clientes", "Clientes", ContactRound],
  ["/orcamentos", "Orçamentos", FileText],
  ["/visitas", "Visitas", CalendarDays],
  ["/servicos", "Serviços", Layers],
  ["/relatorios", "Relatórios", ChartNoAxesCombined],
  ["/configuracoes", "Configurações", Settings],
];
export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { session } = useAuth();
  const { data, loading, error, refresh, notice } = useCRM();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-icon" aria-hidden="true">
            <Gem size={25} />
          </span>
          <span>
            vidra<span className="brand-dot">.</span>
            <small>CRM COMERCIAL</small>
          </span>
        </NavLink>
        <button
          className="mobile-close icon-button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <span className="nav-label">ÁREA DE TRABALHO</span>
        <nav aria-label="Navegação principal">
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === "/leads" && data.leads.length > 0 && (
                <small>{data.leads.length}</small>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-badge">
            <span className="online-dot" aria-hidden="true" />
            <div>
              Seu espaço comercial
              <small>Vidros, projetos e oportunidades</small>
            </div>
          </div>
          <button
            className="logout"
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) setLogoutError(error.message);
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span>
              Workspace <span className="breadcrumb-slash">/</span>{" "}
              <strong>Comercial</strong>
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              onClick={refresh}
              aria-label="Atualizar dados"
              title="Atualizar dados"
            >
              <RefreshCw size={17} />
            </button>
            <span className="today">
              {new Date().toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                timeZone: "America/Sao_Paulo",
              })}
            </span>
            <span className="avatar">
              {session.user.email?.slice(0, 2).toUpperCase() || "CR"}
            </span>
          </div>
        </header>
        <main id="conteudo" tabIndex={-1}>
          {data.clientes.some((c) => c.demonstracao) && (
            <div className="demo-banner">
              DEMONSTRAÇÃO • Este banco contém registros fictícios para testes.
            </div>
          )}
          {logoutError && (
            <p className="error" role="alert">
              {logoutError}
            </p>
          )}
          {loading ? (
            <Loading />
          ) : error ? (
            <div className="panel error-panel">
              <h2>Não foi possível carregar o CRM</h2>
              <p role="alert">{error}</p>
              <button className="button" onClick={refresh}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <footer>
          Vidra CRM <span>Organização para cada oportunidade.</span>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status" aria-live="polite">
          ✓ {notice}
        </div>
      )}
    </div>
  );
}
