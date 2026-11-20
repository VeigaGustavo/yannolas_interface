import { Modal } from "./Modal";
import { useStudio } from "../hooks/useStudio";
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  CircleHelp,
  Command,
  LayoutDashboard,
  Menu,
  Moon,
  ReceiptText,
  Search,
  Settings,
  Sun,
  UsersRound,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { useAppearance, useInterface } from "../stores/interface";
import { Button } from "./ui/button";
export const navigation = [
  {
    title: "Visão geral",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/crm", label: "CRM", icon: UsersRound },
    ],
  },
  {
    title: "Operações",
    items: [
      { path: "/orcamentos", label: "Orçamentos", icon: ReceiptText },
      { path: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    title: "Preferências",
    items: [{ path: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];
export function Layout() {
  const { menu, setMenu, notice, notify } = useInterface();
  const { theme, accent, setTheme } = useAppearance();
  const data = useStudio().data;
  const reminders = 0; // passa a contar follow-ups na Tarefa 14
  const artist = data?.settings.artist || "Yannis Manolas";
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
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--accent", accent);
  }, [theme, accent]);
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
      {menu && (
        <button
          className="scrim"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside id="sidebar" className={menu ? "sidebar open" : "sidebar"}>
        <NavLink to="/" className="brand" onClick={() => setMenu(false)}>
          <span className="logo">
            <img
              src={import.meta.env.BASE_URL + "brand/yannis-marca.png"}
              alt="Yannis Tattoo"
            />
          </span>
          <span>
            <strong>Yannis | Tattoo</strong>
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
                  onClick={() => setMenu(false)}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="studio-profile"
            onClick={() => {
              navigate("/configuracoes");
              setMenu(false);
            }}
          >
            <span className="avatar lime">{initials}</span>
            <span>
              <strong>{artist}</strong>
              <small>{data?.settings.studio || "Yannis Tattoo"}</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              className="mobile-menu icon-button"
              aria-label="Abrir menu"
              aria-controls="sidebar"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </Button>
            <ChartNoAxesColumnIncreasing size={17} />
            <span>Workspace</span>
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
          title={panel === "search" ? "Buscar módulos" : "Notificações"}
          close={() => setPanel("")}
        >
          {panel === "search" ? (
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
