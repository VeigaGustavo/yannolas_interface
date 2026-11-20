import type {
  Expense,
  Installment,
  Payment,
  StudioData,
} from "../types/studio";

export const isReceived = (i: Installment, today: string) =>
  i.received ?? i.date <= today;

export interface MonthSummary {
  inCents: number;
  pendingCents: number;
  outCents: number;
  discountCents: number;
  profitCents: number;
  referrals: number;
}

export function monthEntries(data: StudioData, month: string) {
  return data.payments.flatMap((payment) =>
    payment.installments
      .filter((installment) => installment.date.startsWith(month))
      .map((installment) => ({ payment, installment })),
  );
}

function firstServicePayment(data: StudioData, clientId: string) {
  return data.payments
    .filter((p) => p.clientId === clientId && p.kind === "Atendimento")
    .sort((a, b) => a.date.localeCompare(b.date))[0] as Payment | undefined;
}

export function monthSummary(
  data: StudioData,
  month: string,
  today: string,
): MonthSummary {
  let inCents = 0;
  let pendingCents = 0;
  for (const { installment } of monthEntries(data, month)) {
    if (isReceived(installment, today)) inCents += installment.cents;
    else pendingCents += installment.cents;
  }
  const outCents = data.expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((sum, e) => sum + e.cents, 0);
  const discountCents = data.payments
    .filter((p) => p.date.startsWith(month))
    .reduce((sum, p) => sum + p.discountCents, 0);
  const referrals = data.clients.filter(
    (c) =>
      c.referredBy && firstServicePayment(data, c.id)?.date.startsWith(month),
  ).length;
  return {
    inCents,
    pendingCents,
    outCents,
    discountCents,
    profitCents: inCents - outCents,
    referrals,
  };
}

export function markInstallment(
  data: StudioData,
  paymentId: string,
  n: number,
  received: boolean,
) {
  const installment = data.payments
    .find((p) => p.id === paymentId)
    ?.installments.find((i) => i.n === n);
  if (!installment) throw new Error("Parcela não encontrada.");
  installment.received = received;
}

export function addExpense(data: StudioData, e: Expense) {
  if (!(e.cents > 0)) throw new Error("Informe um valor maior que zero.");
  data.expenses.unshift(e);
}
