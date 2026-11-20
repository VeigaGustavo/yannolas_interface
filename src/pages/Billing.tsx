import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { z } from "zod";
import { Modal } from "../components/Modal";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { PaymentForm } from "../components/PaymentForm";
import { Tabs } from "../components/Tabs";
import { Button } from "../components/ui/button";
import { isReceived, monthEntries, monthSummary } from "../domain/billing";
import { addMonths, money, parseCents } from "../domain/money";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { date, required } from "../schemas/forms";
import { id, studio } from "../services/studio";
import {
  expenseCategories,
  paymentMethods,
  type ExpenseCategory,
  type StudioData,
} from "../types/studio";

const tabs = ["Entradas", "Despesas", "Pagamentos"] as const;
type Tab = (typeof tabs)[number];
const expenseSchema = z.object({
  date,
  category: z.enum(expenseCategories),
  description: required,
  value: required.refine((v) => parseCents(v) > 0, "Informe um valor válido"),
});
const monthLabel = (month: string) => {
  const text = new Date(month + "-15T12:00:00").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function BillingView({ data }: { data: StudioData }) {
  const today = dateOffset();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [tab, setTab] = useState<Tab>("Entradas");
  const [method, setMethod] = useState("");
  const [panel, setPanel] = useState<"" | "expense" | "payment">("");
  const action = useAction();
  const summary = monthSummary(data, month, today);
  const entries = monthEntries(data, month).sort((a, b) =>
    a.installment.date.localeCompare(b.installment.date),
  );
  const expenses = data.expenses.filter((e) => e.date.startsWith(month));
  const payments = data.payments.filter(
    (p) => p.date.startsWith(month) && (!method || p.method === method),
  );
  const clientName = (cid: string) =>
    data.clients.find((c) => c.id === cid)?.name ?? "Cliente";
  const shift = (n: number) =>
    setMonth(addMonths(month + "-01", n).slice(0, 7));
  const cards = [
    { label: "Entrou", value: money(summary.inCents) },
    { label: "A receber", value: money(summary.pendingCents) },
    { label: "Saiu", value: money(summary.outCents) },
    { label: "Descontos", value: money(summary.discountCents) },
    { label: "Lucro", value: money(summary.profitCents) },
    { label: "Por indicação", value: String(summary.referrals) },
  ];
  return (
    <Page
      title="Faturamento"
      description="Entradas, parcelas a receber, despesas e lucro do mês."
      actions={
        <Button variant="default" onClick={() => setPanel("payment")}>
          <Plus size={17} /> Novo pagamento
        </Button>
      }
    >
      <div className="month-switch">
        <Button
          className="icon-button"
          aria-label="Mês anterior"
          onClick={() => shift(-1)}
        >
          <ChevronLeft size={17} />
        </Button>
        <h2>{monthLabel(month)}</h2>
        <Button
          className="icon-button"
          aria-label="Próximo mês"
          onClick={() => shift(1)}
        >
          <ChevronRight size={17} />
        </Button>
      </div>
      <div className="summary-grid">
        {cards.map((c) => (
          <section
            key={c.label}
            role="group"
            aria-label={c.label}
            className="summary-card"
          >
            <small>{c.label}</small>
            <strong>{c.value}</strong>
          </section>
        ))}
      </div>
      <Tabs
        label="Seções do faturamento"
        tabs={tabs}
        value={tab}
        onChange={setTab}
      />
      {tab === "Entradas" &&
        (entries.length ? (
          <ul className="plain-list" aria-label="Entradas do mês">
            {entries.map(({ payment, installment }) => {
              const received = isReceived(installment, today);
              return (
                <li key={payment.id + installment.n}>
                  <div>
                    <strong>{clientName(payment.clientId)}</strong>
                    <small>
                      {shortDate(installment.date)} · {payment.method}
                      {payment.installments.length > 1 &&
                        ` · parcela ${installment.n}/${payment.installments.length}`}
                    </small>
                  </div>
                  <div className="row-end">
                    <strong className="amount">
                      {money(installment.cents)}
                    </strong>
                    <Badge tone={received ? "green" : "amber"}>
                      {received ? "Recebida" : "Prevista"}
                    </Badge>
                    <Button
                      variant="ghost"
                      disabled={action.isPending}
                      onClick={() =>
                        action.mutate({
                          run: () =>
                            studio.markInstallment(
                              payment.id,
                              installment.n,
                              !received,
                            ),
                          message: received
                            ? "Parcela marcada como prevista."
                            : "Parcela recebida.",
                        })
                      }
                    >
                      {received ? "Desfazer" : "Marcar como recebida"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>Nenhuma entrada neste mês.</Empty>
        ))}
      {tab === "Despesas" && (
        <>
          <div className="toolbar">
            <Button onClick={() => setPanel("expense")}>
              <Plus size={16} /> Nova despesa
            </Button>
          </div>
          {expenses.length ? (
            <ul className="plain-list" aria-label="Despesas do mês">
              {expenses.map((e) => (
                <li key={e.id}>
                  <div>
                    <strong>{e.description}</strong>
                    <small>
                      {shortDate(e.date)} · {e.category}
                    </small>
                  </div>
                  <strong className="amount">{money(e.cents)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma despesa neste mês.</Empty>
          )}
        </>
      )}
      {tab === "Pagamentos" && (
        <>
          <div className="toolbar">
            <select
              aria-label="Filtrar por forma de pagamento"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="">Todas as formas</option>
              {paymentMethods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          {payments.length ? (
            <ul className="plain-list" aria-label="Pagamentos do mês">
              {payments.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{clientName(p.clientId)}</strong>
                    <small>
                      {p.kind} · {shortDate(p.date)} · {p.method}
                      {p.installments.length > 1 &&
                        ` ${p.installments.length}x`}
                    </small>
                    {p.discountCents > 0 && (
                      <small>
                        Desconto {money(p.discountCents)} · {p.discountReason}
                      </small>
                    )}
                  </div>
                  <strong className="amount">{money(p.netCents)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum pagamento neste mês.</Empty>
          )}
        </>
      )}
      {panel === "payment" && (
        <Modal title="Novo pagamento" close={() => setPanel("")}>
          <PaymentForm
            kind="Atendimento"
            defaultGrossCents={0}
            defaultDepositCents={0}
            close={() => setPanel("")}
          />
        </Modal>
      )}
      {panel === "expense" && (
        <Modal title="Nova despesa" close={() => setPanel("")}>
          <Editor
            fields={[
              { name: "description", label: "Descrição", wide: true },
              {
                name: "category",
                label: "Categoria",
                options: options(expenseCategories),
              },
              { name: "value", label: "Valor (R$)" },
              { name: "date", label: "Data", type: "date" },
            ]}
            values={{
              description: "",
              category: "Outros",
              value: "",
              date: today,
            }}
            schema={expenseSchema}
            close={() => setPanel("")}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.addExpense({
                    id: id(),
                    date: v.date,
                    category: v.category as ExpenseCategory,
                    description: v.description,
                    cents: parseCents(v.value),
                  }),
                message: "Despesa registrada.",
              })
            }
          />
        </Modal>
      )}
    </Page>
  );
}
export default function Billing() {
  return <Data>{(data) => <BillingView data={data} />}</Data>;
}
