import { Modal } from "../components/Modal";
import { useState } from "react";
import { Columns3, List, Plus, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAction } from "../hooks/useStudio";
import { dateOffset, initials } from "../mocks/studio";
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
  const [view, setView] = useState("kanban");
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
          aria-pressed={view === "kanban"}
          variant={view === "kanban" ? "default" : "outline"}
          onClick={() => setView("kanban")}
        >
          <Columns3 size={16} /> Kanban
        </Button>
        <Button
          aria-pressed={view === "table"}
          variant={view === "table" ? "default" : "outline"}
          onClick={() => setView("table")}
        >
          <List size={16} /> Tabela
        </Button>
      </div>
      {!clients.length ? (
        <Empty>Nenhum cliente encontrado.</Empty>
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
                  }
                : {
                    name: "",
                    phone: "",
                    email: "",
                    stage: stages[0],
                    tags: "",
                    project: "",
                  }
            }
            schema={clientSchema.extend({ stage: clientSchema.shape.name })}
            close={close}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.save("clients", {
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
                  }),
                message: "Cliente salvo.",
              })
            }
          />
        </Modal>
      )}
      {client && !editing && !isNew && (
        <Modal title={client.name} close={close}>
          <div className="detail-grid">
            <div className="inline">
              <span className="avatar lime">{initials(client.name)}</span>
              <Badge tone="green">{client.stage}</Badge>
              {client.tags && <Badge>{client.tags}</Badge>}
            </div>
            <p className="profile-meta">
              {client.phone}
              {client.email && " · " + client.email}
            </p>
            <h3>Oportunidade</h3>
            <p>{client.project}</p>
            <h3>Referências visuais</h3>
            {client.references.length ? (
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
            ) : (
              <p className="muted">Nenhuma referência registrada.</p>
            )}
            <h3>Histórico e timeline</h3>
            <ul className="timeline">
              {client.history.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
            <div className="inline">
              <Button onClick={() => setEditing(true)}>Editar cliente</Button>
              <Button asChild>
                <Link to={"/atendimento?cliente=" + client.id}>
                  Abrir atendimento
                </Link>
              </Button>
              <Button asChild>
                <Link to={"/orcamentos?cliente=" + client.id}>
                  Criar orçamento
                </Link>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
export default function CRM() {
  return <Data>{(data) => <CRMView data={data} />}</Data>;
}
