import { useState } from "react";
import { History, Plus } from "lucide-react";
import { z } from "zod";
import { Modal } from "../components/Modal";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor } from "../components/Editor";
import { Button } from "../components/ui/button";
import { money, parseCents } from "../domain/money";
import { lowStock } from "../domain/stock";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { date, number, required } from "../schemas/forms";
import { id, studio } from "../services/studio";
import type { StockItem, StudioData } from "../types/studio";

const purchaseSchema = z.object({
  qty: number(0.001),
  total: required.refine((v) => parseCents(v) >= 0, "Informe um valor válido"),
  date,
});
const adjustSchema = z.object({ qty: number(0), note: z.string() });
const itemSchema = z.object({
  name: required,
  unit: required,
  qty: number(0),
  min: number(0),
});
type Panel = "" | "purchase" | "adjust" | "new" | "history";

function StockView({ data }: { data: StudioData }) {
  const action = useAction();
  const [panel, setPanel] = useState<Panel>("");
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [search, setSearch] = useState("");
  const low = new Set(lowStock(data).map((i) => i.id));
  const items = data.stock
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort(
      (a, b) =>
        Number(low.has(b.id)) - Number(low.has(a.id)) ||
        a.name.localeCompare(b.name),
    );
  const openPanel = (p: Panel, item: StockItem | null = null) => {
    setSelected(item);
    setPanel(p);
  };
  const close = () => openPanel("");
  const current = data.stock.find((i) => i.id === selected?.id) ?? selected;
  return (
    <Page
      title="Estoque"
      description="Materiais, compras e contagens. Compras entram como despesa no faturamento."
      actions={
        <Button variant="default" onClick={() => openPanel("new")}>
          <Plus size={17} /> Novo item
        </Button>
      }
    >
      <div className="toolbar">
        <input
          aria-label="Buscar itens"
          placeholder="Buscar itens"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {low.size > 0 && (
          <Badge tone="amber">{low.size} com estoque baixo</Badge>
        )}
      </div>
      {items.length ? (
        <div className="followup-list">
          {items.map((i) => (
            <article key={i.id} className="followup-card" aria-label={i.name}>
              <div className="followup-head">
                <div>
                  <strong>{i.name}</strong>
                  <small>
                    Mínimo {i.min} {i.unit} · último custo{" "}
                    {money(i.lastCostCents)}
                  </small>
                </div>
                <strong className="stock-qty">
                  {i.qty} {i.unit}
                </strong>
              </div>
              {low.has(i.id) && <Badge tone="amber">Estoque baixo</Badge>}
              <div className="inline wrap">
                <Button onClick={() => openPanel("purchase", i)}>
                  Registrar compra
                </Button>
                <Button onClick={() => openPanel("adjust", i)}>
                  Ajustar contagem
                </Button>
                <Button variant="ghost" onClick={() => openPanel("history", i)}>
                  <History size={15} /> Movimentos
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty>Nenhum item cadastrado.</Empty>
      )}
      {panel === "purchase" && current && (
        <Modal title="Registrar compra" close={close}>
          <p className="muted">{current.name}</p>
          <Editor
            fields={[
              { name: "qty", label: "Quantidade", type: "number" },
              { name: "total", label: "Valor total (R$)" },
              { name: "date", label: "Data", type: "date" },
            ]}
            values={{ qty: "", total: "", date: dateOffset() }}
            schema={purchaseSchema}
            close={close}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.purchase(
                    current.id,
                    Number(v.qty),
                    parseCents(v.total),
                    v.date,
                  ),
                message: "Compra registrada e lançada como despesa.",
              })
            }
          />
        </Modal>
      )}
      {panel === "adjust" && current && (
        <Modal title="Ajustar contagem" close={close}>
          <p className="muted">
            {current.name} · atual {current.qty} {current.unit}
          </p>
          <Editor
            fields={[
              { name: "qty", label: "Nova quantidade", type: "number" },
              { name: "note", label: "Nota", wide: true },
            ]}
            values={{ qty: String(current.qty), note: "Contagem" }}
            schema={adjustSchema}
            close={close}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.adjustStock(current.id, Number(v.qty), v.note),
                message: "Contagem atualizada.",
              })
            }
          />
        </Modal>
      )}
      {panel === "new" && (
        <Modal title="Novo item" close={close}>
          <Editor
            fields={[
              { name: "name", label: "Nome", wide: true },
              { name: "unit", label: "Unidade (un, ml, cx…)" },
              { name: "qty", label: "Quantidade atual", type: "number" },
              { name: "min", label: "Mínimo para alerta", type: "number" },
            ]}
            values={{ name: "", unit: "un", qty: "0", min: "1" }}
            schema={itemSchema}
            close={close}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.saveStockItem({
                    id: id(),
                    name: v.name.trim(),
                    unit: v.unit.trim(),
                    qty: Number(v.qty),
                    min: Number(v.min),
                    lastCostCents: 0,
                    movements: [],
                  }),
                message: "Item cadastrado.",
              })
            }
          />
        </Modal>
      )}
      {panel === "history" && current && (
        <Modal title={"Movimentos · " + current.name} close={close}>
          {current.movements.length ? (
            <ul className="timeline">
              {current.movements.map((m, i) => (
                <li key={i}>
                  {shortDate(m.at)} · {m.kind} {m.qty > 0 ? "+" : ""}
                  {m.qty} {current.unit}
                  {m.note && ` — ${m.note}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhum movimento registrado.</p>
          )}
        </Modal>
      )}
    </Page>
  );
}
export default function Stock() {
  return <Data>{(data) => <StockView data={data} />}</Data>;
}
