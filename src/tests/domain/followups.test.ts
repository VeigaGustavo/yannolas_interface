import { describe, expect, it } from "vitest";
import {
  advanceFollowUp,
  ensureFollowUp,
  onQuoteSaved,
  onSessionConcluded,
  scanTimeEvents,
  waLink,
} from "../../domain/followups";
import type { Quote, Session } from "../../types/studio";
import { emptyStudio, newId } from "./fixtures";

const today = "2026-11-20";
const quote: Quote = {
  id: "q1",
  clientId: "c0",
  description: "Floral",
  size: "",
  placement: "",
  value: 0,
  deposit: 0,
  validUntil: today,
  status: "Rascunho",
  reference: "",
} as unknown as Quote;
const session: Session = {
  id: "s1",
  clientId: "c0",
  quoteId: "",
  title: "Toxina",
  date: today,
  time: "10:00",
  duration: 60,
  status: "Concluído",
  procedure: "Toxina botulínica",
};

describe("follow-up", () => {
  it("não duplica follow-ups abertos do mesmo motivo, exceto manuais", () => {
    const d = emptyStudio();
    const input = { clientId: "c0", reason: "Inativo" as const, due: today };
    expect(ensureFollowUp(d, input, today, newId)).not.toBeNull();
    expect(ensureFollowUp(d, input, today, newId)).toBeNull();
    ensureFollowUp(d, { ...input, reason: "Manual" }, today, newId);
    ensureFollowUp(d, { ...input, reason: "Manual" }, today, newId);
    expect(d.followUps).toHaveLength(3);
    expect(d.followUps[0]).toMatchObject({ stage: "A fazer", attempts: 0 });
  });

  it("reagenda sem resposta e perde após o máximo de tentativas", () => {
    const d = emptyStudio();
    const f = ensureFollowUp(
      d,
      { clientId: "c0", reason: "Inativo", due: today },
      today,
      newId,
    )!;
    advanceFollowUp(d, f.id, "Sem resposta", "", today);
    expect(f).toMatchObject({
      stage: "A fazer",
      attempts: 1,
      due: "2026-11-23",
    });
    advanceFollowUp(d, f.id, "Sem resposta", "", today);
    advanceFollowUp(d, f.id, "Sem resposta", "", today);
    expect(f).toMatchObject({ stage: "Perdido", attempts: 3 });
    expect(f.history.map((h) => h.stage)).toContain("Sem resposta");
  });

  it("cria follow-up de orçamento pendente e converte na aprovação", () => {
    const d = emptyStudio();
    const pending = { ...quote, status: "Pendente" as const };
    onQuoteSaved(d, pending, quote, today);
    expect(d.followUps[0]).toMatchObject({
      reason: "Orçamento sem resposta",
      due: "2026-11-23",
      refId: "q1",
    });
    onQuoteSaved(d, { ...quote, status: "Aprovado" }, pending, today);
    expect(d.followUps[0]).toMatchObject({
      stage: "Convertido",
      convertedTo: "q1",
    });
  });

  it("agenda retorno pelo prazo do procedimento", () => {
    const d = emptyStudio();
    d.settings.procedures = [
      { name: "Limpeza de pele", returnDays: 30 },
      { name: "Toxina botulínica", returnDays: 120 },
    ];
    onSessionConcluded(d, session, today);
    expect(d.followUps.find((f) => f.reason === "Retorno")?.due).toBe(
      "2027-03-20",
    );
    expect(d.followUps.find((f) => f.reason === "Pós-atendimento")?.due).toBe(
      "2026-11-21",
    );
  });

  it("gera aniversário na virada do ano uma única vez", () => {
    const d = emptyStudio();
    d.clients[0].birthday = "1990-01-03";
    expect(scanTimeEvents(d, "2026-12-30")).toBeGreaterThan(0);
    const f = d.followUps.find((f) => f.reason === "Aniversário")!;
    expect(f.refId).toBe("2027");
    advanceFollowUp(d, f.id, "Convertido", "", "2026-12-30");
    scanTimeEvents(d, "2026-12-31");
    expect(d.followUps.filter((f) => f.reason === "Aniversário")).toHaveLength(
      1,
    );
  });

  it("trata 29 de fevereiro em ano não bissexto", () => {
    const d = emptyStudio();
    d.clients[0].birthday = "2000-02-29";
    scanTimeEvents(d, "2027-02-22");
    expect(d.followUps.find((f) => f.reason === "Aniversário")?.refId).toBe(
      "2027",
    );
  });

  it("marca cliente inativo sem atendimento recente nem futuro", () => {
    const d = emptyStudio();
    d.sessions.push({ ...session, date: "2026-01-01" });
    scanTimeEvents(d, today);
    expect(d.followUps.some((f) => f.reason === "Inativo")).toBe(true);
  });

  it("monta o link do WhatsApp com o primeiro nome", () => {
    expect(waLink("(63) 99999-1234", "Oi, {nome}!", "Ana Ribeiro")).toBe(
      "https://wa.me/5563999991234?text=Oi%2C%20Ana!",
    );
  });
});
