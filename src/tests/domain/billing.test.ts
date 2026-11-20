import { describe, expect, it } from "vitest";
import { parseCents, splitInstallments, money } from "../../domain/money";
import { isReceived, monthEntries, monthSummary } from "../../domain/billing";
import { seed } from "../../mocks/studio";
import type { Payment, StudioData } from "../../types/studio";

function base(): StudioData {
  const d = seed();
  return {
    ...d,
    payments: [],
    expenses: [],
    benefits: [],
    coupons: [],
    promotions: [],
    followUps: [],
    stock: [],
  };
}
const payment = (p: Partial<Payment>): Payment => ({
  id: "p",
  clientId: "c0",
  kind: "Atendimento",
  date: "2026-11-05",
  grossCents: 0,
  discountCents: 0,
  discountReason: "",
  depositCents: 0,
  netCents: 0,
  method: "Pix",
  installments: [],
  ...p,
});

describe("dinheiro", () => {
  it("divide parcelas com o resto na primeira e ajusta fim de mês", () => {
    const parts = splitInstallments(10000, 3, "2026-01-31");
    expect(parts.map((p) => p.cents)).toEqual([3334, 3333, 3333]);
    expect(parts.map((p) => p.date)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
    expect(parts.map((p) => p.n)).toEqual([1, 2, 3]);
  });
  it("lê valores digitados em reais", () => {
    expect(parseCents("1.234,56")).toBe(123456);
    expect(parseCents("1234.5")).toBe(123450);
    expect(parseCents("1234")).toBe(123400);
    expect(Number.isNaN(parseCents("abc"))).toBe(true);
  });
  it("formata centavos em reais", () => {
    expect(money(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
});

describe("faturamento", () => {
  it("considera recebida a parcela vencida, salvo marcação manual", () => {
    const i = { n: 1, date: "2026-11-20", cents: 100 };
    expect(isReceived(i, "2026-11-20")).toBe(true);
    expect(isReceived(i, "2026-11-19")).toBe(false);
    expect(isReceived({ ...i, received: false }, "2026-12-01")).toBe(false);
    expect(isReceived({ ...i, received: true }, "2026-11-01")).toBe(true);
  });
  it("resume o mês em regime de caixa e fecha com as entradas", () => {
    const d = base();
    d.payments.push(
      payment({
        id: "a",
        date: "2026-11-05",
        netCents: 50000,
        installments: [{ n: 1, date: "2026-11-05", cents: 50000 }],
      }),
      payment({
        id: "b",
        date: "2026-11-10",
        method: "Crédito",
        discountCents: 3000,
        netCents: 30000,
        installments: splitInstallments(30000, 3, "2026-11-10"),
      }),
    );
    d.expenses.push({
      id: "e",
      date: "2026-11-12",
      category: "Aluguel",
      description: "Aluguel",
      cents: 12000,
    });
    expect(monthSummary(d, "2026-11", "2026-11-20")).toMatchObject({
      inCents: 60000,
      pendingCents: 0,
      outCents: 12000,
      discountCents: 3000,
      profitCents: 48000,
    });
    expect(monthSummary(d, "2026-12", "2026-11-20").pendingCents).toBe(10000);
    const received = monthEntries(d, "2026-11")
      .filter((e) => isReceived(e.installment, "2026-11-20"))
      .reduce((s, e) => s + e.installment.cents, 0);
    expect(received).toBe(60000);
  });
});
