import { ensureFollowUp } from "./followups";
import { money, splitInstallments } from "./money";
import type {
  Benefit,
  Client,
  Coupon,
  Payment,
  PaymentMethod,
  Promotion,
  StudioData,
} from "../types/studio";

const uuid = () => crypto.randomUUID();
const normalize = (code: string) => code.trim().toUpperCase();

export function benefitStatus(
  b: Benefit,
  today: string,
): Benefit["status"] | "Vencido" {
  if (b.status !== "Usado" && b.validUntil && b.validUntil < today)
    return "Vencido";
  return b.status;
}

export const availableBenefits = (
  data: StudioData,
  clientId: string,
  today: string,
) =>
  data.benefits.filter(
    (b) => b.clientId === clientId && benefitStatus(b, today) === "Disponível",
  );

export function addClientWithReferral(
  data: StudioData,
  client: Client,
  today: string,
  newId: () => string = uuid,
) {
  if (data.clients.some((c) => c.id === client.id))
    throw new Error("Cliente já cadastrado.");
  data.clients.unshift(client);
  const referrer = data.clients.find((c) => c.id === client.referredBy);
  if (!referrer) return;
  data.benefits.unshift({
    id: newId(),
    clientId: referrer.id,
    type: "Indicação",
    pct: data.settings.benefitPct.Indicação,
    label: "Indicação de " + client.name,
    status: "Pendente",
    createdAt: today,
    sourceClientId: client.id,
  });
  referrer.history.unshift(`${today} · Indicou ${client.name}`);
}

export function createPromotion(
  data: StudioData,
  p: Promotion,
  clientIds: string[],
  today: string,
  newId: () => string = uuid,
) {
  if (!clientIds.length) throw new Error("Escolha ao menos um cliente.");
  data.promotions.unshift(p);
  for (const clientId of clientIds)
    data.benefits.unshift({
      id: newId(),
      clientId,
      type: p.type,
      pct: p.pct,
      label: p.name,
      status: "Disponível",
      createdAt: today,
      validUntil: p.validUntil,
      promotionId: p.id,
    });
}

export function saveCoupon(data: StudioData, c: Coupon) {
  const coupon = { ...c, code: normalize(c.code) };
  if (!coupon.code) throw new Error("Informe o código do cupom.");
  if (data.coupons.some((x) => x.id !== c.id && x.code === coupon.code))
    throw new Error("Já existe um cupom com este código.");
  const index = data.coupons.findIndex((x) => x.id === c.id);
  if (index < 0) data.coupons.unshift(coupon);
  else data.coupons[index] = coupon;
}

export interface PaymentInput {
  clientId: string;
  sessionId?: string;
  quoteId?: string;
  kind: Payment["kind"];
  date: string;
  grossCents: number;
  depositCents: number;
  method: PaymentMethod;
  installments: number;
  benefitId?: string;
  couponCode?: string;
  manualPct?: number;
  discountReason?: string;
}

export function registerPayment(
  data: StudioData,
  input: PaymentInput,
  today: string,
  newId: () => string = uuid,
): Payment {
  const client = data.clients.find((c) => c.id === input.clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  if (!(input.grossCents > 0)) throw new Error("Informe o valor total.");
  if (input.benefitId && input.couponCode?.trim())
    throw new Error("Use apenas um desconto por atendimento.");
  if (
    input.kind === "Atendimento" &&
    input.sessionId &&
    data.payments.some(
      (p) => p.kind === "Atendimento" && p.sessionId === input.sessionId,
    )
  )
    throw new Error("Este atendimento já foi pago.");

  let pct = 0;
  let reason = input.discountReason?.trim() ?? "";
  let benefit: Benefit | undefined;
  let coupon: Coupon | undefined;
  if (input.benefitId) {
    benefit = data.benefits.find((b) => b.id === input.benefitId);
    if (
      !benefit ||
      benefit.clientId !== client.id ||
      benefitStatus(benefit, today) !== "Disponível"
    )
      throw new Error("Benefício indisponível.");
    pct = benefit.pct;
    reason = benefit.type + ": " + benefit.label;
  } else if (input.couponCode?.trim()) {
    coupon = data.coupons.find((c) => c.code === normalize(input.couponCode!));
    if (!coupon) throw new Error("Cupom não encontrado.");
    if (coupon.validUntil < today) throw new Error("Cupom vencido.");
    if (coupon.uses >= coupon.maxUses) throw new Error("Cupom esgotado.");
    pct = coupon.pct;
    reason = "Cupom " + coupon.code;
  }
  if (input.manualPct !== undefined) pct = input.manualPct;
  if (pct < 0 || pct > 100) throw new Error("Desconto inválido.");

  const discountCents = Math.round((input.grossCents * pct) / 100);
  const netCents = input.grossCents - discountCents - input.depositCents;
  if (netCents < 0) throw new Error("Desconto e sinal passam do valor total.");
  const count =
    input.method === "Crédito"
      ? Math.min(12, Math.max(1, Math.floor(input.installments)))
      : 1;
  const firstService =
    input.kind === "Atendimento" &&
    !data.payments.some(
      (p) => p.clientId === client.id && p.kind === "Atendimento",
    );

  const payment: Payment = {
    id: newId(),
    clientId: client.id,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.quoteId ? { quoteId: input.quoteId } : {}),
    kind: input.kind,
    date: input.date,
    grossCents: input.grossCents,
    discountCents,
    discountReason: discountCents ? reason : "",
    ...(benefit ? { benefitId: benefit.id } : {}),
    ...(coupon ? { couponId: coupon.id } : {}),
    depositCents: input.depositCents,
    netCents,
    method: input.method,
    installments: splitInstallments(netCents, count, input.date),
  };
  data.payments.unshift(payment);
  if (benefit) {
    benefit.status = "Usado";
    benefit.paymentId = payment.id;
  }
  if (coupon) coupon.uses++;
  client.history.unshift(
    `${input.date} · ${input.kind === "Sinal" ? "Sinal" : "Pagamento"} ${money(netCents)} (${input.method}${count > 1 ? ` ${count}x` : ""})`,
  );

  if (firstService && client.referredBy) {
    const referral = data.benefits.find(
      (b) =>
        b.type === "Indicação" &&
        b.sourceClientId === client.id &&
        b.status === "Pendente",
    );
    if (referral) {
      referral.status = "Disponível";
      ensureFollowUp(
        data,
        {
          clientId: client.referredBy,
          reason: "Indicação",
          due: today,
          refId: client.id,
        },
        today,
        newId,
      );
    }
  }
  return payment;
}

export function referralRanking(data: StudioData) {
  const counts = new Map<string, number>();
  for (const c of data.clients)
    if (c.referredBy)
      counts.set(c.referredBy, (counts.get(c.referredBy) ?? 0) + 1);
  return [...counts]
    .map(([clientId, count]) => ({ clientId, count }))
    .sort((a, b) => b.count - a.count);
}
