import { Modal } from "../components/Modal";
import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { z } from "zod";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { clientOptions } from "../features/studioFields";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { date, required } from "../schemas/forms";
import { id, studio } from "../services/studio";
import type { Feedback, StudioData } from "../types/studio";
const statuses = ["Pendente", "Recebido", "Concluído"] as const;
const ratings = ["0", "1", "2", "3", "4", "5"] as const;
const schema = z
  .object({
    clientId: required,
    rating: z.enum(ratings),
    comment: z.string(),
    followUp: date,
    status: z.enum(statuses),
  })
  .refine((v) => v.status !== "Recebido" || v.rating !== "0", {
    path: ["rating"],
    message: "Informe a nota da resposta recebida.",
  });
function FeedbackView({ data }: { data: StudioData }) {
  const [selection, setSelection] = useState("");
  const [survey, setSurvey] = useState<Feedback | null>(null);
  const action = useAction();
  const selected = data.feedback.find((f) => f.id === selection);
  const ratingsReceived = data.feedback.filter((f) => f.rating > 0);
  const average = ratingsReceived.length
    ? (
        ratingsReceived.reduce((n, f) => n + f.rating, 0) /
        ratingsReceived.length
      ).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : "—";
  const close = () => setSelection("");
  return (
    <Page
      title="Pós-atendimento"
      description="Acompanhe avaliações, pesquisas de satisfação e lembretes de retorno."
      actions={
        <Button variant="default" onClick={() => setSelection("new")}>
          <Plus size={16} /> Nova pesquisa
        </Button>
      }
    >
      <div className="grid-two">
        <Card className="pad">
          <div className="section-head">
            <h2>Satisfação média</h2>
            <span className="metric-icon amber">
              <Star size={17} />
            </span>
          </div>
          <strong>{average} / 5</strong>
          <p className="muted">
            {ratingsReceived.length} avaliações registradas
          </p>
        </Card>
        <Card className="pad">
          <div className="section-head">
            <h2>Acompanhamentos ativos</h2>
          </div>
          <strong>
            {data.feedback.filter((f) => f.status !== "Concluído").length}
          </strong>
          <p className="muted">Retornos pendentes ou com resposta recebida</p>
        </Card>
      </div>
      <Card className="table-wrap dashboard-bottom">
        {data.feedback.length ? (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Avaliação</th>
                <th>Retorno</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.feedback.map((f) => (
                <tr key={f.id}>
                  <td>
                    {data.clients.find((c) => c.id === f.clientId)?.name}
                    <br />
                    {f.comment && <small>{f.comment}</small>}
                  </td>
                  <td>{f.rating ? f.rating + " / 5" : "Aguardando"}</td>
                  <td>
                    {shortDate(f.followUp)}{" "}
                    {f.status !== "Concluído" && f.followUp <= dateOffset() && (
                      <Badge tone="amber">Retorno devido</Badge>
                    )}
                  </td>
                  <td>
                    <Badge tone={f.status === "Recebido" ? "green" : ""}>
                      {f.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="inline">
                      <Button onClick={() => setSelection(f.id)}>
                        Editar registro
                      </Button>
                      {f.status !== "Concluído" && (
                        <Button onClick={() => setSurvey(f)}>
                          Ver pesquisa
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Nenhuma pesquisa registrada.</Empty>
        )}
      </Card>
      {selection && (
        <Modal
          title={
            selected ? "Editar acompanhamento" : "Nova pesquisa de satisfação"
          }
          close={close}
        >
          <Editor
            fields={[
              {
                name: "clientId",
                label: "Cliente",
                options: clientOptions(data.clients),
                wide: true,
              },
              {
                name: "rating",
                label: "Nota",
                options: [
                  { value: "0", label: "Aguardando resposta" },
                  ...options(ratings.slice(1)),
                ],
              },
              { name: "followUp", label: "Data do lembrete", type: "date" },
              {
                name: "comment",
                label: "Comentário",
                type: "textarea",
                wide: true,
              },
              {
                name: "status",
                label: "Status",
                options: options(statuses),
                wide: true,
              },
            ]}
            values={
              selected
                ? { ...selected, rating: String(selected.rating) }
                : {
                    clientId: "",
                    rating: "0",
                    followUp: dateOffset(3),
                    comment: "",
                    status: "Pendente",
                  }
            }
            schema={schema}
            close={close}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.save("feedback", {
                    id: selected?.id || id(),
                    clientId: v.clientId,
                    rating: Number(v.rating),
                    comment: v.comment,
                    followUp: v.followUp,
                    status: v.status as Feedback["status"],
                  }),
                message: "Acompanhamento salvo.",
              })
            }
          />
        </Modal>
      )}
      {survey && (
        <Modal title="Pesquisa de satisfação" close={() => setSurvey(null)}>
          <div className="detail-grid">
            <p>
              Olá,{" "}
              {
                data.clients
                  .find((c) => c.id === survey.clientId)
                  ?.name.split(" ")[0]
              }
              ! Como foi sua experiência no estúdio? Avalie de 1 a 5 e conte o
              que podemos melhorar.
            </p>
            <p className="muted">
              Lembrete local de retorno em {shortDate(survey.followUp)}.
            </p>
            <Button
              variant="default"
              onClick={() => {
                setSelection(survey.id);
                setSurvey(null);
              }}
            >
              Registrar resposta
            </Button>
          </div>
        </Modal>
      )}
    </Page>
  );
}
export default function FeedbackPage() {
  return <Data>{(data) => <FeedbackView data={data} />}</Data>;
}
