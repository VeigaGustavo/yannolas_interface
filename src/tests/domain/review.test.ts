import { describe, expect, it } from "vitest";
import {
  advanceFollowUp,
  onQuoteSaved,
  onSessionConcluded,
} from "../../domain/followups";
import { createPromotion, registerPayment } from "../../domain/loyalty";
import { shortDate } from "../../mocks/studio";
import type { Quote, Session } from "../../types/studio";
import { emptyStudio, newId } from "./fixtures";

const today = "2026-11-20";
const quote = (id: string): Quote => ({
  id,
  clientId: "c0",
  description: "Projeto " + id,
  details: {},
  valueCents: 10000,
  depositCents: 0,
  validUntil: "2026-12-31",
  status: "Pendente",
  reference: "",
});
const session = (id: string, procedure: string, date: string): Session => ({
  id,
  clientId: "c0",
  quoteId: "",
  title: procedure,
  date,
  time: "10:00",
  duration: 60,
  status: "Concluído",
  procedure,
});

describe("correções da revisão final", () => {
  it("recusa promoção sem validade", () => {
    expect(() =>
      createPromotion(
        emptyStudio(),
        { id: "p", name: "X", type: "Sorteio", pct: 10, validUntil: "" },
        ["c0"],
        today,
        newId,
      ),
    ).toThrow("Informe a validade.");
  });

  it("formata data vazia ou inválida sem quebrar", () => {
    expect(shortDate("")).toBe("—");
    expect(shortDate("abc")).toBe("—");
  });

  it("recusa pagamento sem data", () => {
    expect(() =>
      registerPayment(
        emptyStudio(),
        {
          clientId: "c0",
          kind: "Atendimento",
          date: "",
          grossCents: 1000,
          depositCents: 0,
          method: "Pix",
          installments: 1,
        },
        today,
        newId,
      ),
    ).toThrow("Informe a data.");
  });

  it("acompanha o segundo orçamento pendente quando o primeiro fecha", () => {
    const d = emptyStudio();
    d.quotes.push(quote("q1"), quote("q2"));
    onQuoteSaved(d, quote("q1"), undefined, today);
    onQuoteSaved(d, quote("q2"), undefined, today);
    expect(d.followUps).toHaveLength(1);
    onQuoteSaved(d, { ...quote("q1"), status: "Recusado" }, quote("q1"), today);
    const open = d.followUps.find(
      (f) => f.refId === "q2" && f.stage === "A fazer",
    );
    expect(open?.reason).toBe("Orçamento sem resposta");
  });

  it("agenda o retorno do segundo procedimento quando o primeiro fecha", () => {
    const d = emptyStudio();
    d.settings.procedures = [
      { name: "Toxina botulínica", returnDays: 120 },
      { name: "Preenchimento", returnDays: 270 },
    ];
    d.sessions.push(
      session("s1", "Toxina botulínica", "2026-10-01"),
      session("s2", "Preenchimento", "2026-11-01"),
    );
    onSessionConcluded(
      d,
      session("s1", "Toxina botulínica", "2026-10-01"),
      "2026-10-01",
    );
    onSessionConcluded(
      d,
      session("s2", "Preenchimento", "2026-11-01"),
      "2026-11-01",
    );
    const first = d.followUps.find((f) => f.reason === "Retorno")!;
    expect(first.refId).toBe("s1");
    advanceFollowUp(d, first.id, "Convertido", "", "2027-01-29");
    const next = d.followUps.find(
      (f) => f.reason === "Retorno" && f.refId === "s2",
    );
    expect(next?.due).toBe("2027-07-29");
  });
});
