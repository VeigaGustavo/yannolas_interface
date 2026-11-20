import { Modal } from "./Modal";
import { useQueryClient } from "@tanstack/react-query";
import { useStudio, useTenant } from "../hooks/useStudio";
import { useSession } from "../stores/session";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Command,
  Ellipsis,
  Gift,
  LayoutDashboard,
  LogOut,
  MessageSquareReply,
  Moon,
  Package,
  ReceiptText,
  Search,
  Settings,
  Sun,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { useAppearance, useInterface } from "../stores/interface";
import { Button } from "./ui/button";
export const primaryNav = [
  { path: "/", label: "Início", icon: LayoutDashboard },
  { path: "/agenda", label: "Agenda", icon: CalendarDays },
  { path: "/crm", label: "Clientes", icon: UsersRound },
  { path: "/follow-up", label: "Follow-up", icon: MessageSquareReply },
];
export const secondaryNav = [
  { path: "/faturamento", label: "Faturamento", icon: Wallet },
  { path: "/fidelidade", label: "Fidelidade", icon: Gift },
  { path: "/estoque", label: "Estoque", icon: Package },
  { path: "/orcamentos", label: "Orçamentos", icon: ReceiptText },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];
export const navigation = [
  { title: "Operação", items: primaryNav },
  { title: "Gestão", items: secondaryNav },
];
export function Layout() {
  const { notice, notify } = useInterface();
  const tenant = useTenant();
  const logout = useSession((s) => s.logout);
  const queryClient = useQueryClient();
  const { theme, accent, setTheme } = useAppearance();
  const data = useStudio().data;
  const reminders = 0; // passa a contar follow-ups na Tarefa 14
  const artist = data?.settings.artist || tenant.professional;
  const initials = artist
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
  const [panel, setPanel] = useState("");
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const page =
    navigation.flatMap((g) => g.items).find((i) => i.path === location.pathname)
      ?.label || "Página";
  const leave = () => {
    setPanel("");
    logout();
    queryClient.clear();
    navigate("/login", { replace: true });
  };
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.tenant = tenant.id;
    root.style.setProperty("--accent", accent);
    document.title = tenant.name + " | Painel do estúdio";
  }, [theme, accent, tenant]);
  useEffect(() => setPanel(""), [location.pathname]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 4200);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPanel((p) => (p === "search" ? "" : "search"));
      }
      if (event.key === "Escape") setPanel("");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <div className="layout">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <aside id="sidebar" className="sidebar">
        <NavLink to="/" className="brand">
          <span className="logo">
            {tenant.logo ? (
              <img
                src={import.meta.env.BASE_URL + tenant.logo}
                alt={tenant.name}
              />
            ) : (
              <span className="logo-mark" aria-hidden="true">
                {tenant.mark.slice(0, 1)}
              </span>
            )}
          </span>
          <span>
            <strong>{tenant.mark}</strong>
            <small>PAINEL DO ESTÚDIO</small>
          </span>
        </NavLink>
        <nav aria-label="Principal">
          {navigation.map((g) => (
            <div className="nav-group" key={g.title}>
              <div className="nav-heading">{g.title}</div>
              {g.items.map(({ path, label, icon: Icon }) => (
                <NavLink
                  to={path}
                  end={path === "/"}
                  key={path}
                  className={g.items === secondaryNav ? "nav-secondary" : ""}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <button
            className="nav-more"
            aria-expanded={panel === "more"}
            onClick={() => setPanel(panel === "more" ? "" : "more")}
          >
            <Ellipsis size={18} />
            <span>Mais</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button
            className="studio-profile"
            onClick={() => navigate("/configuracoes")}
          >
            <span className="avatar lime">{initials}</span>
            <span>
              <strong>{artist}</strong>
              <small>{data?.settings.studio || tenant.name}</small>
            </span>
            <ChevronDown size={15} />
          </button>
          <Button variant="ghost" className="logout" onClick={leave}>
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="topbar-studio">{tenant.name}</span>
            <span className="slash">/</span>
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <Button
              className="search-trigger"
              aria-label="Buscar módulos"
              onClick={() => {
                setSearch("");
                setPanel("search");
              }}
            >
              <Search size={16} />
              <span>Buscar</span>
              <kbd>
                <Command size={11} /> K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              className="icon-button"
              aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            <Button
              variant="ghost"
              className="icon-button notification"
              aria-label="Notificações"
              onClick={() =>
                setPanel(panel === "notifications" ? "" : "notifications")
              }
            >
              <Bell size={19} />
              {reminders > 0 && <i />}
            </Button>
          </div>
        </header>
        <main id="conteudo">
          <Suspense
            fallback={
              <div className="page" role="status">
                Carregando módulo…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      {panel && (
        <Modal
          title={
            panel === "search"
              ? "Buscar módulos"
              : panel === "more"
                ? "Mais opções"
                : "Notificações"
          }
          close={() => setPanel("")}
        >
          {panel === "more" ? (
            <div className="more-sheet">
              {secondaryNav.map(({ path, label, icon: Icon }) => (
                <NavLink to={path} key={path} onClick={() => setPanel("")}>
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
              <Button variant="ghost" onClick={leave}>
                <LogOut size={18} /> Sair
              </Button>
            </div>
          ) : panel === "search" ? (
            <>
              <input
                autoFocus
                placeholder="Digite o nome de um módulo"
                aria-label="Nome do módulo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="search-results">
                {navigation
                  .flatMap((g) => g.items)
                  .filter((i) =>
                    i.label.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((i) => (
                    <Button
                      key={i.path}
                      onClick={() => {
                        navigate(i.path);
                        setPanel("");
                      }}
                    >
                      <i.icon size={17} />
                      {i.label}
                    </Button>
                  ))}
                {!navigation
                  .flatMap((g) => g.items)
                  .some((i) =>
                    i.label.toLowerCase().includes(search.toLowerCase()),
                  ) && <p>Nenhum módulo encontrado.</p>}
              </div>
            </>
          ) : reminders > 0 ? (
            <div className="stack">
              <p>{reminders} lembrete(s) de retorno para hoje ou em atraso.</p>
              <Button
                onClick={() => {
                  setPanel("");
                  navigate("/");
                }}
              >
                Ver acompanhamentos
              </Button>
            </div>
          ) : (
            <div className="empty">
              <CircleHelp size={24} />
              <p>Sem novas notificações.</p>
            </div>
          )}
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <Button
            variant="ghost"
            className="icon-button"
            aria-label="Dispensar aviso"
            onClick={() => notify("")}
          >
            <X size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
