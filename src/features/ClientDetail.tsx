import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/Page";
import { Tabs } from "../components/Tabs";
import { Button } from "../components/ui/button";
import { benefitStatus } from "../domain/loyalty";
import { dateOffset, initials, money, shortDate } from "../mocks/studio";
import type { Benefit, Client, StudioData } from "../types/studio";

const tabs = ["Dados", "Histórico", "Financeiro", "Fidelidade"] as const;
type Tab = (typeof tabs)[number];
const groups = ["Disponível", "Pendente", "Usado", "Vencido"] as const;

export function ClientDetail({
  data,
  client,
  edit,
  pay,
}: {
  data: StudioData;
  client: Client;
  edit: () => void;
  pay?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Dados");
  const today = dateOffset();
  const name = (id?: string) => data.clients.find((c) => c.id === id)?.name;
  const payments = data.payments.filter((p) => p.clientId === client.id);
  const referred = data.clients.filter((c) => c.referredBy === client.id);
  const benefits = data.benefits.filter((b) => b.clientId === client.id);
  const status = (b: Benefit) => benefitStatus(b, today);
  const timeline = [
    ...client.history.map((text) => ({
      at: /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "",
      text,
    })),
    ...data.followUps
      .filter((f) => f.clientId === client.id)
      .flatMap((f) =>
        f.history.map((h) => ({
          at: h.at,
          text: `${h.at} · Follow-up ${f.reason}: ${h.stage}${h.note ? " — " + h.note : ""}`,
        })),
      ),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="detail-grid">
      <div className="inline">
        <span className="avatar lime">{initials(client.name)}</span>
        <Badge tone="green">{client.stage}</Badge>
        {client.tags && <Badge>{client.tags}</Badge>}
      </div>
      <Tabs
        label="Seções do cliente"
        tabs={tabs}
        value={tab}
        onChange={setTab}
      />
      {tab === "Dados" && (
        <>
          <p className="profile-meta">
            {client.phone}
            {client.email && " · " + client.email}
          </p>
          {client.birthday && <p>Aniversário: {shortDate(client.birthday)}</p>}
          {client.referredBy && <p>Indicado por {name(client.referredBy)}</p>}
          <h3>Oportunidade</h3>
          <p>{client.project}</p>
          {client.references.length > 0 && (
            <>
              <h3>Referências</h3>
              <div className="reference-grid">
                {client.references.map((ref, i) => (
                  <img
                    className="reference"
                    src={ref}
                    alt={"Referência " + (i + 1)}
                    key={i}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
      {tab === "Histórico" && (
        <ul className="timeline">
          {timeline.map((h, i) => (
            <li key={i}>{h.text}</li>
          ))}
        </ul>
      )}
      {tab === "Financeiro" && (
        <>
          <p>
            Total pago:{" "}
            <strong>
              {money(payments.reduce((s, p) => s + p.netCents, 0))}
            </strong>
          </p>
          {payments.length ? (
            <ul className="plain-list">
              {payments.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>
                      {p.kind} · {shortDate(p.date)}
                    </strong>
                    <small>
                      {p.method}
                      {p.installments.length > 1 &&
                        ` · ${p.installments.length}x de ${money(p.installments[0].cents)}`}
                    </small>
                    <small>
                      Total {money(p.grossCents)}
                      {p.discountCents > 0 &&
                        ` · desconto ${money(p.discountCents)} (${p.discountReason})`}
                      {p.depositCents > 0 &&
                        ` · sinal ${money(p.depositCents)}`}
                    </small>
                  </div>
                  <strong>{money(p.netCents)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhum pagamento registrado.</p>
          )}
        </>
      )}
      {tab === "Fidelidade" && (
        <>
          <p>
            Indicado por:{" "}
            <strong>{name(client.referredBy) || "ninguém"}</strong>
          </p>
          <h3>Indicou</h3>
          {referred.length ? (
            <ul className="plain-list">
              {referred.map((c) => {
                const b = benefits.find((x) => x.sourceClientId === c.id);
                return (
                  <li key={c.id}>
                    <span>{c.name}</span>
                    {b && <Badge>{status(b)}</Badge>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Ainda não indicou ninguém.</p>
          )}
          {groups.map((g) => {
            const list = benefits.filter((b) => status(b) === g);
            if (!list.length) return null;
            return (
              <div key={g}>
                <h3>{g === "Disponível" ? "Disponíveis" : g + "s"}</h3>
                <ul className="plain-list">
                  {list.map((b) => (
                    <li key={b.id}>
                      <span>
                        {b.type} · {b.label}
                      </span>
                      <Badge>{b.pct}%</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </>
      )}
      <div className="inline wrap">
        <Button onClick={edit}>Editar cliente</Button>
        <Button onClick={pay} disabled={!pay}>
          Registrar pagamento
        </Button>
        <Button asChild>
          <Link to={"/orcamentos?cliente=" + client.id}>Criar orçamento</Link>
        </Button>
      </div>
    </div>
  );
}
