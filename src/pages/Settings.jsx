import { useAuth } from "../contexts/AuthContext";
import { PageHeader } from "../components/ui/Common";
export default function Settings() {
  const { session } = useAuth();
  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Informações do ambiente e preferências operacionais."
      />
      <div className="detail-grid">
        <section className="panel detail-section">
          <h2>Sua conta</h2>
          <dl className="details-list">
            <div>
              <dt>Email</dt>
              <dd>{session.user.email}</dd>
            </div>
            <div>
              <dt>Autenticação</dt>
              <dd>Supabase Auth</dd>
            </div>
            <div>
              <dt>Fuso horário comercial</dt>
              <dd>America/Sao_Paulo</dd>
            </div>
            <div>
              <dt>Moeda</dt>
              <dd>Real brasileiro (BRL)</dd>
            </div>
          </dl>
          <p className="hint">
            Convites, permissões e redefinição de senha são administrados pelo
            responsável pelo Supabase.
          </p>
        </section>
        <section className="panel detail-section">
          <h2>Operação do CRM</h2>
          <p>
            Os registros são atualizados a cada 60 segundos enquanto a página
            está visível. Use o botão de atualizar no cabeçalho para consultar
            imediatamente.
          </p>
          <p>
            As regras da seção “Requer atenção” estão documentadas no README.
            Elas exibem avisos locais e não enviam mensagens.
          </p>
          <p>
            Gerencie o catálogo na página Serviços. Serviços desativados
            continuam visíveis no histórico.
          </p>
        </section>
      </div>
    </>
  );
}
