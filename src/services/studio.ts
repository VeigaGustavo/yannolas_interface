import { overlaps } from "../features/calendar";
import { dateOffset, seed } from "../mocks/studio";
import type {
  Collection,
  Conversation,
  Entity,
  Stage,
  Message,
  StudioData,
  StudioService,
} from "../types/studio";
const key = "tattoo-studio-data-v2";
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));
export const id = () => crypto.randomUUID();
function load(): StudioData {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : seed();
}
async function change(action: (data: StudioData) => void) {
  await delay();
  const data = load();
  action(data);
  localStorage.setItem(key, JSON.stringify(data));
}
function append(
  data: StudioData,
  conversation: Conversation,
  message: Message,
) {
  conversation.messages.push(message);
  const received = message.from === "cliente";
  if (received) conversation.unread++;
  const client = data.clients.find((x) => x.id === conversation.clientId);
  if (!client) return;
  client.history.unshift(
    dateOffset() +
      " · " +
      (received ? "Mensagem recebida" : "Mensagem enviada"),
  );
  if (received && message.image && !client.references.includes(message.image))
    client.references.unshift(message.image);
}
function getConversation(data: StudioData, id: string) {
  const conversation = data.conversations.find((c) => c.id === id);
  if (!conversation) throw new Error("Conversa indisponível.");
  return conversation;
}
export function matchingClients(data: StudioData, segment: string) {
  return data.clients.filter(
    (c) =>
      !segment.trim() ||
      c.tags
        .toLowerCase()
        .split(",")
        .map((t) => t.trim())
        .includes(segment.trim().toLowerCase()),
  );
}
export const studio: StudioService = {
  async get() {
    await delay(240);
    return load();
  },
  async save<K extends Collection>(key: K, item: Entity<K>) {
    await change((d) => {
      if (key === "sessions") {
        const s = item as Entity<"sessions">;
        if (
          s.status !== "Cancelado" &&
          d.sessions.some((other) => other.id !== s.id && overlaps(s, other))
        )
          throw new Error("Este horário está ocupado.");
        if (s.quoteId) {
          if (
            !d.quotes.some(
              (q) => q.id === s.quoteId && q.clientId === s.clientId,
            )
          )
            throw new Error(
              "O orçamento deve pertencer ao cliente selecionado.",
            );
          if (
            s.status !== "Cancelado" &&
            d.sessions.some(
              (other) =>
                other.id !== s.id &&
                other.quoteId === s.quoteId &&
                other.status !== "Cancelado",
            )
          )
            throw new Error("Já existe uma sessão vinculada ao orçamento.");
        }
        if (s.status === "Confirmado" || s.status === "Concluído") {
          const client = d.clients.find((c) => c.id === s.clientId);
          if (client) {
            client.history.unshift(
              dateOffset() + " · " + s.status + ": " + s.title,
            );
            client.stage = s.status === "Concluído" ? "Concluído" : "Agendado";
          }
        }
      }
      if (key === "quotes") {
        const quote = item as Entity<"quotes">;
        const previous = d.quotes.find((q) => q.id === quote.id);
        if (
          previous &&
          previous.clientId !== quote.clientId &&
          d.sessions.some((s) => s.quoteId === quote.id)
        )
          throw new Error(
            "Mantenha o cliente do orçamento vinculado a uma sessão.",
          );
        const client = d.clients.find((c) => c.id === quote.clientId);
        if (
          client &&
          (!previous ||
            previous.status !== quote.status ||
            previous.clientId !== quote.clientId)
        ) {
          client.history.unshift(
            dateOffset() +
              " · Orçamento " +
              quote.status.toLowerCase() +
              ": " +
              quote.description,
          );
          const earlyStages: Stage[] = [
            "Novo lead",
            "Qualificação",
            "Orçamento",
          ];
          if (earlyStages.includes(client.stage))
            client.stage =
              quote.status === "Pendente"
                ? "Aguardando aprovação"
                : "Orçamento";
        }
      }
      const list = d[key] as Entity<K>[];
      const index = list.findIndex((x) => x.id === item.id);
      if (index < 0) list.unshift(item);
      else list[index] = item;
    });
  },
  settings(value) {
    return change((d) => {
      d.settings = value;
    });
  },
  moveClient(id, stage) {
    return change((d) => {
      const c = d.clients.find((c) => c.id === id);
      if (c && c.stage !== stage) {
        c.history.unshift(dateOffset() + " · Etapa alterada para " + stage);
        c.stage = stage;
      }
    });
  },
  send(id, message) {
    return change((data) => append(data, getConversation(data, id), message));
  },
  receive(event) {
    return change((data) => {
      const conversation = getConversation(data, event.conversationId);
      if (
        conversation.messages.some((message) => message.id === event.messageId)
      )
        return;
      append(data, conversation, {
        id: event.messageId,
        from: "cliente",
        text: event.text,
        image: event.image,
        at: event.at,
      });
      if (data.settings.agent && conversation.mode === "IA") {
        conversation.summary =
          "Último pedido do cliente: " +
          event.text +
          " Revisar a referência e confirmar disponibilidade.";
        append(data, conversation, {
          id: event.messageId + "-reply",
          from: "agente",
          text: "Referência recebida! Vou encaminhar o projeto para revisão do estúdio.",
          at: event.at,
        });
      }
    });
  },
  read(id) {
    return change((d) => {
      const c = d.conversations.find((c) => c.id === id);
      if (c) c.unread = 0;
    });
  },
  review(id, detail, approve) {
    return change((d) => {
      const run = d.executions.find((x) => x.id === id);
      if (!run || run.status !== "Pendente")
        throw new Error("Esta execução já foi revisada.");
      run.status = approve ? "Aprovado" : "Rejeitado";
      run.detail = detail;
      if (approve) {
        const client = d.clients.find((x) => x.id === run.clientId);
        if (client) {
          client.project = detail;
          client.history.unshift(
            dateOffset() + " · Briefing simulado aprovado",
          );
          if (run.image && !client.references.includes(run.image))
            client.references.unshift(run.image);
        }
      }
    });
  },
  async dispatch(id) {
    let sent = 0;
    await change((d) => {
      const c = d.campaigns.find((x) => x.id === id);
      if (!c || c.status === "Simulada")
        throw new Error("Campanha indisponível para simulação.");
      sent = matchingClients(d, c.segment).length;
      if (!sent) throw new Error("Nenhum cliente corresponde ao segmento.");
      c.sent = sent;
      c.status = "Simulada";
    });
    return sent;
  },
};
