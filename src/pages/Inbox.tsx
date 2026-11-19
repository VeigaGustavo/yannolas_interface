import { useState } from "react";
import { ImagePlus, MessageCircle, Send, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Data, Empty, Page } from "../components/Page";
import { fileAccept, fileData } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAction } from "../hooks/useStudio";
import { initials } from "../mocks/studio";
import { id, studio } from "../services/studio";
import type {
  Client,
  Conversation,
  Message,
  StudioData,
} from "../types/studio";
function Thread({
  client,
  conversation,
}: {
  client: Client;
  conversation?: Conversation;
}) {
  const action = useAction();
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const send = (from: Message["from"], text: string, attachment?: string) =>
    studio.send(conversation!.id, {
      id: id(),
      from,
      text,
      image: attachment,
      at: new Date().toISOString(),
    });
  return (
    <>
      <Card className="thread">
        <div className="thread-head">
          <span className="avatar lime">{initials(client.name)}</span>
          <div>
            <h2>{client.name}</h2>
            <small>WhatsApp · sandbox local</small>
          </div>
          {conversation && (
            <Badge tone={conversation.mode === "IA" ? "violet" : "green"}>
              {conversation.mode}
            </Badge>
          )}
        </div>
        {conversation ? (
          <>
            <div className="messages" aria-label="Histórico de mensagens">
              {conversation.messages.map((m) => (
                <div key={m.id} className={"bubble " + m.from}>
                  <small>
                    {m.from === "cliente"
                      ? client.name
                      : m.from === "agente"
                        ? "Agente · simulação"
                        : "Estúdio"}{" "}
                    ·{" "}
                    {m.at.includes("Z")
                      ? new Date(m.at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : m.at.slice(11, 16)}
                  </small>
                  {m.text && <p>{m.text}</p>}
                  {m.image && (
                    <img
                      className="reference"
                      src={m.image}
                      alt="Anexo da conversa"
                    />
                  )}
                </div>
              ))}
            </div>
            <form
              className="composer"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim() && !image) return;
                try {
                  await action.mutateAsync({
                    run: () => send("humano", draft.trim(), image || undefined),
                    message: "Mensagem registrada na simulação.",
                  });
                  setDraft("");
                  setImage("");
                } catch {
                  /* o mutation informa o erro */
                }
              }}
            >
              {image && (
                <div className="inline">
                  <img
                    className="attachment-preview"
                    src={image}
                    alt="Imagem a enviar"
                  />
                  <Button type="button" onClick={() => setImage("")}>
                    Remover imagem
                  </Button>
                </div>
              )}
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <div className="inline compose-line">
                <input
                  aria-label="Mensagem"
                  placeholder="Escreva uma mensagem"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <label className="button file-button" title="Anexar imagem">
                  <ImagePlus size={18} />
                  <input
                    type="file"
                    accept={fileAccept}
                    aria-label="Anexar imagem"
                    onChange={async (e) => {
                      try {
                        setImage(await fileData(e.target.files?.[0]));
                        setError("");
                      } catch (error) {
                        setError((error as Error).message);
                      }
                    }}
                  />
                </label>
                <Button
                  variant="default"
                  type="submit"
                  disabled={action.isPending || (!draft.trim() && !image)}
                >
                  <Send size={16} /> Enviar
                </Button>
              </div>
            </form>
          </>
        ) : (
          <Empty>Inicie uma conversa para registrar mensagens.</Empty>
        )}
      </Card>
      <Card className="pad stack thread-details">
        <div className="section-head">
          <h2>Detalhes do cliente</h2>
        </div>
        <p className="muted">{client.phone}</p>
        <p>{client.project}</p>
        <Button asChild>
          <Link to={"/crm?cliente=" + client.id}>Abrir perfil no CRM</Link>
        </Button>
        <Button asChild>
          <Link to={"/orcamentos?cliente=" + client.id}>Criar orçamento</Link>
        </Button>
        <Button asChild>
          <Link to={"/agenda?cliente=" + client.id}>Agendar sessão</Link>
        </Button>
        {conversation ? (
          <>
            <div className="mini-panel">
              <h3 className="inline">
                <Sparkles size={15} /> Resumo simulado
              </h3>
              <p>{conversation.summary}</p>
            </div>
            <Button
              disabled={action.isPending}
              onClick={() =>
                action.mutate({
                  run: () =>
                    studio.save("conversations", {
                      ...conversation,
                      mode: conversation.mode === "IA" ? "Humano" : "IA",
                    }),
                  message: "Modo de atendimento alterado.",
                })
              }
            >
              {conversation.mode === "IA"
                ? "Assumir atendimento"
                : "Devolver ao agente"}
            </Button>
            <Button
              disabled={action.isPending}
              onClick={() =>
                action.mutate({
                  run: () =>
                    studio.receive({
                      event: "messages.upsert",
                      conversationId: conversation.id,
                      messageId: id(),
                      at: new Date().toISOString(),
                      text: "Posso enviar uma referência e saber os horários disponíveis?",
                      image: "/referencia-botanica.svg",
                    }),
                  message: "Evento simulado da Evolution API registrado.",
                })
              }
            >
              Simular mensagem recebida
            </Button>
            {conversation.unread > 0 && (
              <Button
                disabled={action.isPending}
                onClick={() =>
                  action.mutate({
                    run: () => studio.read(conversation.id),
                    message: "Conversa marcada como lida.",
                  })
                }
              >
                Marcar como lida
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="default"
            disabled={action.isPending}
            onClick={() =>
              action.mutate({
                run: () =>
                  studio.save("conversations", {
                    id: id(),
                    clientId: client.id,
                    unread: 0,
                    mode: "Humano",
                    summary:
                      "Nova conversa. Aguardando informações do projeto.",
                    messages: [],
                  }),
                message: "Conversa iniciada.",
              })
            }
          >
            Iniciar conversa
          </Button>
        )}
        {client.references.length > 0 && (
          <>
            <h3>Referências</h3>
            <div className="reference-grid">
              {client.references.map((ref, i) => (
                <img
                  key={i}
                  className="reference"
                  src={ref}
                  alt={"Referência " + (i + 1)}
                />
              ))}
            </div>
            <Button asChild>
              <Link to={"/agente?cliente=" + client.id}>
                Analisar referência
              </Link>
            </Button>
          </>
        )}
      </Card>
    </>
  );
}
function InboxView({ data }: { data: StudioData }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const clientId = params.get("cliente") || data.conversations[0]?.clientId;
  const client = data.clients.find((c) => c.id === clientId);
  const conversation = data.conversations.find((c) => c.clientId === clientId);
  const list = data.conversations
    .map((c) => ({ c, client: data.clients.find((x) => x.id === c.clientId) }))
    .filter((x) => x.client?.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Page
      title="Central de atendimento"
      description="Converse com clientes e acompanhe o atendimento humano e assistido."
      actions={
        <Badge tone="green">
          <i className="dot" /> Evolution API simulada
        </Badge>
      }
    >
      <div className="inbox-grid">
        <Card className="pad">
          <h2 className="inline">
            <MessageCircle size={17} /> Conversas
          </h2>
          <input
            className="conversation-search"
            placeholder="Buscar conversa"
            aria-label="Buscar conversa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="conversation-list">
            {list.length ? (
              list.map(({ c, client }) => (
                <button
                  key={c.id}
                  className={c.clientId === clientId ? "chosen" : ""}
                  onClick={() => setParams({ cliente: c.clientId })}
                  aria-pressed={c.clientId === clientId}
                >
                  <span className="avatar">{initials(client!.name)}</span>
                  <div>
                    <strong>{client!.name}</strong>
                    <small>{c.messages.at(-1)?.text || "Nova conversa"}</small>
                  </div>
                  {c.unread > 0 && <Badge tone="green">{c.unread}</Badge>}
                </button>
              ))
            ) : (
              <Empty>Nenhuma conversa encontrada.</Empty>
            )}
          </div>
        </Card>
        {client ? (
          <Thread key={client.id} client={client} conversation={conversation} />
        ) : (
          <Card>
            <Empty>Selecione uma conversa.</Empty>
          </Card>
        )}
      </div>
    </Page>
  );
}
export default function Inbox() {
  return <Data>{(data) => <InboxView data={data} />}</Data>;
}
