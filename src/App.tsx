import { lazy, type ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { useSession } from "./stores/session";
const CRM = lazy(() => import("./pages/CRM"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const FollowUp = lazy(() => import("./pages/FollowUp"));

function RequireSession({ children }: { children: ReactNode }) {
  const tenantId = useSession((s) => s.tenantId);
  return tenantId ? children : <Navigate to="/login" replace />;
}
const Soon = ({ title }: { title: string }) => (
  <div className="page">
    <h1>{title}</h1>
    <p>Módulo em construção.</p>
  </div>
);

export function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route
        element={
          <RequireSession>
            <Layout />
          </RequireSession>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="crm" element={<CRM />} />
        <Route path="follow-up" element={<FollowUp />} />
        <Route path="faturamento" element={<Billing />} />
        <Route path="fidelidade" element={<Loyalty />} />
        <Route path="estoque" element={<Soon title="Estoque" />} />
        <Route path="orcamentos" element={<Quotes />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route
          path="*"
          element={
            <div className="page">
              <h1>Página indisponível</h1>
              <Link to="/">Voltar ao início</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
