import { useId, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { z } from "zod";
import { Modal } from "../components/Modal";
import { Badge, Data, Empty, Page } from "../components/Page";
import { Editor } from "../components/Editor";
import { Tabs } from "../components/Tabs";
import { Button } from "../components/ui/button";
import { benefitStatus, referralRanking } from "../domain/loyalty";
import { addDays } from "../domain/money";
import { useAction } from "../hooks/useStudio";
import { dateOffset, shortDate } from "../mocks/studio";
import { date, number, required } from "../schemas/forms";
import { id, studio } from "../services/studio";
import { benefitTypes, type Promotion, type StudioData } from "../types/studio";

const tabs = [
  "Benefícios",
  "Cupons",
  "Promoções e sorteios",
  "Indicações",
] as const;
type Tab = (typeof tabs)[number];
const statuses = ["Disponível", "Pendente", "Usado", "Vencido"] as const;
const couponSchema = z.object({
  code: required.regex(/^[A-Za-z0-9-]+$/, "Use letras, números ou hífen"),
  pct: number(1, 100),
  validUntil: date,
  maxUses: number(1, 100000),
});

function PromotionForm({
  data,
  close,
}: {
  data: StudioData;
  close: () => void;
}) {
  const prefix = useId();
  const action = useAction();
  const [name, setName] = useState("");
  const [type, setType] = useState<Promotion["type"]>("Promoção");
  const [pct, setPct] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState(addDays(dateOffset(), 30));
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const value = pct ?? String(data.settings.benefitPct[type]);
  const found = data.clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome.");
    const n = Number(value);
    if (!(n > 0 && n <= 100)) return setError("Informe um % entre 1 e 100.");
    if (!chosen.length) return setError("Escolha ao menos um cliente.");
    setBusy(true);
    try {
      await action.mutateAsync({
        run: () =>
          studio.createPromotion(
            { id: id(), name: name.trim(), type, pct: n, validUntil },
            chosen,
          ),
        message: type + " criada.",
      });
      close();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <form className="payment-form" noValidate onSubmit={submit}>
      <div className="form-grid">
        <div className="field wide">
          <label htmlFor={prefix + "name"}>Nome</label>
          <input
            id={prefix + "name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={prefix + "type"}>Tipo</label>
          <select
            id={prefix + "type"}
            value={type}
            onChange={(e) => {
              setType(e.target.value as Promotion["type"]);
              setPct(null);
            }}
          >
            <option>Promoção</option>
            <option>Sorteio</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={prefix + "pct"}>% de desconto</label>
          <input
            id={prefix + "pct"}
            type="number"
            value={value}
            onChange={(e) => setPct(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={prefix + "valid"}>Validade</label>
          <input
            id={prefix + "valid"}
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>
      <fieldset className="client-picker">
        <legend>Clientes contemplados ({chosen.length})</legend>
        <input
          aria-label="Buscar clientes"
          placeholder="Buscar clientes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="client-picker-list">
          {found.map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={chosen.includes(c.id)}
                onChange={(e) =>
                  setChosen((list) =>
                    e.target.checked
                      ? [...list, c.id]
                      : list.filter((x) => x !== c.id),
                  )
                }
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
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

function LoyaltyView({ data }: { data: StudioData }) {
  const today = dateOffset();
  const action = useAction();
  const [tab, setTab] = useState<Tab>("Benefícios");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [panel, setPanel] = useState<"" | "coupon" | "promotion">("");
  const name = (cid?: string) =>
    data.clients.find((c) => c.id === cid)?.name ?? "Cliente";
  const benefits = data.benefits.filter(
    (b) =>
      (!status || benefitStatus(b, today) === status) &&
      (!type || b.type === type),
  );
  const ranking = referralRanking(data);
  return (
    <Page
      title="Fidelidade"
      description="Indicações, cupons, promoções, sorteios e descontos dos clientes."
    >
      <Tabs
        label="Seções da fidelidade"
        tabs={tabs}
        value={tab}
        onChange={setTab}
      />
      {tab === "Benefícios" && (
        <>
          <div className="toolbar">
            <select
              aria-label="Filtrar por status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar por tipo"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              {benefitTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {benefits.length ? (
            <ul className="plain-list">
              {benefits.map((b) => (
                <li key={b.id}>
                  <div>
                    <strong>{name(b.clientId)}</strong>
                    <small>
                      {b.type} · {b.label}
                      {b.validUntil && ` · até ${shortDate(b.validUntil)}`}
                    </small>
                  </div>
                  <div className="row-end">
                    <Badge>{b.pct}%</Badge>
                    <Badge
                      tone={
                        benefitStatus(b, today) === "Disponível" ? "green" : ""
                      }
                    >
                      {benefitStatus(b, today)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum benefício encontrado.</Empty>
          )}
        </>
      )}
      {tab === "Cupons" && (
        <>
          <div className="toolbar">
            <Button onClick={() => setPanel("coupon")}>
              <Plus size={16} /> Novo cupom
            </Button>
          </div>
          {data.coupons.length ? (
            <ul className="plain-list">
              {data.coupons.map((c) => (
                <li key={c.id}>
                  <div>
                    <strong>{c.code}</strong>
                    <small>
                      Até {shortDate(c.validUntil)} · {c.uses}/{c.maxUses} usos
                    </small>
                  </div>
                  <div className="row-end">
                    <Badge>{c.pct}%</Badge>
                    {c.validUntil < today ? (
                      <Badge>Vencido</Badge>
                    ) : c.uses >= c.maxUses ? (
                      <Badge>Esgotado</Badge>
                    ) : (
                      <Badge tone="green">Ativo</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum cupom cadastrado.</Empty>
          )}
        </>
      )}
      {tab === "Promoções e sorteios" && (
        <>
          <div className="toolbar">
            <Button onClick={() => setPanel("promotion")}>
              <Plus size={16} /> Nova promoção
            </Button>
          </div>
          {data.promotions.length ? (
            <ul className="plain-list">
              {data.promotions.map((p) => {
                const list = data.benefits.filter(
                  (b) => b.promotionId === p.id,
                );
                return (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.type} · até {shortDate(p.validUntil)} ·{" "}
                        {list.map((b) => name(b.clientId)).join(", ")}
                      </small>
                    </div>
                    <Badge>{p.pct}%</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Nenhuma promoção cadastrada.</Empty>
          )}
        </>
      )}
      {tab === "Indicações" &&
        (ranking.length ? (
          <ol className="plain-list">
            {ranking.map(({ clientId, count }) => (
              <li key={clientId}>
                <div>
                  <strong>{name(clientId)}</strong>
                  <small>
                    {data.clients
                      .filter((c) => c.referredBy === clientId)
                      .map((c) => {
                        const b = data.benefits.find(
                          (x) =>
                            x.type === "Indicação" && x.sourceClientId === c.id,
                        );
                        return (
                          c.name + (b ? ` (${benefitStatus(b, today)})` : "")
                        );
                      })
                      .join(", ")}
                  </small>
                </div>
                <Badge>
                  {count} {count === 1 ? "indicação" : "indicações"}
                </Badge>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>Nenhuma indicação registrada.</Empty>
        ))}
      {panel === "coupon" && (
        <Modal title="Novo cupom" close={() => setPanel("")}>
          <Editor
            fields={[
              { name: "code", label: "Código" },
              { name: "pct", label: "% de desconto", type: "number" },
              { name: "validUntil", label: "Validade", type: "date" },
              { name: "maxUses", label: "Limite de usos", type: "number" },
            ]}
            values={{
              code: "",
              pct: String(data.settings.benefitPct.Cupom),
              validUntil: addDays(today, 30),
              maxUses: "50",
            }}
            schema={couponSchema}
            close={() => setPanel("")}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.saveCoupon({
                    id: id(),
                    code: v.code,
                    pct: Number(v.pct),
                    validUntil: v.validUntil,
                    maxUses: Number(v.maxUses),
                    uses: 0,
                  }),
                message: "Cupom criado.",
              })
            }
          />
        </Modal>
      )}
      {panel === "promotion" && (
        <Modal title="Nova promoção" close={() => setPanel("")}>
          <PromotionForm data={data} close={() => setPanel("")} />
        </Modal>
      )}
    </Page>
  );
}
export default function Loyalty() {
  return <Data>{(data) => <LoyaltyView data={data} />}</Data>;
}
