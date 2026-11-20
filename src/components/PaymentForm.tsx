import { useId, useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import { useAction, useStudio } from "../hooks/useStudio";
import { availableBenefits } from "../domain/loyalty";
import {
  centsInput,
  money,
  parseCents,
  splitInstallments,
} from "../domain/money";
import { dateOffset } from "../mocks/studio";
import { studio } from "../services/studio";
import {
  paymentMethods,
  type Payment,
  type PaymentMethod,
} from "../types/studio";

export function PaymentForm({
  clientId: fixedClient,
  sessionId,
  quoteId,
  kind,
  defaultGrossCents,
  defaultDepositCents,
  close,
}: {
  clientId?: string;
  sessionId?: string;
  quoteId?: string;
  kind: Payment["kind"];
  defaultGrossCents: number;
  defaultDepositCents: number;
  close: () => void;
}) {
  const data = useStudio().data;
  const action = useAction();
  const prefix = useId();
  const today = dateOffset();
  const [clientId, setClientId] = useState(fixedClient ?? "");
  const [gross, setGross] = useState(
    defaultGrossCents ? centsInput(defaultGrossCents) : "",
  );
  const [deposit, setDeposit] = useState(centsInput(defaultDepositCents));
  const [discount, setDiscount] = useState("");
  const [code, setCode] = useState("");
  const [pctInput, setPctInput] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Pix");
  const [count, setCount] = useState("1");
  const [day, setDay] = useState(today);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  const benefits = clientId ? availableBenefits(data, clientId, today) : [];
  const benefit = discount.startsWith("b:")
    ? benefits.find((b) => b.id === discount.slice(2))
    : undefined;
  const coupon =
    discount === "cupom"
      ? data.coupons.find((c) => c.code === code.trim().toUpperCase())
      : undefined;
  const defaultPct = benefit?.pct ?? coupon?.pct ?? 0;
  const pct = discount ? Number(pctInput ?? defaultPct) || 0 : 0;
  const grossCents = parseCents(gross || "0");
  const depositCents = kind === "Sinal" ? 0 : parseCents(deposit || "0");
  const discountCents = Number.isFinite(grossCents)
    ? Math.round((grossCents * pct) / 100)
    : 0;
  const netCents = grossCents - discountCents - depositCents;
  const installments = method === "Crédito" ? Number(count) : 1;
  const parts =
    netCents > 0 ? splitInstallments(netCents, installments, day) : [];
  const field = (name: string) => prefix + name;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!clientId) return setError("Selecione o cliente.");
    if (!(grossCents > 0)) return setError("Informe o valor total.");
    if (!Number.isFinite(depositCents) || depositCents < 0)
      return setError("Informe um sinal válido.");
    if (discount === "manual" && !reason.trim())
      return setError("Informe o motivo do desconto.");
    setBusy(true);
    try {
      await action.mutateAsync({
        run: () =>
          studio.pay({
            clientId,
            sessionId,
            quoteId,
            kind,
            date: day,
            grossCents,
            depositCents,
            method,
            installments,
            benefitId: benefit?.id,
            couponCode: discount === "cupom" ? code : undefined,
            manualPct: discount ? pct : undefined,
            discountReason: discount === "manual" ? reason : undefined,
          }),
        message: "Pagamento registrado.",
      });
      close();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="payment-form" noValidate onSubmit={submit}>
      {!fixedClient && (
        <label className="field" htmlFor={field("client")}>
          Cliente
          <select
            id={field("client")}
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setDiscount("");
            }}
          >
            <option value="">Selecione um cliente</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-grid">
        <label className="field" htmlFor={field("gross")}>
          Valor total
          <input
            id={field("gross")}
            inputMode="decimal"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
          />
        </label>
        {kind === "Atendimento" && (
          <label className="field" htmlFor={field("deposit")}>
            Sinal já pago
            <input
              id={field("deposit")}
              inputMode="decimal"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </label>
        )}
        {kind === "Atendimento" && (
          <label className="field" htmlFor={field("discount")}>
            Desconto
            <select
              id={field("discount")}
              value={discount}
              onChange={(e) => {
                setDiscount(e.target.value);
                setPctInput(null);
              }}
            >
              <option value="">Nenhum</option>
              {benefits.map((b) => (
                <option key={b.id} value={"b:" + b.id}>
                  {b.type} · {b.label} ({b.pct}%)
                </option>
              ))}
              <option value="cupom">Cupom</option>
              <option value="manual">Desconto manual</option>
            </select>
          </label>
        )}
        {discount === "cupom" && (
          <label className="field" htmlFor={field("code")}>
            Código do cupom
            <input
              id={field("code")}
              autoCapitalize="characters"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setPctInput(null);
              }}
            />
          </label>
        )}
        {discount && (
          <label className="field" htmlFor={field("pct")}>
            % do desconto
            <input
              id={field("pct")}
              type="number"
              min={0}
              max={100}
              value={pctInput ?? String(defaultPct)}
              onChange={(e) => setPctInput(e.target.value)}
            />
          </label>
        )}
        {discount === "manual" && (
          <label className="field" htmlFor={field("reason")}>
            Motivo
            <input
              id={field("reason")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        <label className="field" htmlFor={field("method")}>
          Forma de pagamento
          <select
            id={field("method")}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {paymentMethods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        {method === "Crédito" && (
          <label className="field" htmlFor={field("count")}>
            Parcelas
            <select
              id={field("count")}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={String(i + 1)}>
                  {i + 1}x
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field" htmlFor={field("date")}>
          Data
          <input
            id={field("date")}
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
      </div>
      <div className="payment-summary" aria-live="polite">
        {Number.isFinite(netCents) && grossCents > 0 ? (
          <>
            <p>
              {money(grossCents)}
              {discountCents > 0 && ` − desconto ${money(discountCents)}`}
              {depositCents > 0 && ` − sinal ${money(depositCents)}`}
            </p>
            <strong>a pagar {money(Math.max(netCents, 0))}</strong>
            {parts.length > 1 && (
              <small>
                {parts.length}x de {money(parts[0].cents)}
              </small>
            )}
          </>
        ) : (
          <p className="muted">Informe o valor total.</p>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <Button type="button" onClick={close}>
          Cancelar
        </Button>
        <Button variant="default" type="submit" disabled={busy}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
