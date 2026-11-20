import { describe, expect, it } from "vitest";
import { adjustStock, lowStock, purchase } from "../../domain/stock";
import { emptyStudio, newId } from "./fixtures";

function studio() {
  const d = emptyStudio();
  d.stock.push({
    id: "i1",
    name: "Luvas",
    unit: "cx",
    qty: 10,
    min: 3,
    lastCostCents: 0,
    movements: [],
  });
  return d;
}

describe("estoque", () => {
  it("registra compra como entrada e despesa", () => {
    const d = studio();
    const expense = purchase(d, "i1", 5, 25000, "2026-11-20", newId);
    expect(d.stock[0]).toMatchObject({ qty: 15, lastCostCents: 5000 });
    expect(expense).toMatchObject({
      cents: 25000,
      category: "Material",
      stockItemId: "i1",
      description: "Compra: Luvas (5 cx)",
    });
    expect(d.expenses).toContain(expense);
  });
  it("ajusta pela contagem e registra a diferença", () => {
    const d = studio();
    adjustStock(d, "i1", 7, "Contagem", "2026-11-20");
    expect(d.stock[0].qty).toBe(7);
    expect(d.stock[0].movements[0]).toMatchObject({ kind: "Ajuste", qty: -3 });
  });
  it("aponta itens no mínimo ou abaixo", () => {
    const d = studio();
    adjustStock(d, "i1", 3, "", "2026-11-20");
    expect(lowStock(d).map((i) => i.id)).toEqual(["i1"]);
  });
  it("recusa compra sem quantidade", () => {
    expect(() => purchase(studio(), "i1", 0, 100, "2026-11-20", newId)).toThrow(
      "Informe uma quantidade maior que zero.",
    );
  });
});
