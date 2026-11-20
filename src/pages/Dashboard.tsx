import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { monthSummary } from "../domain/billing";
import { bucket } from "../domain/followups";
import { lowStock } from "../domain/stock";
import { useTenant } from "../hooks/useStudio";
import { dateOffset, money, shortDate } from "../mocks/studio";
import type { StudioData } from "../types/studio";

const firstName = (full: string) =>
  full.split(" ").find((part) => !/^(dra?|sr|sra)\.?$/i.test(part)) ?? full;

function Block({
  title,
  to,
  link,
  children,
}: {
  title: string;
  to: string;
  link: string;
  children: ReactNode;
}) {
  const id = "bloco-" + to.replace(/\W/g, "");
  return (
    <Card className="pad">
      <section aria-labelledby={id} className="stack">
        <div className="section-head">
          <h2 id={id}>{title}</h2>
          <Button asChild variant="ghost">
            <Link to={to}>
              {link} <ChevronRight size={15} />
            </Link>
          </Button>
        </div>
        {children}
      </section>
    </Card>
  );
}

function Overview({ data }: { data: StudioData }) {
  const tenant = useTenant();
  const today = dateOffset();
  const client = (id: string) => data.clients.find((c) => c.id === id)?.name;
  const agenda = data.sessions
    .filter((s) => s.date === today && s.status !== "Cancelado")
    .sort((a, b) => a.time.localeCompare(b.time));
  const followUps = data.followUps
    .filter((f) => ["Hoje", "Atrasados"].includes(bucket(f, today)))
    .sort((a, b) => a.due.localeCompare(b.due));
  const late = followUps.filter((f) => bucket(f, today) === "Atrasados").length;
  const summary = monthSummary(data, today.slice(0, 7), today);
  const low = lowStock(data);
  return (
    <Page
      title={"Olá, " + firstName(data.settings.artist) + " 👋"}
      description="Agenda, contatos e números do estúdio hoje."
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
      <div className="home-grid">
        <Block title="Hoje na agenda" to="/agenda" link="Agenda">
          {agenda.length ? (
            <ul className="plain-list">
              {agenda.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>
                      {s.time} · {client(s.clientId) ?? s.title}
                    </strong>
                    <small>
                      {s.procedure ?? s.title} · {s.duration} min
                    </small>
                  </div>
                  <Badge tone={s.status === "Confirmado" ? "green" : ""}>
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              Nenhum(a) {tenant.terms.atendimento.toLowerCase()} hoje.
            </Empty>
          )}
        </Block>
        <Block
          title="Follow-ups de hoje e atrasados"
          to="/follow-up"
          link="Follow-up"
        >
          <p>
            <strong>{followUps.length}</strong> para chamar
            {late > 0 && ` · ${late} atrasados`}
          </p>
          {followUps.length ? (
            <ul className="plain-list">
              {followUps.slice(0, 5).map((f) => (
                <li key={f.id}>
                  <div>
                    <strong>{client(f.clientId)}</strong>
                    <small>
                      {f.reason} · {shortDate(f.due)}
                    </small>
                  </div>
                  <Badge tone={f.due < today ? "amber" : ""}>{f.stage}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum contato pendente.</Empty>
          )}
        </Block>
        <Block title="Resumo do mês" to="/faturamento" link="Faturamento">
          <div className="summary-grid compact">
            {[
              ["Entrou", summary.inCents],
              ["A receber", summary.pendingCents],
              ["Lucro", summary.profitCents],
            ].map(([label, cents]) => (
              <div className="summary-card" key={label}>
                <small>{label}</small>
                <strong>{money(cents as number)}</strong>
              </div>
            ))}
          </div>
        </Block>
        <Block title="Estoque baixo" to="/estoque" link="Estoque">
          {low.length ? (
            <ul className="plain-list">
              {low.map((i) => (
                <li key={i.id}>
                  <span>{i.name}</span>
                  <Badge tone="amber">
                    {i.qty} {i.unit} · mín. {i.min}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Estoque em dia.</Empty>
          )}
        </Block>
      </div>
    </Page>
  );
}
export default function Dashboard() {
  return <Data>{(data) => <Overview data={data} />}</Data>;
}
