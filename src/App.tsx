import { lazy } from "react";
import { Route, Routes, Link } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
const CRM = lazy(() => import("./pages/CRM"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Agent = lazy(() => import("./pages/Agent"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Settings = lazy(() => import("./pages/Settings"));
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="crm" element={<CRM />} />
        <Route path="atendimento" element={<Inbox />} />
        <Route path="agente" element={<Agent />} />
        <Route path="orcamentos" element={<Quotes />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="campanhas" element={<Campaigns />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route
          path="*"
          element={
            <div className="page">
              <h1>Página indisponível</h1>
              <Link to="/">Abrir dashboard</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
