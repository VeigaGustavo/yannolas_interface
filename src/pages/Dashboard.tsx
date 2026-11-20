import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Plus,
  Target,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Data, Empty, Page } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { dateOffset, initials, money, shortDate } from "../mocks/studio";
import type { StudioData } from "../types/studio";
const colors = ["lime", "blue", "rose", ""];
const series = {
  "7": [14, 20, 17, 30, 24, 37, 34],
  "30": [19, 28, 24, 36, 31, 45, 41],
  "90": [15, 24, 31, 27, 39, 43, 48],
};
function Performance({ period }: { period: keyof typeof series }) {
  const [active, setActive] = useState<number | null>(null);
  const values = series[period];
  const points = values.map((n, i) => [51 + i * 102, 175 - n * 2.85]);
  const line = points
    .map(([x, y], i) =>
      i
        ? "C " +
          (x - 54) +
          " " +
          points[i - 1][1] +
          ", " +
          (x - 48) +
          " " +
          y +
          ", " +
          x +
          " " +
          y
        : "M " + x + " " + y,
    )
    .join(" ");
  const secondary = points
    .map(([x, y], i) =>
      i
        ? "C " +
          (x - 54) +
          " " +
          (points[i - 1][1] * 0.65 + 63) +
          ", " +
          (x - 48) +
          " " +
          (y * 0.65 + 63) +
          ", " +
          x +
          " " +
          (y * 0.65 + 63)
        : "M " + x + " " + (y * 0.65 + 63),
    )
    .join(" ");
  return (
    <div>
      <div className="chart-legend">
        <span>
          <i /> Leads
        </span>
        <span>
          <i /> Orçamentos
        </span>
        {active !== null && <strong>{values[active]} leads</strong>}
      </div>
      <svg
        className="chart"
        viewBox="0 0 680 207"
        role="img"
        aria-label={"Série ilustrativa de leads: " + values.join(", ")}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="var(--accent)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 10, 20, 30, 40, 50].map((n) => (
          <g key={n}>
            <line x1="50" x2="666" y1={175 - n * 2.85} y2={175 - n * 2.85} />
            <text x="8" y={179 - n * 2.85}>
              {n}
            </text>
          </g>
        ))}
        <path d={line + " L 663 175 L 51 175 Z"} fill="url(#chart-fill)" />
        <path
          d={secondary}
          fill="none"
          stroke="#8d75bd"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d={line}
          fill="none"
          stroke="var(--accent-text)"
          strokeWidth="2.5"
        />
        {points.map(([x, y], i) => (
          <g key={x} onMouseEnter={() => setActive(i)}>
            <circle
              cx={x}
              cy={y}
              r={active === i ? 6 : 3.5}
              fill="var(--accent-text)"
              stroke="var(--panel)"
              strokeWidth="1.5"
            />
            <rect
              x={x - 14}
              y={y - 14}
              width="28"
              height="28"
              fill="transparent"
            />
            <text
              className={
                i % 2 === 0 ? "chart-date" : "chart-date secondary-date"
              }
              x={x}
              y="198"
              textAnchor={i === 6 ? "end" : "middle"}
            >
              {shortDate(dateOffset(Math.round(((i - 6) * (+period - 1)) / 6)))}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
function Overview({ data }: { data: StudioData }) {
  const [period, setPeriod] = useState<keyof typeof series>("30");
  const confirmed = data.sessions.filter((s) => s.status === "Confirmado");
  const approved = data.quotes.filter((q) => q.status === "Aprovado");
  const pending = data.quotes.filter((q) => q.status === "Pendente");
  const conversion = data.quotes.length
    ? Math.round((approved.length / data.quotes.length) * 100)
    : 0;
  const metrics = [
    {
      label: "Total de leads",
      value: data.clients.length,
      icon: UsersRound,
      color: "lime",
      hint: "Contatos no CRM",
      to: "/crm",
    },
    {
      label: "Orçamentos pendentes",
      value: pending.length,
      icon: ClipboardList,
      color: "amber",
      hint: "Aguardando aprovação",
      to: "/orcamentos",
    },
    {
      label: "Sessões confirmadas",
      value: confirmed.length,
      icon: CalendarDays,
      color: "blue",
      hint: "Sessões na agenda",
      to: "/agenda",
    },
    {
      label: "Receita prevista",
      value: money(approved.reduce((sum, q) => sum + q.value * 100, 0)),
      icon: CircleDollarSign,
      color: "violet",
      hint: "Orçamentos aprovados",
      to: "/orcamentos",
    },
  ];
  const upcoming = confirmed
    .filter((s) => s.date >= dateOffset())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3);
  return (
    <Page
      title={"Olá, " + data.settings.artist.split(" ")[0] + " 👋"}
      description="Veja o que está acontecendo no seu estúdio hoje."
      actions={
        <>
          <Button asChild>
            <Link to="/agenda">
              <CalendarDays size={16} /> Ver agenda
            </Link>
          </Button>
          <Button variant="default" asChild>
            <Link to="/crm?novo=1">
              <Plus size={17} /> Novo lead
            </Link>
          </Button>
        </>
      }
    >
      <div className="dashboard-label">
        <span>Visão geral</span>
        <span>
          <CalendarDays size={14} />
          {new Intl.DateTimeFormat("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </span>
      </div>
      <div className="metrics">
        {metrics.map(({ label, value, icon: Icon, color, hint, to }) => (
          <Link key={label} to={to} className="metric card">
            <div className="metric-head">
              <span className={"metric-icon " + color}>
                <Icon size={18} />
              </span>
              <ArrowUpRight size={15} />
            </div>
            <div className="metric-label">{label}</div>
            <strong>{value}</strong>
            <small>{hint}</small>
          </Link>
        ))}
      </div>
      <div className="dashboard-mid">
        <Card className="pad performance">
          <div className="section-head">
            <div>
              <h2>Desempenho do estúdio</h2>
              <p>Evolução de leads e orçamentos · série demonstrativa</p>
            </div>
            <select
              aria-label="Período do gráfico"
              value={period}
              onChange={(e) => setPeriod(e.target.value as keyof typeof series)}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>
          <Performance period={period} />
        </Card>
        <Card className="pad operation">
          <div className="section-head">
            <div>
              <h2>Indicadores</h2>
              <p>Acompanhe a conversão</p>
            </div>
            <Activity size={17} />
          </div>
          <Link to="/orcamentos" className="indicator">
            <span className="metric-icon violet">
              <Target size={17} />
            </span>
            <div>
              <small>Taxa de conversão</small>
              <strong>{conversion}%</strong>
            </div>
            <ArrowDownRight size={15} />
          </Link>
          <div
            className="progress"
            role="progressbar"
            aria-label="Taxa de conversão"
            aria-valuenow={conversion}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: conversion + "%" }} />
          </div>
        </Card>
      </div>
      <div className="grid-two dashboard-bottom">
        <Card className="pad">
          <div className="section-head">
            <div>
              <h2>Próximas sessões</h2>
              <p>Compromissos confirmados na agenda</p>
            </div>
            <Button asChild variant="ghost">
              <Link to="/agenda">
                Ver agenda <ChevronRight size={15} />
              </Link>
            </Button>
          </div>
          {upcoming.length ? (
            upcoming.map((s, i) => {
              const c = data.clients.find((c) => c.id === s.clientId);
              return (
                <div className="list-row" key={s.id}>
                  <span className={"avatar " + colors[i]}>
                    {initials(c?.name || s.title)}
                  </span>
                  <div>
                    <strong>{c?.name || s.title}</strong>
                    <small>{s.title}</small>
                  </div>
                  <small className="inline">
                    <Clock3 size={13} />
                    {shortDate(s.date)} · {s.time}
                  </small>
                </div>
              );
            })
          ) : (
            <Empty>Nenhuma sessão confirmada.</Empty>
          )}
        </Card>
      </div>
    </Page>
  );
}
export default function Dashboard() {
  return <Data>{(data) => <Overview data={data} />}</Data>;
}
