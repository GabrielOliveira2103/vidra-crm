import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Gem, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { configured, supabase } from "../lib/supabase";
import { Loading } from "../components/ui/Common";
export default function Login() {
  const { session, loading, error: sessionError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (session) return <Navigate to={location.state?.from || "/"} replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch {
      setError("Não foi possível entrar. Verifique email, senha e conexão.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Gem />
          </span>
          <span>
            vidra.<small>CRM COMERCIAL</small>
          </span>
        </div>
        <div>
          <span className="eyebrow">CLAREZA PARA CRESCER</span>
          <h1>
            Grandes projetos.
            <br />
            Boas relações.
            <br />
            <em>Tudo conectado.</em>
          </h1>
          <p>
            Da primeira conversa ao serviço fechado, acompanhe cada oportunidade
            com uma visão completa do seu negócio.
          </p>
          <div className="glass-art">
            <span />
            <span />
            <span />
          </div>
        </div>
        <small>Seu comercial, com uma nova perspectiva.</small>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <span className="eyebrow">BEM-VINDO AO SEU ESPAÇO</span>
          <h2>Acesse sua conta</h2>
          <p>Entre para acompanhar seu comercial.</p>
          {!configured ? (
            <div className="setup-notice">
              <ShieldCheck size={28} />
              <h3>Conecte seu Supabase</h3>
              <p>
                Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo
                .env e reinicie o servidor.
              </p>
              <p>
                Execute as migrations, crie um usuário e autorize-o em
                crm_usuarios conforme o README.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                />
              </label>
              <label className="field">
                <span>Senha</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                />
              </label>
              {(error || sessionError) && (
                <p className="error" role="alert">
                  {error || sessionError}
                </p>
              )}
              <button className="button login-submit" disabled={busy}>
                {busy ? "Entrando…" : "Entrar no CRM"}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
          <p className="login-help">
            <ShieldCheck size={16} /> Acesso exclusivo para a equipe autorizada.
          </p>
        </div>
      </section>
    </div>
  );
}
