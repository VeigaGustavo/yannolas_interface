import { addDays } from "./money";
import type {
  Benefit,
  FollowUp,
  FollowUpReason,
  FollowUpStage,
  Quote,
  Session,
  StudioData,
} from "../types/studio";

const uuid = () => crypto.randomUUID();

export const OPEN_STAGES: FollowUpStage[] = [
  "A fazer",
  "Contatado",
  "Respondeu",
  "Sem resposta",
];
export const isOpen = (f: FollowUp) => OPEN_STAGES.includes(f.stage);

export function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) /
      86_400_000,
  );
}

export function ensureFollowUp(
  data: StudioData,
  input: {
    clientId: string;
    reason: FollowUpReason;
    due: string;
    refId?: string;
  },
  today: string,
  newId: () => string = uuid,
): FollowUp | null {
  if (input.reason !== "Manual") {
    const same = data.followUps.filter(
      (f) => f.clientId === input.clientId && f.reason === input.reason,
    );
    if (same.some(isOpen)) return null;
    if (input.refId && same.some((f) => f.refId === input.refId)) return null;
  }
  const followUp: FollowUp = {
    id: newId(),
    clientId: input.clientId,
    reason: input.reason,
    due: input.due,
    stage: "A fazer",
    attempts: 0,
    ...(input.refId ? { refId: input.refId } : {}),
    history: [{ at: today, stage: "A fazer", note: "Criado: " + input.reason }],
  };
  data.followUps.unshift(followUp);
  return followUp;
}

export function advanceFollowUp(
  data: StudioData,
  id: string,
  stage: FollowUpStage,
  note: string,
  today: string,
  extra: { rating?: number; comment?: string; convertedTo?: string } = {},
) {
  const f = data.followUps.find((x) => x.id === id);
  if (!f) throw new Error("Follow-up não encontrado.");
  if (!isOpen(f)) throw new Error("Este follow-up já foi encerrado.");
  Object.assign(f, extra);
  if (note) f.note = note;
  f.history.push({ at: today, stage, note });
  if (stage !== "Sem resposta") {
    f.stage = stage;
    if (!isOpen(f)) followNext(data, f, today);
    return;
  }
  const { retryDays, maxAttempts } = data.settings.followUp;
  f.attempts++;
  if (f.attempts >= maxAttempts) {
    f.stage = "Perdido";
    f.history.push({
      at: today,
      stage: "Perdido",
      note: `Sem resposta após ${f.attempts} tentativas`,
    });
    followNext(data, f, today);
  } else {
    f.stage = "A fazer";
    f.due = addDays(today, retryDays);
    f.history.push({
      at: today,
      stage: "A fazer",
      note: `Nova tentativa em ${retryDays} dias`,
    });
  }
}

export function onQuoteSaved(
  data: StudioData,
  quote: Quote,
  previous: Quote | undefined,
  today: string,
) {
  if (previous?.status === quote.status) return;
  if (quote.status === "Pendente")
    ensureFollowUp(
      data,
      {
        clientId: quote.clientId,
        reason: "Orçamento sem resposta",
        due: addDays(today, data.settings.followUp.quoteDays),
        refId: quote.id,
      },
      today,
    );
  if (quote.status === "Aprovado" || quote.status === "Recusado") {
    const open = data.followUps.find(
      (f) =>
        f.reason === "Orçamento sem resposta" &&
        f.refId === quote.id &&
        isOpen(f),
    );
    if (open)
      advanceFollowUp(
        data,
        open.id,
        quote.status === "Aprovado" ? "Convertido" : "Perdido",
        "Orçamento " + quote.status.toLowerCase(),
        today,
        quote.status === "Aprovado" ? { convertedTo: quote.id } : {},
      );
  }
}

/**
 * Só existe um follow-up aberto por cliente e motivo. Quando um de orçamento
 * ou de retorno fecha, abre o próximo que ficou esperando: outro orçamento
 * pendente ou o retorno de um atendimento concluído ainda sem follow-up.
 */
function followNext(data: StudioData, closed: FollowUp, today: string) {
  const covered = (refId: string) =>
    data.followUps.some(
      (f) =>
        f.clientId === closed.clientId &&
        f.reason === closed.reason &&
        f.refId === refId,
    );
  if (closed.reason === "Orçamento sem resposta") {
    const next = data.quotes.find(
      (q) =>
        q.clientId === closed.clientId &&
        q.status === "Pendente" &&
        !covered(q.id),
    );
    if (next)
      ensureFollowUp(
        data,
        {
          clientId: next.clientId,
          reason: closed.reason,
          due: addDays(today, data.settings.followUp.quoteDays),
          refId: next.id,
        },
        today,
      );
  }
  if (closed.reason === "Retorno") {
    const next = data.sessions
      .filter(
        (s) =>
          s.clientId === closed.clientId &&
          s.status === "Concluído" &&
          !covered(s.id),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const days = next && returnDays(data, next.procedure);
    if (next && days) {
      const due = addDays(next.date, days);
      ensureFollowUp(
        data,
        {
          clientId: next.clientId,
          reason: closed.reason,
          due: due < today ? today : due,
          refId: next.id,
        },
        today,
      );
    }
  }
}

export function returnDays(data: StudioData, procedure?: string) {
  const list = data.settings.procedures;
  return (list.find((p) => p.name === procedure) ?? list[0])?.returnDays;
}

export function onSessionConcluded(
  data: StudioData,
  session: Session,
  today: string,
) {
  if (!session.clientId) return;
  ensureFollowUp(
    data,
    {
      clientId: session.clientId,
      reason: "Pós-atendimento",
      due: addDays(today, data.settings.followUp.postDays),
      refId: session.id,
    },
    today,
  );
  const days = returnDays(data, session.procedure);
  if (days)
    ensureFollowUp(
      data,
      {
        clientId: session.clientId,
        reason: "Retorno",
        due: addDays(today, days),
        refId: session.id,
      },
      today,
    );
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export function nextBirthday(birthday: string, today: string) {
  const [, m, d] = birthday.split("-");
  const at = (y: number) =>
    `${y}-${m}-${m === "02" && d === "29" && !isLeap(y) ? "28" : d}`;
  const year = Number(today.slice(0, 4));
  return at(year) >= today ? at(year) : at(year + 1);
}

export function scanTimeEvents(data: StudioData, today: string): number {
  const before = data.followUps.length;
  const { birthdayDays, inactiveDays } = data.settings.followUp;
  for (const c of data.clients) {
    if (c.birthday) {
      const next = nextBirthday(c.birthday, today);
      if (daysBetween(today, next) <= birthdayDays) {
        const due = addDays(next, -birthdayDays);
        ensureFollowUp(
          data,
          {
            clientId: c.id,
            reason: "Aniversário",
            due: due < today ? today : due,
            refId: next.slice(0, 4),
          },
          today,
        );
      }
    }
    const sessions = data.sessions.filter((s) => s.clientId === c.id);
    const last = sessions
      .filter((s) => s.status === "Concluído")
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const upcoming = sessions.some(
      (s) =>
        s.date >= today && s.status !== "Cancelado" && s.status !== "Concluído",
    );
    if (last && !upcoming && daysBetween(last.date, today) >= inactiveDays)
      ensureFollowUp(
        data,
        {
          clientId: c.id,
          reason: "Inativo",
          due: today,
          refId: last.id,
        },
        today,
      );
  }
  return data.followUps.length - before;
}

export function birthdayCoupon(
  data: StudioData,
  followUpId: string,
  today: string,
  newId: () => string = uuid,
): Benefit {
  const f = data.followUps.find((x) => x.id === followUpId);
  if (!f || f.reason !== "Aniversário")
    throw new Error("Follow-up de aniversário não encontrado.");
  const exists = data.benefits.find(
    (b) =>
      b.type === "Aniversário" &&
      b.clientId === f.clientId &&
      b.label === "Aniversário " + f.refId,
  );
  if (exists) return exists;
  const benefit: Benefit = {
    id: newId(),
    clientId: f.clientId,
    type: "Aniversário",
    pct: data.settings.benefitPct.Aniversário,
    label: "Aniversário " + f.refId,
    status: "Disponível",
    createdAt: today,
    validUntil: addDays(today, 30),
  };
  data.benefits.unshift(benefit);
  return benefit;
}

export function waLink(phone: string, template: string, clientName: string) {
  const digits = phone.replace(/\D/g, "");
  const number =
    digits.startsWith("55") && digits.length > 11 ? digits : "55" + digits;
  const text = template.replaceAll("{nome}", clientName.split(" ")[0]);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function bucket(
  f: FollowUp,
  today: string,
): "Hoje" | "Atrasados" | "Próximos" | "Fechados" {
  if (!isOpen(f)) return "Fechados";
  if (f.due < today) return "Atrasados";
  return f.due === today ? "Hoje" : "Próximos";
}
