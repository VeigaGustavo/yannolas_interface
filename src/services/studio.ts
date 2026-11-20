import { overlaps } from "../features/calendar";
import { dateOffset, seed } from "../mocks/studio";
import type {
  Collection,
  Entity,
  Stage,
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
};
