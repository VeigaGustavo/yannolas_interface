import { Modal } from "../components/Modal";
import { useState } from "react";
import { Columns3, List, Plus, Rows3, UserRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { ClientDetail } from "../features/ClientDetail";
import { clientOptions } from "../features/studioFields";
import { clientSchema } from "../schemas/forms";
import { id, studio } from "../services/studio";
import {
  stages,
  type Client,
  type Stage,
  type StudioData,
} from "../types/studio";
function CRMView({ data }: { data: StudioData }) {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(() =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 899.98px)").matches
      ? "lista"
      : "kanban",
  );
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [editing, setEditing] = useState(false);
  const action = useAction();
  const client = data.clients.find((c) => c.id === params.get("cliente"));
  const isNew = params.has("novo");
  const clients = data.clients.filter(
    (c) =>
      (c.name + " " + c.phone + " " + c.project)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!tag ||
        c.tags
          .split(",")
          .map((t) => t.trim())
          .includes(tag)),
  );
  const tags = [
    ...new Set(
      data.clients
        .flatMap((c) => c.tags.split(",").map((t) => t.trim()))
        .filter(Boolean),
    ),
  ].sort();
  const open = (c: Client) => {
    setEditing(false);
    setParams({ cliente: c.id });
  };
  const close = () => {
    setEditing(false);
    setParams({});
  };
  const move = (clientId: string, stage: Stage) =>
    action.mutate({
      run: () => studio.moveClient(clientId, stage),
      message: "Etapa atualizada.",
    });
  return (
    <Page
      title="CRM"
      description="Acompanhe clientes e oportunidades do primeiro contato à sessão."
      actions={
        <Button variant="default" onClick={() => setParams({ novo: "1" })}>
          <Plus size={17} /> Novo lead
        </Button>
      }
    >
      <div className="toolbar module-toolbar">
        <input
          aria-label="Buscar clientes"
          placeholder="Buscar clientes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar por etiqueta"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">Todas as etiquetas</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Button
          className="desktop-only"
          aria-pressed={view === "kanban"}
          variant={view === "kanban" ? "default" : "outline"}
          onClick={() => setView("kanban")}
        >
          <Columns3 size={16} /> Kanban
        </Button>
        <Button
          aria-pressed={view === "lista"}
          variant={view === "lista" ? "default" : "outline"}
          onClick={() => setView("lista")}
        >
          <Rows3 size={16} /> Lista
        </Button>
        <Button
          className="desktop-only"
          aria-pressed={view === "table"}
          variant={view === "table" ? "default" : "outline"}
          onClick={() => setView("table")}
        >
          <List size={16} /> Tabela
        </Button>
      </div>
      {!clients.length ? (
        <Empty>Nenhum cliente encontrado.</Empty>
      ) : view === "lista" ? (
        <ul className="card-list">
          {clients.map((c) => {
            const next = data.sessions
              .filter(
                (s) =>
                  s.clientId === c.id &&
                  s.date >= dateOffset() &&
                  s.status !== "Cancelado" &&
                  s.status !== "Concluído",
              )
              .sort((a, b) =>
                (a.date + a.time).localeCompare(b.date + b.time),
              )[0];
            return (
              <li key={c.id} className="card-row">
                <Button variant="ghost" onClick={() => open(c)}>
                  <UserRound size={14} />
                  {c.name}
                </Button>
                <small>
                  {next
                    ? `Próximo: ${shortDate(next.date)} · ${next.time}`
                    : c.project}
                </small>
                <select
                  aria-label={"Etapa de " + c.name}
                  value={c.stage}
                  disabled={action.isPending}
                  onChange={(e) => move(c.id, e.target.value as Stage)}
                >
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      ) : view === "kanban" ? (
        <div className="board">
          {stages.map((stage) => (
            <section
              key={stage}
              className="board-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const clientId = e.dataTransfer.getData("text/plain");
                if (data.clients.some((c) => c.id === clientId))
                  move(clientId, stage);
              }}
            >
              <h2>
                {stage}
                <Badge>{clients.filter((c) => c.stage === stage).length}</Badge>
              </h2>
              {clients
                .filter((c) => c.stage === stage)
                .map((c) => (
                  <Card
                    key={c.id}
                    className="lead-card"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", c.id)
                    }
                  >
                    <Button variant="ghost" onClick={() => open(c)}>
                      <UserRound size={14} />
                      {c.name}
                    </Button>
                    <p>{c.project}</p>
                    {c.tags && <Badge>{c.tags}</Badge>}
                    <select
                      aria-label={"Etapa de " + c.name}
                      value={c.stage}
                      disabled={action.isPending}
                      onChange={(e) => move(c.id, e.target.value as Stage)}
                    >
                      {stages.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Card>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <Card className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Projeto</th>
                <th>Etapa</th>
                <th>Etiquetas</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Button variant="ghost" onClick={() => open(c)}>
                      {c.name}
                    </Button>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.project}</td>
                  <td>
                    <select
                      aria-label={"Etapa de " + c.name}
                      value={c.stage}
                      disabled={action.isPending}
                      onChange={(e) => move(c.id, e.target.value as Stage)}
                    >
                      {stages.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{c.tags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {(isNew || (client && editing)) && (
        <Modal title={isNew ? "Novo lead" : "Editar cliente"} close={close}>
          <Editor
            fields={[
              { name: "name", label: "Nome" },
              { name: "phone", label: "Telefone", type: "tel" },
              { name: "email", label: "E-mail", type: "email" },
              { name: "stage", label: "Etapa", options: options(stages) },
              {
                name: "tags",
                label: "Etiquetas (separadas por vírgula)",
                wide: true,
              },
              { name: "birthday", label: "Aniversário", type: "date" },
              ...(isNew
                ? [
                    {
                      name: "referredBy",
                      label: "Indicado por",
                      options: clientOptions(data.clients, "Ninguém"),
                    },
                  ]
                : []),
              {
                name: "project",
                label: "Oportunidade / projeto",
                type: "textarea",
                wide: true,
              },
            ]}
            values={
              client
                ? {
                    name: client.name,
                    phone: client.phone,
                    email: client.email,
                    stage: client.stage,
                    tags: client.tags,
                    project: client.project,
                    birthday: client.birthday ?? "",
                    referredBy: client.referredBy ?? "",
                  }
                : {
                    name: "",
                    phone: "",
                    email: "",
                    stage: stages[0],
                    tags: "",
                    project: "",
                    birthday: "",
                    referredBy: "",
                  }
            }
            schema={clientSchema.extend({ stage: clientSchema.shape.name })}
            close={close}
            save={(v) =>
              action.mutateAsync({
                run: () => {
                  const saved = {
                    id: client?.id || id(),
                    created: client?.created || dateOffset(),
                    references: client?.references || [],
                    history: [
                      dateOffset() +
                        " · " +
                        (client ? "Cadastro atualizado" : "Lead criado"),
                      ...(client?.history || []),
                    ],
                    name: v.name,
                    phone: v.phone,
                    email: v.email,
                    stage: v.stage as Stage,
                    tags: v.tags,
                    project: v.project,
                    birthday: v.birthday || undefined,
                    referredBy: client
                      ? client.referredBy
                      : v.referredBy || undefined,
                  };
                  return client
                    ? studio.save("clients", saved)
                    : studio.addClient(saved);
                },
                message: "Cliente salvo.",
              })
            }
          />
        </Modal>
      )}
      {client && !editing && !isNew && (
        <Modal title={client.name} close={close}>
          <ClientDetail
            data={data}
            client={client}
            edit={() => setEditing(true)}
          />
        </Modal>
      )}
    </Page>
  );
}
export default function CRM() {
  return <Data>{(data) => <CRMView data={data} />}</Data>;
}
