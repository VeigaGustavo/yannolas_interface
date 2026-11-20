import { useId, useState, type FormEvent } from "react";
import { History, MessageCircle, Plus } from "lucide-react";
import { z } from "zod";
import { Modal } from "../components/Modal";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor } from "../components/Editor";
import { Tabs } from "../components/Tabs";
import { Button } from "../components/ui/button";
import { bucket, isOpen, waLink } from "../domain/followups";
import { clientOptions } from "../features/studioFields";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { date, required } from "../schemas/forms";
import { studio } from "../services/studio";
import type { FollowUp, FollowUpStage, StudioData } from "../types/studio";

const tabs = ["Hoje", "Atrasados", "Próximos", "Todos"] as const;
type Tab = (typeof tabs)[number];
const stages: FollowUpStage[] = [
  "A fazer",
  "Contatado",
  "Respondeu",
  "Convertido",
  "Perdido",
];
const newSchema = z.object({ clientId: required, due: date, note: z.string() });

function UpdateForm({
  data,
  followUp,
  stage,
  close,
}: {
  data: StudioData;
  followUp: FollowUp;
  stage: FollowUpStage;
  close: () => void;
}) {
  const prefix = useId();
  const action = useAction();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const survey = stage === "Respondeu" && followUp.reason === "Pós-atendimento";
  const links = [
    ...data.quotes
      .filter((q) => q.clientId === followUp.clientId)
      .map((q) => ({ value: q.id, label: "Orçamento · " + q.description })),
    ...data.sessions
      .filter((s) => s.clientId === followUp.clientId)
      .map((s) => ({
        value: s.id,
        label: `Agenda · ${shortDate(s.date)} · ${s.title}`,
      })),
  ];
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await action.mutateAsync({
        run: () =>
          studio.advanceFollowUp(followUp.id, stage, note.trim(), {
            ...(survey ? { rating: Number(rating), comment } : {}),
            ...(stage === "Convertido" && link ? { convertedTo: link } : {}),
          }),
        message: "Follow-up atualizado.",
      });
      close();
    } catch {
      setBusy(false);
    }
  };
  return (
    <form className="payment-form" noValidate onSubmit={submit}>
      <div className="form-grid">
        {survey && (
          <>
            <div className="field">
              <label htmlFor={prefix + "rating"}>Nota</label>
              <select
                id={prefix + "rating"}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="field wide">
              <label htmlFor={prefix + "comment"}>Comentário</label>
              <textarea
                id={prefix + "comment"}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </>
        )}
        {stage === "Convertido" && (
          <div className="field wide">
            <label htmlFor={prefix + "link"}>Gerou</label>
            <select
              id={prefix + "link"}
              value={link}
              onChange={(e) => setLink(e.target.value)}
            >
              <option value="">Sem vínculo</option>
              {links.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field wide">
          <label htmlFor={prefix + "note"}>Nota</label>
          <textarea
            id={prefix + "note"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <div className="form-footer">
        <Button type="button" onClick={close}>
          Cancelar
        </Button>
        <Button variant="default" type="submit" disabled={busy}>
          Salvar
        </Button>
      </div>
    </form>
  );
}

function FollowUpView({ data }: { data: StudioData }) {
  const today = dateOffset();
  const action = useAction();
  const [tab, setTab] = useState<Tab>("Hoje");
  const [stage, setStage] = useState("");
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<{
    followUp: FollowUp;
    stage: FollowUpStage;
  } | null>(null);
  const [history, setHistory] = useState<FollowUp | null>(null);
  const client = (cid: string) => data.clients.find((c) => c.id === cid);
  const counts = Object.fromEntries(
    tabs.map((t) => [
      t,
      t === "Todos"
        ? data.followUps.length
        : data.followUps.filter((f) => bucket(f, today) === t).length,
    ]),
  );
  const list = data.followUps
    .filter(
      (f) =>
        (tab === "Todos" || bucket(f, today) === tab) &&
        (!stage || f.stage === stage),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  const advance = (f: FollowUp, to: FollowUpStage, note: string) =>
    action.mutate({
      run: () => studio.advanceFollowUp(f.id, to, note),
      message: "Follow-up atualizado.",
    });
  return (
    <Page
      title="Follow-up"
      description="Quem chamar hoje, o que está atrasado e o histórico de cada contato."
      actions={
        <Button variant="default" onClick={() => setCreating(true)}>
          <Plus size={17} /> Novo follow-up
        </Button>
      }
    >
      <Tabs
        label="Período"
        tabs={tabs}
        value={tab}
        onChange={(t) => setTab(t)}
      />
      <div className="toolbar">
        <select
          aria-label="Filtrar por etapa"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <small className="muted">
          Hoje {counts.Hoje} · Atrasados {counts.Atrasados}
        </small>
      </div>
      {list.length ? (
        <div className="followup-list">
          {list.map((f) => {
            const c = client(f.clientId);
            const name = c?.name ?? "Cliente";
            const open = isOpen(f);
            return (
              <article
                key={f.id}
                className="followup-card"
                aria-label={`${name} · ${f.reason}`}
              >
                <div className="followup-head">
                  <div>
                    <strong>{name}</strong>
                    <small>
                      {f.reason} · {shortDate(f.due)}
                    </small>
                  </div>
                  <Badge
                    tone={
                      f.stage === "Convertido"
                        ? "green"
                        : f.stage === "Perdido"
                          ? ""
                          : "amber"
                    }
                  >
                    {f.stage}
                  </Badge>
                </div>
                {f.note && <p className="muted">{f.note}</p>}
                {f.attempts > 0 && open && (
                  <small>
                    Tentativa {f.attempts} de{" "}
                    {data.settings.followUp.maxAttempts}
                  </small>
                )}
                {f.rating !== undefined && (
                  <small>
                    Nota {f.rating}/5{f.comment && ` · ${f.comment}`}
                  </small>
                )}
                <div className="inline wrap">
                  {open && c && (
                    <Button asChild variant="default">
                      <a
                        href={waLink(
                          c.phone,
                          data.settings.templates[f.reason],
                          c.name,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          f.stage !== "Contatado" &&
                          advance(
                            f,
                            "Contatado",
                            "Mensagem enviada pelo WhatsApp",
                          )
                        }
                      >
                        <MessageCircle size={15} /> Chamar no WhatsApp
                      </a>
                    </Button>
                  )}
                  {open && (
                    <>
                      <Button
                        onClick={() =>
                          setUpdating({ followUp: f, stage: "Respondeu" })
                        }
                      >
                        Respondeu
                      </Button>
                      <Button
                        disabled={action.isPending}
                        onClick={() => advance(f, "Sem resposta", "")}
                      >
                        Sem resposta
                      </Button>
                      <Button
                        onClick={() =>
                          setUpdating({ followUp: f, stage: "Convertido" })
                        }
                      >
                        Convertido
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setUpdating({ followUp: f, stage: "Perdido" })
                        }
                      >
                        Perdido
                      </Button>
                    </>
                  )}
                  {f.reason === "Aniversário" && (
                    <Button
                      onClick={() =>
                        action.mutate({
                          run: () => studio.birthdayCoupon(f.id),
                          message: "Cupom de aniversário disponível.",
                        })
                      }
                    >
                      Gerar cupom
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setHistory(f)}>
                    <History size={15} /> Histórico
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty>Nenhum follow-up aqui.</Empty>
      )}
      {creating && (
        <Modal title="Novo follow-up" close={() => setCreating(false)}>
          <Editor
            fields={[
              {
                name: "clientId",
                label: "Cliente",
                options: clientOptions(data.clients),
                wide: true,
              },
              { name: "due", label: "Data", type: "date" },
              { name: "note", label: "Nota", type: "textarea", wide: true },
            ]}
            values={{ clientId: "", due: today, note: "" }}
            schema={newSchema}
            close={() => setCreating(false)}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.addFollowUp({
                    clientId: v.clientId,
                    due: v.due,
                    note: v.note,
                  }),
                message: "Follow-up criado.",
              })
            }
          />
        </Modal>
      )}
      {updating && (
        <Modal
          title={"Marcar como " + updating.stage.toLowerCase()}
          close={() => setUpdating(null)}
        >
          <UpdateForm
            data={data}
            followUp={updating.followUp}
            stage={updating.stage}
            close={() => setUpdating(null)}
          />
        </Modal>
      )}
      {history && (
        <Modal
          title={"Histórico · " + (client(history.clientId)?.name ?? "")}
          close={() => setHistory(null)}
        >
          <ul className="timeline" aria-label="Histórico do follow-up">
            {(
              data.followUps.find((f) => f.id === history.id) ?? history
            ).history.map((h, i) => (
              <li key={i}>
                {shortDate(h.at)} · {h.stage}
                {h.note && ` — ${h.note}`}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </Page>
  );
}
export default function FollowUpPage() {
  return <Data>{(data) => <FollowUpView data={data} />}</Data>;
}
