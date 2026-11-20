import type { Installment } from "../types/studio";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const money = (cents: number) => formatter.format(cents / 100);

export function parseCents(input: string): number {
  const raw = input.trim().replace(/^R\$\s*/, "");
  if (!/^\d[\d.,]*$/.test(raw)) return NaN;
  const lastComma = raw.lastIndexOf(",");
  const normalized =
    lastComma >= 0
      ? raw.replace(/\./g, "").replace(",", ".")
      : /\.\d{1,2}$/.test(raw)
        ? raw
        : raw.replace(/\./g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function splitInstallments(
  totalCents: number,
  count: number,
  firstDate: string,
): Installment[] {
  const n = Math.max(1, Math.floor(count));
  const part = Math.floor(totalCents / n);
  const rest = totalCents - part * n;
  return Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    date: addMonths(firstDate, i),
    cents: part + (i === 0 ? rest : 0),
  }));
}

/** Valor em centavos para edição em campo de texto: 123456 -> "1234,56". */
export const centsInput = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");
