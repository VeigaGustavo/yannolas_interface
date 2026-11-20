import type { Expense, StockItem, StudioData } from "../types/studio";

function item(data: StudioData, id: string): StockItem {
  const found = data.stock.find((i) => i.id === id);
  if (!found) throw new Error("Item de estoque não encontrado.");
  return found;
}

export function purchase(
  data: StudioData,
  itemId: string,
  qty: number,
  totalCents: number,
  date: string,
  newId: () => string = () => crypto.randomUUID(),
): Expense {
  const target = item(data, itemId);
  if (!(qty > 0)) throw new Error("Informe uma quantidade maior que zero.");
  if (!(totalCents >= 0)) throw new Error("Informe o valor da compra.");
  target.qty += qty;
  target.lastCostCents = Math.round(totalCents / qty);
  target.movements.unshift({ at: date, kind: "Compra", qty, note: "" });
  const expense: Expense = {
    id: newId(),
    date,
    category: "Material",
    description: `Compra: ${target.name} (${qty} ${target.unit})`,
    cents: totalCents,
    stockItemId: target.id,
  };
  data.expenses.unshift(expense);
  return expense;
}

export function adjustStock(
  data: StudioData,
  itemId: string,
  newQty: number,
  note: string,
  date: string,
) {
  const target = item(data, itemId);
  if (!(newQty >= 0)) throw new Error("A quantidade não pode ser negativa.");
  target.movements.unshift({
    at: date,
    kind: "Ajuste",
    qty: newQty - target.qty,
    note,
  });
  target.qty = newQty;
}

export const lowStock = (data: StudioData) =>
  data.stock.filter((i) => i.qty <= i.min);
