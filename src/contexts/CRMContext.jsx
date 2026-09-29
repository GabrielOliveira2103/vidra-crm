/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetchCRM, saveRecord, TABLES } from "../services/crm";
import { supabase } from "../lib/supabase";
import { errorMessage } from "../utils/format";
const CRMContext = createContext(null);
export function CRMProvider({ children }) {
  const [data, setData] = useState(
    Object.fromEntries(TABLES.map((t) => [t, []])),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(null);
  const refresh = useCallback(function refreshData(force = false) {
    if (pending.current)
      return force === true
        ? pending.current.then(() => refreshData(true))
        : pending.current;
    async function request() {
      const { data: allowed, error: authError } =
        await supabase.rpc("crm_autorizado");
      if (authError) throw authError;
      if (!allowed)
        throw new Error(
          "Usuário sem acesso ao CRM. Peça ao administrador para incluí-lo em crm_usuarios.",
        );
      return fetchCRM();
    }
    pending.current = request()
      .then((next) => {
        setData(next);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => {
        setLoading(false);
        pending.current = null;
      });
    return pending.current;
  }, []);
  // Carregamento inicial + atualização de segurança a cada 60 segundos
  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (!document.hidden) {
        refresh();
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [refresh]);
  // REALTIME - CRM
  useEffect(() => {
    const realtimeTables = [
      "leads",
      "clientes",
      "visitas",
      "orcamentos",
      "atendimentos",
    ];

    let channel = supabase.channel("crm-realtime");

    realtimeTables.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => refresh(),
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);
  // Notificações do CRM
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function save(table, values, id) {
    const row = await saveRecord(table, values, id);
    await refresh(true);
    setNotice("Alterações salvas com sucesso.");
    return row;
  }
  return (
    <CRMContext.Provider
      value={{
        data,
        loading,
        error,
        refresh,
        save,
        notice,
        notify: setNotice,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}
export const useCRM = () => useContext(CRMContext);
