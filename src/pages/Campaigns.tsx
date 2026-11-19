import { Modal } from "../components/Modal";
import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { z } from "zod";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { required, date } from "../schemas/forms";
import { id, matchingClients, studio } from "../services/studio";
import type { Campaign, StudioData } from "../types/studio";
const types = ["Promoção", "Aviso", "Flash tattoo"] as const;
const statuses = ["Rascunho", "Agendada"] as const;
const schema = z
  .object({
    name: required,
    type: z.enum(types),
    segment: z.string(),
    message: required,
    date: date.or(z.literal("")),
    status: z.enum(statuses),
  })
  .refine((v) => v.status !== "Agendada" || v.date >= dateOffset(), {
    path: ["date"],
    message: "Selecione hoje ou uma data futura.",
  });
function CampaignsView({ data }: { data: StudioData }) {
  const [selection, setSelection] = useState("");
  const [editing, setEditing] = useState(false);
  const action = useAction();
  const selected = data.campaigns.find((c) => c.id === selection);
  const close = () => {
    setSelection("");
    setEditing(false);
  };
  const tagged = (segment: string) => matchingClients(data, segment);
  const tags = [
    ...new Set(
      data.clients
        .flatMap((c) =>
          c.tags
            .toLowerCase()
            .split(",")
            .map((t) => t.trim()),
        )
        .filter(Boolean),
    ),
  ].sort();
  const recipients = selected ? tagged(selected.segment) : [];
  return (
    <Page
      title="Campanhas"
      description="Planeje promoções, avisos e eventos de flash tattoo."
      actions={
        <Button
          variant="default"
          onClick={() => {
            setSelection("new");
            setEditing(true);
          }}
        >
          <Plus size={16} /> Nova campanha
        </Button>
      }
    >
      <div className="grid-two">
        <Card className="pad">
          <div className="section-head">
            <h2>Campanhas agendadas</h2>
            <Badge tone="amber">
              {data.campaigns.filter((c) => c.status === "Agendada").length}
            </Badge>
          </div>
          <p className="muted">
            Agendamento demonstrativo para planejamento local.
          </p>
        </Card>
        <Card className="pad">
          <div className="section-head">
            <h2>Destinatários simulados</h2>
            <Badge tone="green">
              {data.campaigns.reduce((n, c) => n + c.sent, 0)}
            </Badge>
          </div>
          <p className="muted">Total registrado nas simulações de disparo.</p>
        </Card>
      </div>
      <Card className="pad dashboard-bottom">
        {data.campaigns.length ? (
          data.campaigns.map((c) => (
            <div className="list-row" key={c.id}>
              <span className="metric-icon blue">
                <Send size={16} />
              </span>
              <div>
                <strong>{c.name}</strong>
                <small>
                  {c.type} · {c.segment || "Todos os clientes"}
                  {c.date && " · " + shortDate(c.date)}
                </small>
              </div>
              <Badge tone={c.status === "Simulada" ? "green" : "amber"}>
                {c.status}
              </Badge>
              <Button onClick={() => setSelection(c.id)}>Pré-visualizar</Button>
            </div>
          ))
        ) : (
          <Empty>Nenhuma campanha cadastrada.</Empty>
        )}
      </Card>
      {editing && (
        <Modal
          title={selected ? "Editar campanha" : "Nova campanha"}
          close={close}
        >
          <Editor
            fields={[
              { name: "name", label: "Nome da campanha", wide: true },
              { name: "type", label: "Tipo", options: options(types) },
              {
                name: "segment",
                label: "Segmento",
                options: [
                  { value: "", label: "Todos os clientes" },
                  ...options(tags),
                ],
              },
              {
                name: "message",
                label: "Mensagem · use {nome} para personalizar",
                type: "textarea",
                wide: true,
              },
              { name: "status", label: "Status", options: options(statuses) },
              { name: "date", label: "Data de disparo", type: "date" },
            ]}
            values={
              selected
                ? { ...selected, sent: String(selected.sent) }
                : {
                    name: "",
                    type: types[0],
                    segment: "",
                    message: "Oi, {nome}! ",
                    status: "Rascunho",
                    date: dateOffset(1),
                  }
            }
            schema={schema}
            close={close}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.save("campaigns", {
                    id: selected?.id || id(),
                    name: v.name,
                    type: v.type as Campaign["type"],
                    segment: v.segment,
                    message: v.message,
                    status: v.status as Campaign["status"],
                    date: v.date,
                    sent: 0,
                  }),
                message: "Campanha salva.",
              })
            }
          />
        </Modal>
      )}
      {selected && !editing && (
        <Modal title={selected.name} close={close}>
          <div className="detail-grid">
            <Badge tone="violet">Prévia da mensagem</Badge>
            <div className="bubble humano">
              <p>
                {selected.message.replaceAll(
                  "{nome}",
                  recipients[0]?.name.split(" ")[0] || "Cliente",
                )}
              </p>
            </div>
            <p>
              {recipients.length} clientes elegíveis ·{" "}
              {selected.segment || "Todos os clientes"}
            </p>
            {selected.date && <p>Data planejada: {shortDate(selected.date)}</p>}
            <p className="muted">
              {selected.status === "Simulada"
                ? selected.sent + " destinatários registrados na simulação."
                : "O botão de simulação registra a contagem localmente."}
            </p>
            {selected.status !== "Simulada" && (
              <div className="inline">
                <Button onClick={() => setEditing(true)}>
                  Editar campanha
                </Button>
                <Button
                  variant="default"
                  disabled={action.isPending || !recipients.length}
                  onClick={() =>
                    action.mutate({
                      run: () => studio.dispatch(selected.id),
                      message: "Disparo simulado registrado.",
                    })
                  }
                >
                  Simular disparo
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Page>
  );
}
export default function Campaigns() {
  return <Data>{(data) => <CampaignsView data={data} />}</Data>;
}
