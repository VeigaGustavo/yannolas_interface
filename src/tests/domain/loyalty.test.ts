import { describe, expect, it } from "vitest";
import {
  addClientWithReferral,
  benefitStatus,
  registerPayment,
  saveCoupon,
  type PaymentInput,
} from "../../domain/loyalty";
import { emptyStudio, newId } from "./fixtures";

const today = "2026-11-20";
const input = (p: Partial<PaymentInput> = {}): PaymentInput => ({
  clientId: "c0",
  kind: "Atendimento",
  date: today,
  grossCents: 100000,
  depositCents: 0,
  method: "Pix",
  installments: 1,
  ...p,
});
function withCoupon() {
  const d = emptyStudio();
  saveCoupon(d, {
    id: "k1",
    code: "niver10",
    pct: 10,
    validUntil: "2026-12-31",
    maxUses: 2,
    uses: 0,
  });
  return d;
}

describe("fidelidade e pagamento", () => {
  it("libera a indicação só no primeiro atendimento pago do indicado", () => {
    const d = emptyStudio();
    const novo = { ...d.clients[1], id: "novo", referredBy: "c0", history: [] };
    addClientWithReferral(d, novo, today);
    const pending = d.benefits.find((b) => b.clientId === "c0")!;
    expect(pending).toMatchObject({
      type: "Indicação",
      status: "Pendente",
      pct: 10,
      sourceClientId: "novo",
    });
    registerPayment(
      d,
      input({ clientId: "novo", kind: "Sinal", grossCents: 20000 }),
      today,
      newId,
    );
    expect(pending.status).toBe("Pendente");
    registerPayment(d, input({ clientId: "novo" }), today, newId);
    expect(pending.status).toBe("Disponível");
    expect(
      d.followUps.find((f) => f.clientId === "c0" && f.reason === "Indicação"),
    ).toBeTruthy();
  });

  it("aplica o desconto sobre o total e abate o sinal", () => {
    const d = withCoupon();
    const p = registerPayment(
      d,
      input({ depositCents: 20000, couponCode: "NIVER10" }),
      today,
      newId,
    );
    expect(p).toMatchObject({ netCents: 70000, discountCents: 10000 });
    expect(d.coupons[0].uses).toBe(1);
  });

  it("aceita o código do cupom sem diferenciar maiúsculas", () => {
    const d = withCoupon();
    expect(d.coupons[0].code).toBe("NIVER10");
    expect(
      registerPayment(d, input({ couponCode: " niver10 " }), today, newId)
        .discountCents,
    ).toBe(10000);
  });

  it("recusa cupom vencido, esgotado, inexistente ou combinado", () => {
    const d = withCoupon();
    expect(() =>
      registerPayment(d, input({ couponCode: "X" }), today, newId),
    ).toThrow("Cupom não encontrado.");
    expect(() =>
      registerPayment(d, input({ couponCode: "NIVER10" }), "2027-01-01", newId),
    ).toThrow("Cupom vencido.");
    d.coupons[0].uses = 2;
    expect(() =>
      registerPayment(d, input({ couponCode: "NIVER10" }), today, newId),
    ).toThrow("Cupom esgotado.");
    expect(() =>
      registerPayment(
        d,
        input({ couponCode: "NIVER10", benefitId: "b" }),
        today,
        newId,
      ),
    ).toThrow("Use apenas um desconto por atendimento.");
  });

  it("recusa desconto e sinal maiores que o total", () => {
    const d = withCoupon();
    expect(() =>
      registerPayment(
        d,
        input({ grossCents: 10000, depositCents: 9500, couponCode: "NIVER10" }),
        today,
        newId,
      ),
    ).toThrow("Desconto e sinal passam do valor total.");
  });

  it("recusa pagar o mesmo atendimento duas vezes", () => {
    const d = emptyStudio();
    registerPayment(d, input({ sessionId: "s1" }), today, newId);
    expect(() =>
      registerPayment(d, input({ sessionId: "s1" }), today, newId),
    ).toThrow("Este atendimento já foi pago.");
  });

  it("parcela apenas no crédito", () => {
    const d = emptyStudio();
    expect(
      registerPayment(d, input({ installments: 3 }), today, newId).installments,
    ).toHaveLength(1);
    const credit = registerPayment(
      d,
      input({ method: "Crédito", installments: 3, grossCents: 10000 }),
      today,
      newId,
    );
    expect(credit.installments.map((i) => i.cents)).toEqual([3334, 3333, 3333]);
  });

  it("marca benefício usado e reconhece vencidos", () => {
    const d = emptyStudio();
    d.benefits.push({
      id: "b1",
      clientId: "c0",
      type: "Promoção",
      pct: 15,
      label: "Black Friday",
      status: "Disponível",
      createdAt: today,
      validUntil: "2026-11-30",
    });
    expect(benefitStatus(d.benefits[0], "2026-12-01")).toBe("Vencido");
    const p = registerPayment(d, input({ benefitId: "b1" }), today, newId);
    expect(p.discountCents).toBe(15000);
    expect(d.benefits[0]).toMatchObject({ status: "Usado", paymentId: p.id });
    expect(() =>
      registerPayment(d, input({ benefitId: "b1" }), today, newId),
    ).toThrow("Benefício indisponível.");
  });
});
