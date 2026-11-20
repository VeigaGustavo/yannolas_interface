import { overlaps } from "../features/calendar";
import { addExpense, markInstallment } from "../domain/billing";
import {
  advanceFollowUp,
  birthdayCoupon,
  ensureFollowUp,
  onQuoteSaved,
  onSessionConcluded,
  scanTimeEvents,
} from "../domain/followups";
import {
  addClientWithReferral,
  createPromotion,
  registerPayment,
  saveCoupon,
} from "../domain/loyalty";
import { adjustStock, purchase } from "../domain/stock";
import { dateOffset, seed } from "../mocks/studio";
import { currentTenant } from "../stores/session";
import type {
  Collection,
  Entity,
  Stage,
  StudioData,
  StudioService,
} from "../types/studio";
const storageKey = () => "studio-data-v3-" + currentTenant();
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));
export const id = () => crypto.randomUUID();
function load(): StudioData {
  const raw = localStorage.getItem(storageKey());
  return raw ? JSON.parse(raw) : seed(currentTenant());
}
async function change<T>(action: (data: StudioData, today: string) => T) {
  await delay();
  const data = load();
  const result = action(data, dateOffset());
  localStorage.setItem(storageKey(), JSON.stringify(data));
  return result;
}
export const studio: StudioService = {
  async get() {
    await delay(240);
    const data = load();
    if (
      scanTimeEvents(data, dateOffset()) > 0 ||
      !localStorage.getItem(storageKey())
    )
      localStorage.setItem(storageKey(), JSON.stringify(data));
    return data;
  },
  async save<K extends Collection>(key: K, item: Entity<K>) {
    await change((d, today) => {
      if (key === "sessions") {
        const s = item as Entity<"sessions">;
        const previousSession = d.sessions.find((x) => x.id === s.id);
        if (s.status === "Concluído" && previousSession?.status !== "Concluído")
          onSessionConcluded(d, s, today);
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
        onQuoteSaved(d, quote, previous, today);
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
  addClient(client) {
    return change((d, today) => addClientWithReferral(d, client, today));
  },
  pay(input) {
    return change((d, today) => registerPayment(d, input, today));
  },
  markInstallment(paymentId, n, received) {
    return change((d) => markInstallment(d, paymentId, n, received));
  },
  addExpense(e) {
    return change((d) => addExpense(d, e));
  },
  advanceFollowUp(followUpId, stage, note, extra) {
    return change((d, today) =>
      advanceFollowUp(d, followUpId, stage, note, today, extra),
    );
  },
  async addFollowUp({ clientId, due, note }) {
    await change((d, today) => {
      const f = ensureFollowUp(d, { clientId, reason: "Manual", due }, today);
      if (f && note) {
        f.note = note;
        f.history[0].note = note;
      }
    });
  },
  birthdayCoupon(followUpId) {
    return change((d, today) => birthdayCoupon(d, followUpId, today));
  },
  createPromotion(p, clientIds) {
    return change((d, today) => createPromotion(d, p, clientIds, today));
  },
  saveCoupon(c) {
    return change((d) => saveCoupon(d, c));
  },
  async purchase(itemId, qty, totalCents, date) {
    await change((d) => purchase(d, itemId, qty, totalCents, date));
  },
  adjustStock(itemId, qty, note) {
    return change((d, today) => adjustStock(d, itemId, qty, note, today));
  },
  saveStockItem(item) {
    return change((d) => {
      if (!item.name.trim()) throw new Error("Informe o nome do item.");
      const index = d.stock.findIndex((x) => x.id === item.id);
      if (index < 0) d.stock.unshift(item);
      else d.stock[index] = item;
    });
  },
};
