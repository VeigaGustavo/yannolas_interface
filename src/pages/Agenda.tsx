import { Modal } from "../components/Modal";
import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  addDays,
  availableTimes,
  calendarDays,
  dateKey,
  minutes,
  parseDay,
  workingHours,
} from "../features/calendar";
import { clientOptions, sessionStatuses } from "../features/studioFields";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { date, number, required, time } from "../schemas/forms";
import { id, studio } from "../services/studio";
import type { Session, StudioData } from "../types/studio";
const views = ["Mês", "Semana", "Dia"];
const schema = z
  .object({
    title: required,
    clientId: z.string(),
    quoteId: z.string(),
    date,
    time,
    duration: number(15, 540).refine(
      (v) => Number.isInteger(Number(v)),
      "Use minutos inteiros",
    ),
    status: z.enum(sessionStatuses),
  })
  .superRefine((v, ctx) => {
    if (v.status !== "Bloqueado" && !v.clientId)
      ctx.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Selecione um cliente.",
      });
    if (minutes(v.time) + Number(v.duration) > 1440)
      ctx.addIssue({
        code: "custom",
        path: ["duration"],
        message: "A sessão precisa terminar no mesmo dia.",
      });
  });
function SessionForm({
  data,
  session,
  clientId,
  quoteId,
  day,
  time,
  blocked,
  close,
}: {
  data: StudioData;
  session?: Session;
  clientId: string;
  quoteId: string;
  day: string;
  time: string;
  blocked: boolean;
  close: () => void;
}) {
  const action = useAction();
  const quote = data.quotes.find((q) => q.id === quoteId);
  return (
    <Editor
      fields={[
        { name: "title", label: "Título", wide: true },
        {
          name: "clientId",
          label: "Cliente",
          options: clientOptions(data.clients, "Sem cliente"),
        },
        {
          name: "quoteId",
          label: "Orçamento associado",
          options: [
            { value: "", label: "Sem orçamento" },
            ...data.quotes.map((q) => ({
              value: q.id,
              label:
                (data.clients.find((c) => c.id === q.clientId)?.name ||
                  "Cliente") +
                " · " +
                q.description,
            })),
          ],
        },
        { name: "date", label: "Data", type: "date" },
        { name: "time", label: "Horário", type: "time" },
        { name: "duration", label: "Duração (minutos)", type: "number" },
        { name: "status", label: "Status", options: options(sessionStatuses) },
      ]}
      values={
        session
          ? { ...session, duration: String(session.duration) }
          : {
              title: blocked ? "Horário bloqueado" : quote?.description || "",
              clientId: quote?.clientId || clientId,
              quoteId: quote?.id || "",
              date: day,
              time: time || workingHours(data.settings).opensAt,
              duration: time ? "60" : "90",
              status: blocked ? "Bloqueado" : "Confirmado",
            }
      }
      schema={schema}
      close={close}
      save={(v) =>
        action.mutateAsync({
          run: () =>
            studio.save("sessions", {
              id: session?.id || id(),
              title: v.title,
              clientId: v.status === "Bloqueado" ? "" : v.clientId,
              quoteId: v.status === "Bloqueado" ? "" : v.quoteId,
              date: v.date,
              time: v.time,
              duration: Number(v.duration),
              status: v.status as Session["status"],
            }),
          message: "Agenda atualizada.",
        })
      }
    />
  );
}
function AgendaView({ data }: { data: StudioData }) {
  const [params, setParams] = useSearchParams();
  const [day, setDay] = useState(() =>
    parseDay(
      data.sessions.find((s) => s.id === params.get("sessao"))?.date ||
        dateOffset(),
    ),
  );
  const [view, setView] = useState("Mês");
  const [time, setTime] = useState("");
  const [editing, setEditing] = useState(false);
  const action = useAction();
  const key = dateKey(day);
  const session = data.sessions.find((s) => s.id === params.get("sessao"));
  const clientId = params.get("cliente") || "";
  const quoteId = params.get("orcamento") || "";
  const blocked = params.has("bloqueio");
  const creating = params.has("novo") || blocked || !!clientId || !!quoteId;
  const entries = (date: string) =>
    data.sessions
      .filter((s) => s.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  const close = () => {
    setEditing(false);
    setParams({});
  };
  const open = (id: string) => {
    setEditing(false);
    setParams({ sessao: id });
  };
  const create = (time = "") => {
    setTime(time);
    setParams({ novo: "1" });
  };
  const move = (dir: number) =>
    setDay(
      view === "Mês"
        ? new Date(day.getFullYear(), day.getMonth() + dir, 1, 12)
        : addDays(day, dir * (view === "Semana" ? 7 : 1)),
    );
  const days = calendarDays(day, view);
  const slots = availableTimes(key, data.sessions, data.settings);
  const { opensAt, closesAt } = workingHours(data.settings);
  return (
    <Page
      title="Agenda"
      description="Organize sessões, horários disponíveis e bloqueios do estúdio."
      actions={
        <>
          <Button
            onClick={() => {
              setTime("");
              setParams({ bloqueio: "1" });
            }}
          >
            <Lock size={15} /> Bloquear horário
          </Button>
          <Button variant="default" onClick={() => create()}>
            <Plus size={17} /> Nova sessão
          </Button>
        </>
      }
    >
      <Card className="pad">
        <div className="section-head calendar-head">
          <div className="inline">
            <Button
              aria-label="Período anterior"
              className="icon-button"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              aria-label="Próximo período"
              className="icon-button"
              onClick={() => move(1)}
            >
              <ChevronRight size={17} />
            </Button>
            <Button onClick={() => setDay(parseDay(dateOffset()))}>Hoje</Button>
            <h2 className="calendar-title">
              {day.toLocaleDateString(
                "pt-BR",
                view === "Dia"
                  ? { dateStyle: "long" }
                  : { month: "long", year: "numeric" },
              )}
            </h2>
          </div>
          <div className="inline">
            {views.map((v) => (
              <Button
                key={v}
                variant={view === v ? "default" : "outline"}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        <div className={"calendar-scroll " + (view === "Dia" ? "daily" : "")}>
          <div
            className="calendar-grid"
            style={{
              gridTemplateColumns:
                "repeat(" + (view === "Dia" ? 1 : 7) + ", minmax(0, 1fr))",
            }}
          >
            {view !== "Dia" &&
              ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="weekday">
                  {d}
                </div>
              ))}
            {days.map((d) => {
              const current = dateKey(d);
              return (
                <div
                  key={current}
                  className={
                    "calendar-cell " +
                    (current === key ? "selected " : "") +
                    (d.getMonth() !== day.getMonth() && view === "Mês"
                      ? "outside"
                      : "")
                  }
                >
                  <button
                    className="day-number"
                    aria-label={d.toLocaleDateString("pt-BR", {
                      dateStyle: "long",
                    })}
                    aria-pressed={current === key}
                    onClick={() => setDay(d)}
                  >
                    {d.getDate()}
                  </button>
                  {entries(current).map((s) => (
                    <button
                      key={s.id}
                      className={
                        "calendar-event " +
                        (s.status === "Cancelado"
                          ? "cancelled"
                          : s.status === "Bloqueado"
                            ? "blocked"
                            : "")
                      }
                      title={s.time + " · " + s.title}
                      onClick={() => open(s.id)}
                    >
                      {s.time} · {s.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      <div className="grid-two dashboard-bottom">
        <Card className="pad">
          <div className="section-head">
            <h2 className="inline">
              <CalendarDays size={17} /> Sessões de {shortDate(key)}
            </h2>
          </div>
          {entries(key).length ? (
            entries(key).map((s) => (
              <div className="list-row" key={s.id}>
                <div>
                  <strong>
                    {s.time} · {s.title}
                  </strong>
                  <small>
                    {data.clients.find((c) => c.id === s.clientId)?.name || ""}{" "}
                    · {s.duration} min
                  </small>
                </div>
                <Badge tone={s.status === "Confirmado" ? "green" : ""}>
                  {s.status}
                </Badge>
                <Button onClick={() => open(s.id)}>Detalhes</Button>
              </div>
            ))
          ) : (
            <Empty>Nenhuma sessão neste dia.</Empty>
          )}
        </Card>
        <Card className="pad">
          <div className="section-head">
            <div>
              <h2>Horários disponíveis</h2>
              <p>
                Faixas de 60 min entre {opensAt} e {closesAt} para{" "}
                {shortDate(key)}.
              </p>
            </div>
          </div>
          <div className="inline">
            {slots.length ? (
              slots.map((t) => (
                <Button key={t} onClick={() => create(t)}>
                  {t}
                </Button>
              ))
            ) : (
              <p className="muted">Nenhum horário livre.</p>
            )}
          </div>
        </Card>
      </div>
      {(creating || (session && editing)) && (
        <Modal
          title={
            blocked
              ? "Bloquear horário"
              : editing
                ? "Editar ou reagendar sessão"
                : "Nova sessão"
          }
          close={close}
        >
          <SessionForm
            data={data}
            session={editing ? session : undefined}
            clientId={clientId}
            quoteId={quoteId}
            day={key}
            time={time}
            blocked={blocked}
            close={close}
          />
        </Modal>
      )}
      {session && !editing && !creating && (
        <Modal title={session.title} close={close}>
          <div className="detail-grid">
            <div className="inline">
              <Badge tone="green">{session.status}</Badge>
              <strong>
                {shortDate(session.date)} · {session.time} · {session.duration}{" "}
                min
              </strong>
            </div>
            {session.clientId && (
              <Button asChild>
                <Link to={"/crm?cliente=" + session.clientId}>
                  {data.clients.find((c) => c.id === session.clientId)?.name ||
                    "Perfil do cliente"}
                </Link>
              </Button>
            )}
            {session.quoteId && (
              <p>
                Orçamento:{" "}
                {data.quotes.find((q) => q.id === session.quoteId)?.description}
              </p>
            )}
            <div className="inline">
              <Button onClick={() => setEditing(true)}>
                Editar / reagendar
              </Button>
              {session.status !== "Cancelado" && (
                <Button
                  variant="danger"
                  disabled={action.isPending}
                  onClick={async () => {
                    if (!window.confirm("Cancelar este compromisso?")) return;
                    try {
                      await action.mutateAsync({
                        run: () =>
                          studio.save("sessions", {
                            ...session,
                            status: "Cancelado",
                          }),
                        message: "Compromisso cancelado.",
                      });
                      close();
                    } catch {
                      /* o mutation informa o erro */
                    }
                  }}
                >
                  Cancelar compromisso
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
export default function Agenda() {
  return <Data>{(data) => <AgendaView data={data} />}</Data>;
}
