import { Modal } from "../components/Modal";
import { useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor, fileAccept, fileData, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { clientOptions, quoteStatuses } from "../features/studioFields";
import { useAction, useTenant } from "../hooks/useStudio";
import { PaymentForm } from "../components/PaymentForm";
import { centsInput, parseCents } from "../domain/money";
import { dateOffset, money, shortDate } from "../mocks/studio";
import { date, required } from "../schemas/forms";
import { id, studio } from "../services/studio";
import type { Quote, StudioData } from "../types/studio";
const reais = (min: number) =>
  required.refine((v) => parseCents(v) >= min, "Informe um valor válido");
const makeSchema = (fields: { name: string }[]) =>
  z
    .object({
      clientId: required,
      description: required,
      ...Object.fromEntries(fields.map((f) => [f.name, z.string()])),
      value: reais(1),
      deposit: reais(0),
      validUntil: date,
      status: z.enum(quoteStatuses),
    })
    .refine((v) => parseCents(v.deposit) <= parseCents(v.value), {
      path: ["deposit"],
      message: "O sinal deve ser menor ou igual ao total.",
    });
function QuoteForm({
  data,
  quote,
  clientId,
  close,
}: {
  data: StudioData;
  quote?: Quote;
  clientId: string;
  close: () => void;
}) {
  const [reference, setReference] = useState(
    quote?.reference ||
      data.clients.find((c) => c.id === clientId)?.references[0] ||
      "",
  );
  const [error, setError] = useState("");
  const action = useAction();
  const tenant = useTenant();
  const fields = tenant.quoteFields;
  return (
    <Editor
      fields={[
        {
          name: "clientId",
          label: "Cliente",
          options: clientOptions(data.clients),
          wide: true,
        },
        {
          name: "description",
          label: "Descrição do projeto",
          type: "textarea",
          wide: true,
        },
        ...fields,
        { name: "value", label: "Valor estimado (R$)" },
        { name: "deposit", label: "Sinal (R$)" },
        { name: "validUntil", label: "Validade", type: "date" },
        { name: "status", label: "Status", options: options(quoteStatuses) },
      ]}
      values={
        quote
          ? {
              clientId: quote.clientId,
              description: quote.description,
              ...Object.fromEntries(
                fields.map((f) => [f.name, quote.details[f.name] ?? ""]),
              ),
              value: centsInput(quote.valueCents),
              deposit: centsInput(quote.depositCents),
              validUntil: quote.validUntil,
              status: quote.status,
            }
          : {
              clientId,
              description:
                data.clients.find((c) => c.id === clientId)?.project || "",
              ...Object.fromEntries(fields.map((f) => [f.name, ""])),
              value: "",
              deposit: centsInput(15000),
              validUntil: dateOffset(14),
              status: "Rascunho",
            }
      }
      schema={makeSchema(fields)}
      extra={
        <div className="wide stack">
          <label className="field">
            Imagem de referência
            <input
              type="file"
              accept={fileAccept}
              onChange={async (e) => {
                try {
                  setReference(await fileData(e.target.files?.[0]));
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {reference && (
            <div className="inline">
              <img
                className="reference"
                src={reference}
                alt="Referência do orçamento"
              />
              <Button type="button" onClick={() => setReference("")}>
                Remover referência
              </Button>
            </div>
          )}
        </div>
      }
      close={close}
      save={(v) =>
        action.mutateAsync({
          run: () =>
            studio.save("quotes", {
              id: quote?.id || id(),
              clientId: v.clientId,
              description: v.description,
              details: Object.fromEntries(
                fields.map((f) => [f.name, v[f.name]]),
              ),
              valueCents: parseCents(v.value),
              depositCents: parseCents(v.deposit),
              validUntil: v.validUntil,
              status: v.status as Quote["status"],
              reference,
            }),
          message: "Orçamento salvo.",
        })
      }
    />
  );
}
function QuotesView({ data }: { data: StudioData }) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState(false);
  const tenant = useTenant();
  const quote = data.quotes.find((q) => q.id === selected);
  const clientId = params.get("cliente") || "";
  const creating = params.has("novo") || !!clientId;
  const close = () => {
    setParams({});
    setSelected("");
    setEditing(false);
    setPaying(false);
  };
  const clientName = (key: string) =>
    data.clients.find((c) => c.id === key)?.name || "Cliente indisponível";
  const found = data.quotes.filter(
    (q) =>
      (!filter || q.status === filter) &&
      (clientName(q.clientId) + " " + q.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const depositPaid = data.payments.find(
    (p) => p.kind === "Sinal" && p.quoteId === quote?.id,
  );
  const linked = data.sessions.find(
    (s) => s.quoteId === quote?.id && s.status !== "Cancelado",
  );
  return (
    <Page
      title="Orçamentos"
      description={`Prepare propostas, acompanhe aprovações e converta em ${tenant.terms.atendimentos.toLowerCase()}.`}
      actions={
        <Button variant="default" onClick={() => setParams({ novo: "1" })}>
          <Plus size={17} /> Novo orçamento
        </Button>
      }
    >
      <div className="toolbar module-toolbar">
        <input
          value={search}
          aria-label="Buscar orçamentos"
          placeholder="Buscar orçamento"
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          {quoteStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {found.length ? (
        <Card className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente / projeto</th>
                <th>Valor estimado</th>
                <th>Sinal</th>
                <th>Validade</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {found.map((q) => (
                <tr key={q.id}>
                  <td>
                    <strong>{clientName(q.clientId)}</strong>
                    <br />
                    <small>{q.description}</small>
                  </td>
                  <td data-label="Valor">{money(q.valueCents)}</td>
                  <td data-label="Sinal">{money(q.depositCents)}</td>
                  <td data-label="Validade">{shortDate(q.validUntil)}</td>
                  <td>
                    <Badge
                      tone={
                        q.status === "Aprovado"
                          ? "green"
                          : q.status === "Pendente"
                            ? "amber"
                            : ""
                      }
                    >
                      {q.status}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      aria-label={"Ver proposta de " + clientName(q.clientId)}
                      onClick={() => setSelected(q.id)}
                    >
                      <ReceiptText size={15} /> Ver proposta
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Empty>Nenhum orçamento encontrado.</Empty>
      )}
      {(creating || (quote && editing)) && (
        <Modal
          title={creating ? "Novo orçamento" : "Editar orçamento"}
          close={close}
        >
          <QuoteForm
            data={data}
            quote={creating ? undefined : quote}
            clientId={clientId}
            close={close}
          />
        </Modal>
      )}
      {quote && paying && (
        <Modal title="Registrar sinal" close={() => setPaying(false)}>
          <PaymentForm
            clientId={quote.clientId}
            quoteId={quote.id}
            kind="Sinal"
            defaultGrossCents={quote.depositCents}
            defaultDepositCents={0}
            close={() => setPaying(false)}
          />
        </Modal>
      )}
      {quote && !editing && !creating && !paying && (
        <Modal
          title={"Proposta de " + tenant.terms.servico.toLowerCase()}
          close={close}
        >
          <div className="detail-grid">
            <div className="inline">
              <Badge tone={quote.status === "Aprovado" ? "green" : "amber"}>
                {quote.status}
              </Badge>
              <strong>{clientName(quote.clientId)}</strong>
            </div>
            <p>{quote.description}</p>
            <p>{Object.values(quote.details).filter(Boolean).join(" · ")}</p>
            <p>
              <strong>{money(quote.valueCents)}</strong> · Sinal de{" "}
              {money(quote.depositCents)}
            </p>
            <p className="muted">Válido até {shortDate(quote.validUntil)}</p>
            {quote.reference && (
              <img
                className="reference"
                src={quote.reference}
                alt="Referência da proposta"
              />
            )}
            {depositPaid && (
              <p className="muted">
                Sinal pago em {shortDate(depositPaid.date)}.
              </p>
            )}
            <div className="inline wrap">
              <Button onClick={() => setEditing(true)}>Editar orçamento</Button>
              <Button
                disabled={!!depositPaid || quote.depositCents <= 0}
                onClick={() => setPaying(true)}
              >
                Registrar sinal
              </Button>
              {linked ? (
                <Button asChild>
                  <Link to={"/agenda?sessao=" + linked.id}>Ver sessão</Link>
                </Button>
              ) : (
                quote.status === "Aprovado" && (
                  <Button asChild variant="default">
                    <Link to={"/agenda?orcamento=" + quote.id}>
                      Converter em agendamento
                    </Link>
                  </Button>
                )
              )}
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
export default function Quotes() {
  return <Data>{(data) => <QuotesView data={data} />}</Data>;
}
