import { Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CRMProvider } from "../contexts/CRMContext";
import AppLayout from "../layouts/AppLayout";
import Login from "../pages/Login";
import { Loading, Empty } from "../components/ui/Common";
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Leads = lazy(() => import("../pages/Leads"));
const Pipeline = lazy(() => import("../pages/Pipeline"));
const Records = lazy(() => import("../pages/Records"));
const Detail = lazy(() => import("../pages/Detail"));
const Reports = lazy(() => import("../pages/Reports"));
const Settings = lazy(() => import("../pages/Settings"));
function Protected() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return (
    <CRMProvider key={session.user.id}>
      <Outlet />
    </CRMProvider>
  );
}
export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<Detail key="lead" />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route
              path="clientes"
              element={<Records key="clientes" table="clientes" />}
            />
            <Route
              path="clientes/:id"
              element={<Detail key="client" clientMode />}
            />
            <Route
              path="orcamentos"
              element={<Records key="orcamentos" table="orcamentos" />}
            />
            <Route
              path="visitas"
              element={<Records key="visitas" table="visitas" />}
            />
            <Route
              path="servicos"
              element={<Records key="servicos" table="servicos" />}
            />
            <Route path="relatorios" element={<Reports />} />
            <Route path="configuracoes" element={<Settings />} />
            <Route
              path="*"
              element={
                <>
                  <Empty title="Página não encontrada" />
                  <Link to="/">Voltar à visão geral</Link>
                </>
              }
            />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
