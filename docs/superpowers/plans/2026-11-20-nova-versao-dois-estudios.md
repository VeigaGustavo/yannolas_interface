# Nova versão com dois estúdios: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIO: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** transformar o protótipo do Yannis Tattoo num painel estático, mobile-first, para dois estúdios isolados (Yannis Tattoo e uma clínica de biomedicina estética). O painel cobre login simulado, CRM com financeiro e fidelidade, agenda, orçamentos, follow-up por eventos, faturamento, fidelidade/descontos e estoque manual. A IA, o atendimento, as campanhas e o pós-atendimento saem.

**Arquitetura:**

- As regras de negócio ficam em funções puras em `src/domain/`. Elas recebem `StudioData` e `today: string` (`YYYY-MM-DD`) e são testadas sem React.
- `src/services/studio.ts` continua sendo o único ponto de I/O. Ele carrega os dados do estúdio da sessão, aplica a regra de domínio e grava tudo numa escrita só, na chave `localStorage` daquele estúdio.
- A marca, o vocabulário e os campos de cada estúdio vêm de `src/tenants.ts`.

**Stack:** Vite 8, React 19, TypeScript 6, Tailwind 4, React Router 7 (HashRouter), React Hook Form + Zod 4, TanStack Query 5, Zustand 5, Vitest 5 + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-20-nova-versao-dois-estudios-design.md`. Leia a spec antes de qualquer tarefa.

## Restrições globais

- Deploy estático pelo `.github/workflows/deploy.yml`, sem alterações. `npm run lint`, `npm run test` e `npm run build` devem passar ao fim de cada tarefa.
- Nenhuma dependência nova.
- Os dados ficam no `localStorage`. Chaves:
  - dados: `studio-data-v3-<tenantId>`;
  - sessão: `studio-session-v3`;
  - interface: `studio-ui-v3`.
  - As chaves `v2` são ignoradas e não há migração.
- `tenantId` é `"yannis" | "lumi"`.
- Dinheiro é sempre um inteiro em centavos (`...Cents`). A formatação usa `money(cents)`.
- Todas as query keys do TanStack Query começam com `["studio", tenantId]`. O cache é limpo (`queryClient.clear()`) ao sair.
- Nenhuma tela pode ter rolagem horizontal em 360 px. Tabelas viram cards abaixo de 640 px.
- Contraste AA nos temas claro e escuro.
- Toda a interface fica em português.
- O texto do aviso de login é exatamente: "Protótipo: os dados ficam neste navegador e o login não é seguro."
- Contas demo:
  - `yannis@demo.app` / `demo123` → `yannis`;
  - `lumi@demo.app` / `demo123` → `lumi`.
- Valores padrão de follow-up:
  - orçamento sem resposta: 3 dias;
  - pós-atendimento: 1 dia;
  - inativo: 180 dias;
  - aniversário: 7 dias antes;
  - nova tentativa: 3 dias;
  - máximo de 3 tentativas.
- Retorno por procedimento: Yannis `Tatuagem` 30 dias (retoque). Lumi `Toxina botulínica` 120, `Preenchimento` 270, `Bioestimulador` 180, `Limpeza de pele` 30.
- % padrão dos benefícios: Indicação 10, Promoção 10, Sorteio 15, Cupom 10, Aniversário 10. O cupom de aniversário vale 30 dias.
- O desconto incide sobre o **valor total**, e o sinal é abatido depois: `net = gross − discount − deposit`. Um único desconto por pagamento.
- O benefício de indicação só é liberado com o primeiro pagamento `kind: "Atendimento"` do indicado. O sinal não conta.
- Faturamento em regime de caixa. Uma parcela está recebida se `received === true`, ou se `received` for `undefined` e `date <= today`.

## Foco de revisão

1. **Troca de conta sem recarregar a página:** sair do Yannis e entrar na Lumi nunca mostra, nem por um instante, dados do Yannis. Teste na Tarefa 6.
2. **Arredondamento das parcelas:** R$ 100,00 em 3x gera 3334 + 3333 + 3333, e a soma sempre fecha. Teste na Tarefa 2.
3. **Desconto + sinal maior que o total:** gera um erro com mensagem, nunca um valor negativo. Teste na Tarefa 4.
4. **Cupom vencido, cupom esgotado ou código digitado em minúsculas:** o código é comparado sem diferenciar maiúsculas, e vencido ou esgotado geram erro claro. Teste na Tarefa 4.
5. **Aniversário na virada de ano:** com hoje em 30/12 e aniversário em 03/01, o follow-up é gerado. Um 29/02 em ano não bissexto vira 28/02. Teste na Tarefa 3.
6. **Pagamento registrado duas vezes (duplo clique):** só pode existir um pagamento `Atendimento` por `sessionId`; o segundo gera erro. Teste na Tarefa 4.

---

## Mapa de arquivos

| Arquivo                                                                          | Responsabilidade                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/types/studio.ts`                                                            | Entidades e `StudioData` (reescrito)                             |
| `src/domain/money.ts`                                                            | `money`, `parseCents`, `splitInstallments`                       |
| `src/domain/billing.ts`                                                          | Recebimento de parcelas, resumo mensal, despesas                 |
| `src/domain/loyalty.ts`                                                          | Benefícios, cupons, promoções, indicação, `registerPayment`      |
| `src/domain/followups.ts`                                                        | Criação por evento, deduplicação, etapas, varredura por tempo    |
| `src/domain/stock.ts`                                                            | Compra, ajuste, estoque baixo                                    |
| `src/tenants.ts`                                                                 | Marca, vocabulário, campos e contas demo por estúdio             |
| `src/stores/session.ts`                                                          | Sessão (`tenantId`), login e logout                              |
| `src/stores/interface.ts`                                                        | Tema e destaque por estúdio (chave v3)                           |
| `src/mocks/studio.ts`                                                            | Helpers de data e `seed(tenantId)`                               |
| `src/mocks/yannis.ts`, `src/mocks/lumi.ts`                                       | Bases fictícias de cada estúdio                                  |
| `src/services/studio.ts`                                                         | I/O por estúdio e operações que chamam o domínio                 |
| `src/hooks/useStudio.ts`                                                         | Query e mutação com chave por estúdio, e `useTenant()`           |
| `src/components/Layout.tsx`                                                      | Sidebar no desktop, barra inferior e folha "Mais" no celular     |
| `src/components/PaymentForm.tsx`                                                 | Formulário de pagamento reutilizado em Agenda, CRM e Faturamento |
| `src/pages/Login.tsx`, `FollowUp.tsx`, `Billing.tsx`, `Loyalty.tsx`, `Stock.tsx` | Telas novas                                                      |
| `src/pages/Dashboard.tsx`, `CRM.tsx`, `Agenda.tsx`, `Quotes.tsx`, `Settings.tsx` | Telas modificadas                                                |
| `src/tests/domain/*.test.ts`                                                     | Testes das regras puras                                          |
| `src/tests/flows.test.tsx`                                                       | Testes de fluxo pela interface                                   |

Saem do projeto: `src/pages/Agent.tsx`, `Inbox.tsx`, `Campaigns.tsx` e `Feedback.tsx`, além de `src/features/AgentSettings.tsx`.

---

### Tarefa 1: Remover IA, Atendimento, Campanhas e Pós-atendimento

**Arquivos:**

- Apagar: `src/pages/Agent.tsx`, `src/pages/Inbox.tsx`, `src/pages/Campaigns.tsx`, `src/pages/Feedback.tsx`, `src/features/AgentSettings.tsx`
- Modificar: `src/App.tsx`, `src/components/Layout.tsx` (itens de `navigation` e o contador de lembretes baseado em `feedback`), `src/types/studio.ts`, `src/services/studio.ts`, `src/mocks/studio.ts`, `src/pages/Settings.tsx` (abas "Agente" e "Integrações"), `src/pages/Dashboard.tsx` (blocos que usam conversas, execuções, campanhas e feedback), `src/tests/flows.test.tsx`

**Interfaces:**

- Produz: um `StudioData` sem `conversations`, `executions`, `campaigns` e `feedback`, e um `Settings` sem `tone`, `knowledge`, `rules`, `tools` e `agent`. O `StudioService` fica sem `send`, `receive`, `read`, `review` e `dispatch`. `InboundMessageEvent`, `Message`, `Conversation`, `Execution`, `Campaign`, `Feedback` e `matchingClients` deixam de existir.

- [ ] **Passo 1:** Em `flows.test.tsx`, apague os testes "simula recebimento…", "aprova o briefing…", "simula uma campanha…", "deduplica um evento…" e "registra uma resposta de satisfação…". Adicione:

```tsx
it("não oferece mais IA, atendimento nem campanhas", async () => {
  open();
  await screen.findByRole("link", { name: "CRM" });
  for (const name of [
    "Agente de IA",
    "Atendimento",
    "Campanhas",
    "Pós-atendimento",
  ])
    expect(screen.queryByRole("link", { name })).toBeNull();
});
```

- [ ] **Passo 2:** Rode `npm run test`. Esperado: o novo teste FALHA (o link "Agente de IA" existe).
- [ ] **Passo 3:** Remova as rotas, as páginas, os tipos, os métodos do serviço, os dados de seed e os blocos de interface listados acima. No `Dashboard`, apague os blocos que dependiam deles; ele será refeito na Tarefa 14.
- [ ] **Passo 4:** Rode `npm run lint && npm run test && npm run build`. Esperado: tudo PASSA.
- [ ] **Passo 5:** Commit: `refactor: remove IA, atendimento, campanhas e pós-atendimento`.

---

### Tarefa 2: Tipos novos, dinheiro e faturamento (domínio)

**Arquivos:**

- Modificar: `src/types/studio.ts`, `src/mocks/studio.ts` (o seed retorna as coleções novas vazias e os `Settings` novos com os valores padrão das Restrições globais)
- Criar: `src/domain/money.ts`, `src/domain/billing.ts`, `src/tests/domain/billing.test.ts`

**Interfaces (produz; usados por todas as tarefas seguintes):**

```ts
// src/types/studio.ts (acréscimos)
export type TenantId = "yannis" | "lumi";
export type PaymentMethod = "Pix" | "Dinheiro" | "Débito" | "Crédito";
export interface Installment {
  n: number;
  date: string;
  cents: number;
  received?: boolean;
}
export interface Payment {
  id: string;
  clientId: string;
  sessionId?: string;
  quoteId?: string;
  kind: "Sinal" | "Atendimento";
  date: string;
  grossCents: number;
  discountCents: number;
  discountReason: string;
  benefitId?: string;
  couponId?: string;
  depositCents: number;
  netCents: number;
  method: PaymentMethod;
  installments: Installment[];
}
export type ExpenseCategory = "Material" | "Aluguel" | "Marketing" | "Outros";
export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  cents: number;
  stockItemId?: string;
}
export type BenefitType =
  "Indicação" | "Promoção" | "Sorteio" | "Cupom" | "Aniversário";
export interface Benefit {
  id: string;
  clientId: string;
  type: BenefitType;
  pct: number;
  label: string;
  status: "Pendente" | "Disponível" | "Usado";
  createdAt: string;
  validUntil?: string;
  sourceClientId?: string;
  promotionId?: string;
  paymentId?: string;
}
export interface Coupon {
  id: string;
  code: string;
  pct: number;
  validUntil: string;
  maxUses: number;
  uses: number;
}
export interface Promotion {
  id: string;
  name: string;
  type: "Promoção" | "Sorteio";
  pct: number;
  validUntil: string;
}
export type FollowUpReason =
  | "Orçamento sem resposta"
  | "Pós-atendimento"
  | "Retorno"
  | "Inativo"
  | "Aniversário"
  | "Indicação"
  | "Manual";
export type FollowUpStage =
  | "A fazer"
  | "Contatado"
  | "Respondeu"
  | "Sem resposta"
  | "Convertido"
  | "Perdido";
export interface FollowUp {
  id: string;
  clientId: string;
  reason: FollowUpReason;
  due: string;
  stage: FollowUpStage;
  attempts: number;
  refId?: string;
  convertedTo?: string;
  rating?: number;
  comment?: string;
  note?: string;
  history: { at: string; stage: FollowUpStage; note: string }[];
}
export interface StockItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  min: number;
  lastCostCents: number;
  movements: {
    at: string;
    kind: "Compra" | "Ajuste";
    qty: number;
    note: string;
  }[];
}
export interface Settings {
  studio: string;
  artist: string;
  hours: string;
  opensAt?: string;
  closesAt?: string;
  policies: string;
  notifications: boolean;
  followUp: {
    quoteDays: number;
    postDays: number;
    inactiveDays: number;
    birthdayDays: number;
    retryDays: number;
    maxAttempts: number;
  };
  procedures: { name: string; returnDays: number }[];
  benefitPct: Record<BenefitType, number>;
  templates: Record<FollowUpReason, string>; // aceita {nome}
}
// StudioData ganha: payments, expenses, benefits, coupons, promotions, followUps, stock
// Client ganha: birthday?: string (YYYY-MM-DD); referredBy?: string
// Session ganha: procedure?: string
```

```ts
// src/domain/money.ts
export function money(cents: number): string; // "R$ 1.234,56"; reexportado por mocks/studio
export function parseCents(input: string): number; // "1.234,56" | "1234.56" | "1234" -> 123456; NaN se inválido
export function splitInstallments(
  totalCents: number,
  count: number,
  firstDate: string,
): Installment[];
// src/domain/billing.ts
export function isReceived(i: Installment, today: string): boolean;
export interface MonthSummary {
  inCents: number;
  pendingCents: number;
  outCents: number;
  discountCents: number;
  profitCents: number;
  referrals: number;
}
export function monthSummary(
  data: StudioData,
  month: string /* YYYY-MM */,
  today: string,
): MonthSummary;
export function monthEntries(
  data: StudioData,
  month: string,
  today: string,
): { payment: Payment; installment: Installment }[];
export function markInstallment(
  data: StudioData,
  paymentId: string,
  n: number,
  received: boolean,
): void;
export function addExpense(data: StudioData, e: Expense): void;
```

Regras do `splitInstallments`:

- a primeira parcela recebe o resto da divisão;
- as datas são mensais a partir de `firstDate`;
- dia 31 vira o último dia do mês.

Regras do `monthSummary`:

- `inCents`: soma das parcelas recebidas com data no mês;
- `pendingCents`: parcelas não recebidas com data no mês;
- `outCents`: despesas do mês;
- `discountCents`: soma do `discountCents` dos pagamentos com `date` no mês;
- `referrals`: clientes distintos com `referredBy` que tiveram o primeiro pagamento `Atendimento` no mês;
- `profitCents = inCents − outCents`.

- [ ] **Passo 1:** Escreva `billing.test.ts` com:
  - `splitInstallments(10000, 3, "2026-01-31")` → cents `[3334, 3333, 3333]`, datas `["2026-01-31", "2026-02-28", "2026-03-31"]`;
  - `parseCents("1.234,56") === 123456`, `parseCents("1234.5") === 123450`, `Number.isNaN(parseCents("abc"))`;
  - `isReceived({date: "2026-11-20", ...}, "2026-11-20") === true`; `received: false` com data passada → `false`;
  - um caso de `monthSummary` com um pagamento Pix de 50000 em 2026-11-05, um crédito de 30000 em 3x a partir de 2026-11-10, desconto 3000 e uma despesa de 12000, com `today = "2026-11-20"`. Esperado: `{ inCents: 60000, pendingCents: 0, outCents: 12000, discountCents: 3000, profitCents: 48000 }`. Para dezembro, `pendingCents: 10000`;
  - **fechamento:** a soma de `monthEntries(...)` filtrada por `isReceived` é igual a `inCents`.
- [ ] **Passo 2:** `npx vitest run src/tests/domain/billing.test.ts`. Esperado: FALHA (módulo inexistente).
- [ ] **Passo 3:** Implemente os tipos, `money.ts` e `billing.ts`. Faça `money` de `mocks/studio.ts` passar a reexportar `money` do domínio, com entrada em centavos. Ajuste os usos atuais de `money` (Quotes e Dashboard) para centavos, multiplicando por 100 provisoriamente até a Tarefa 6.
- [ ] **Passo 4:** `npm run lint && npm run test && npm run build`. Esperado: PASSA.
- [ ] **Passo 5:** Commit: `feat: tipos de faturamento, fidelidade, follow-up e estoque com regras de faturamento`.

---

### Tarefa 3: Follow-up (domínio)

**Arquivos:**

- Criar: `src/domain/followups.ts`, `src/tests/domain/followups.test.ts`

**Interfaces (produz):**

```ts
export const OPEN_STAGES: FollowUpStage[]; // "A fazer", "Contatado", "Respondeu", "Sem resposta"
export function ensureFollowUp(
  data: StudioData,
  input: {
    clientId: string;
    reason: FollowUpReason;
    due: string;
    refId?: string;
  },
  today: string,
  newId?: () => string,
): FollowUp | null;
export function advanceFollowUp(
  data: StudioData,
  id: string,
  stage: FollowUpStage,
  note: string,
  today: string,
  extra?: { rating?: number; comment?: string; convertedTo?: string },
): void;
export function onQuoteSaved(
  data: StudioData,
  quote: Quote,
  previous: Quote | undefined,
  today: string,
): void;
export function onSessionConcluded(
  data: StudioData,
  session: Session,
  today: string,
): void;
export function scanTimeEvents(data: StudioData, today: string): number; // devolve quantos follow-ups criou
export function birthdayCoupon(
  data: StudioData,
  followUpId: string,
  today: string,
): Benefit; // Aniversário, pct = settings.benefitPct.Aniversário, validade +30 dias
export function waLink(
  phone: string,
  template: string,
  clientName: string,
): string; // https://wa.me/55<dígitos>?text=<encodeURIComponent, {nome} = primeiro nome>
export function bucket(
  f: FollowUp,
  today: string,
): "Hoje" | "Atrasados" | "Próximos" | "Fechados";
```

Regras:

- **Sem duplicatas:** o `ensureFollowUp` devolve `null` se já existe um follow-up aberto com o mesmo `clientId` e `reason`. A exceção é `Manual`, que sempre cria. Todo follow-up nasce com `stage: "A fazer"`, `attempts: 0` e uma linha de histórico `"Criado: <reason>"`.
- **Etapas:** `advanceFollowUp` acrescenta `{at: today, stage, note}` ao histórico.
  - Para `"Sem resposta"`: `attempts++`. Se `attempts >= maxAttempts`, vira `Perdido`. Caso contrário, vira `"A fazer"` com `due = today + retryDays`. As duas passagens entram no histórico.
- **Orçamentos:**
  - um orçamento que passa a `Pendente` cria "Orçamento sem resposta" com `due = today + quoteDays` e `refId = quote.id`;
  - se passa a `Aprovado`, o follow-up aberto desse orçamento vira `Convertido` com `convertedTo = quote.id`;
  - se passa a `Recusado`, vira `Perdido`.
- **Atendimento concluído:** cria "Pós-atendimento" (`today + postDays`) e "Retorno". O prazo do retorno vem de `settings.procedures` pelo nome em `session.procedure`, ou do primeiro procedimento se o nome não for encontrado. O `refId` dos dois é `session.id`.
- **Varredura por tempo** (`scanTimeEvents`):
  - **Aniversário:** se o próximo aniversário, considerando a virada de ano e com 29/02 virando 28/02 em ano não bissexto, cai em até `birthdayDays` dias, cria o follow-up com `due` = aniversário − `birthdayDays` (no mínimo `today`) e `refId = "<ano do aniversário>"`. Deduplicado pelo `refId` também entre follow-ups fechados.
  - **Inativo:** se o último atendimento `Concluído` foi há `inactiveDays` dias ou mais e não há atendimento futuro não cancelado, cria "Inativo".

- [ ] **Passo 1:** Escreva `followups.test.ts` com:
  - **Deduplicação:** duas chamadas de `ensureFollowUp` iguais criam 1 follow-up; duas de `Manual` criam 2.
  - **Tentativas:** com `maxAttempts` 3, três "Sem resposta" seguidos terminam em `Perdido` e `attempts === 3`. O primeiro "Sem resposta" resulta em `"A fazer"` com `due = today + 3`.
  - **Orçamento:** `Pendente` cria o follow-up com `due = today + 3`; `Aprovado` o converte.
  - **Retorno na Lumi:** concluir um atendimento com `procedure: "Toxina botulínica"` cria um Retorno com `due = today + 120`.
  - **Virada de ano:** com `today = "2026-12-30"` e aniversário `"1990-01-03"`, cria Aniversário com `refId "2027"`. Uma segunda varredura não cria outro.
  - **Ano não bissexto:** com aniversário `"2000-02-29"` e `today = "2027-02-22"`, o próximo aniversário é `2027-02-28` e o follow-up é criado.
  - **Link do WhatsApp:** `waLink("(63) 99999-1234", "Oi, {nome}!", "Ana Ribeiro") === "https://wa.me/5563999991234?text=Oi%2C%20Ana!"`.
- [ ] **Passo 2:** O teste FALHA.
- [ ] **Passo 3:** Implemente `followups.ts`.
- [ ] **Passo 4:** O teste PASSA. `npm run lint && npm run build`.
- [ ] **Passo 5:** Commit: `feat: regras de follow-up por eventos`.

---

---

### Tarefa 4: Fidelidade e registro de pagamento (domínio)

**Arquivos:**

- Criar: `src/domain/loyalty.ts`, `src/tests/domain/loyalty.test.ts`

**Interfaces:**

- Consome: os tipos e o `splitInstallments` da Tarefa 2, e o `ensureFollowUp` da Tarefa 3.
- Produz:

```ts
export function benefitStatus(
  b: Benefit,
  today: string,
): Benefit["status"] | "Vencido";
export function availableBenefits(
  data: StudioData,
  clientId: string,
  today: string,
): Benefit[];
export function addClientWithReferral(
  data: StudioData,
  client: Client,
  today: string,
): void; // cria benefício Pendente para quem indicou
export function createPromotion(
  data: StudioData,
  p: Promotion,
  clientIds: string[],
  today: string,
): void; // um Benefit Disponível por cliente
export function saveCoupon(data: StudioData, c: Coupon): void; // código único, sem diferenciar maiúsculas
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
  discountReason?: string; // manualPct sobrepõe o % do benefício/cupom
}
export function registerPayment(
  data: StudioData,
  input: PaymentInput,
  today: string,
  newId: () => string,
): Payment;
export function referralRanking(
  data: StudioData,
): { clientId: string; count: number }[];
```

Regras do `registerPayment`. Cada erro lança `Error` com exatamente a mensagem entre aspas:

- `benefitId` e `couponCode` juntos → "Use apenas um desconto por atendimento.";
- benefício de outro cliente, ou que não esteja `Disponível`, ou vencido → "Benefício indisponível.";
- cupom inexistente → "Cupom não encontrado."; vencido → "Cupom vencido."; esgotado (`uses >= maxUses`) → "Cupom esgotado.";
- `kind === "Atendimento"` com `sessionId` que já tem pagamento `Atendimento` → "Este atendimento já foi pago.";
- `discount = Math.round(grossCents * pct / 100)`;
- `net = gross − discount − deposit`; se `net < 0` → "Desconto e sinal passam do valor total.";
- `method !== "Crédito"` força 1 parcela; `installments` aceita de 1 a 12;
- o pagamento grava o benefício como `Usado` com `paymentId`, ou faz `uses++` no cupom;
- o histórico do cliente ganha "`<date> · Pagamento <money(net)> (<method>)`";
- em `Atendimento`, se o cliente tem `referredBy` e este é o primeiro `Atendimento` dele: o benefício `Pendente` com `sourceClientId === clientId` vira `Disponível`, e `ensureFollowUp(data, {clientId: referredBy, reason: "Indicação", due: today, refId: clientId}, today)` é chamado.

- [ ] **Passo 1:** Escreva `loyalty.test.ts` com:
  - **Indicação:** um cliente novo com `referredBy` gera para quem indicou um benefício `Pendente` de 10%. Um pagamento `Sinal` não libera; o primeiro `Atendimento` libera e cria o follow-up "Indicação".
  - **Exemplo da spec:** gross 100000, depósito 20000, cupom 10% → `net === 70000` e `discountCents === 10000`.
  - **Cupom:** com `couponCode: "niver10"` e o código salvo "NIVER10", o cupom é aceito. Vencido, esgotado ou combinado com benefício → as mensagens exatas acima.
  - **Valor negativo:** gross 10000, depósito 9500, cupom 10% → "Desconto e sinal passam do valor total.".
  - **Duplicidade:** o segundo `Atendimento` com o mesmo `sessionId` → "Este atendimento já foi pago.".
  - **Parcelamento:** Pix com `installments: 3` → 1 parcela; Crédito 3x → 3 parcelas que somam `net`.
  - `benefitStatus` com `validUntil < today` → `"Vencido"`.
- [ ] **Passo 2:** `npx vitest run src/tests/domain/loyalty.test.ts`. Esperado: FALHA.
- [ ] **Passo 3:** Implemente `loyalty.ts`.
- [ ] **Passo 4:** Teste PASSA. `npm run lint && npm run build`. Esperado: PASSA.
- [ ] **Passo 5:** Commit: `feat: regras de fidelidade e registro de pagamento`.

---

### Tarefa 5: Estoque (domínio)

**Arquivos:**

- Criar: `src/domain/stock.ts`, `src/tests/domain/stock.test.ts`

**Interfaces (produz):**

```ts
export function purchase(
  data: StudioData,
  itemId: string,
  qty: number,
  totalCents: number,
  date: string,
  newId: () => string,
): Expense;
export function adjustStock(
  data: StudioData,
  itemId: string,
  newQty: number,
  note: string,
  date: string,
): void;
export function lowStock(data: StudioData): StockItem[]; // qty <= min
```

Regras:

- **`purchase`:**
  - exige `qty > 0`, senão lança "Informe uma quantidade maior que zero.";
  - soma `qty` ao estoque;
  - grava `lastCostCents = Math.round(totalCents / qty)`;
  - registra o movimento `Compra`;
  - cria a despesa `Material` com a descrição `"Compra: <nome> (<qty> <unit>)"` e o `stockItemId`.
- **`adjustStock`:**
  - exige `newQty >= 0`;
  - registra o movimento `Ajuste` com `qty = newQty − anterior` e a nota.

- [ ] **Passo 1:** Escreva os testes:
  - comprar 5 un por 25000 → `qty` aumenta 5, `lastCostCents === 5000`, e há uma despesa de 25000 com `stockItemId`;
  - um ajuste de 10 para 7 registra um movimento de −3;
  - `lowStock` inclui um item com `qty === min`;
  - comprar quantidade 0 lança a mensagem exata acima.
- [ ] **Passo 2:** O teste FALHA.
- [ ] **Passo 3:** Implemente `stock.ts`.
- [ ] **Passo 4:** O teste PASSA, e lint e build também.
- [ ] **Passo 5:** Commit: `feat: regras de estoque manual`.

---

### Tarefa 6: Estúdios, sessão, dados por estúdio e serviço

**Arquivos:**

- Criar: `src/tenants.ts`, `src/stores/session.ts`, `src/mocks/yannis.ts`, `src/mocks/lumi.ts`
- Modificar: `src/mocks/studio.ts` (`seed(tenantId)`), `src/types/studio.ts` (`Quote` passa a ser `{ id, clientId, description, details: Record<string,string>, valueCents, depositCents, validUntil, status, reference }`), `src/services/studio.ts`, `src/hooks/useStudio.ts`, `src/stores/interface.ts`, `src/types/studio.ts` (`StudioService`), `src/main.tsx` (expõe o `queryClient`, para o logout usar via `useQueryClient`), `src/tests/flows.test.tsx` (helper `open()` faz login antes)
- Teste: `src/tests/domain/service.test.ts`

**Interfaces (produz):**

```ts
// src/tenants.ts
export interface Tenant {
  id: TenantId;
  name: string;
  professional: string;
  logo?: string;
  mark: string; // texto da marca quando não há logo
  defaultTheme: "dark" | "light";
  defaultAccent: string;
  terms: {
    atendimento: string;
    atendimentos: string;
    servico: string;
    profissional: string;
  };
  quoteFields: { name: string; label: string }[];
  email: string;
  password: string;
}
export const tenants: Record<TenantId, Tenant>;
export function authenticate(email: string, password: string): TenantId | null; // e-mail sem diferenciar maiúsculas/espaços
```

Valores dos estúdios:

|                 | `yannis`                                                                                  | `lumi`                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `name`          | Yannis Tattoo                                                                             | Lumi Estética Avançada                                                                                              |
| `professional`  | Yannis Manolas                                                                            | Dra. Helena Duarte                                                                                                  |
| `logo`          | `brand/yannis-marca.png`                                                                  | (sem logo)                                                                                                          |
| `mark`          | YANNIS \| TATTOO                                                                          | LUMI                                                                                                                |
| tema / destaque | `dark` / `#ff9100`                                                                        | `light` / `#0e7c7b` (verificar AA no texto de destaque e ajustar `--accent-text` se preciso)                        |
| `terms`         | atendimento "Sessão", atendimentos "Sessões", servico "Tatuagem", profissional "Tatuador" | atendimento "Procedimento", atendimentos "Procedimentos", servico "Procedimento estético", profissional "Biomédica" |
| `quoteFields`   | placement "Local do corpo", size "Tamanho", style "Estilo"                                | area "Região tratada", product "Produto", amount "Quantidade (ml/U)"                                                |

```ts
// src/stores/session.ts — zustand persist, chave "studio-session-v3"
interface SessionState {
  tenantId: TenantId | null;
  login(email: string, password: string): boolean;
  logout(): void;
}
export const useSession: UseBoundStore<StoreApi<SessionState>>;
export const currentTenant: () => TenantId; // lança "Sessão expirada." se não houver sessão

// src/stores/interface.ts — chave "studio-ui-v3"
// theme e accent passam a ser Record<TenantId, ...>; setTheme(tenant, t) e setAccent(tenant, a); sem valor salvo, usa os padrões do tenant

// src/services/studio.ts — lê e grava em `studio-data-v3-${currentTenant()}`. Toda mutação faz load → regra de domínio → uma escrita.
export interface StudioService {
  get(): Promise<StudioData>; // roda scanTimeEvents(today) e grava se criou algo
  save<K extends Collection>(key: K, item: Entity<K>): Promise<void>; // mantém validações da agenda; chama onQuoteSaved / onSessionConcluded
  settings(value: Settings): Promise<void>;
  moveClient(id: string, stage: Stage): Promise<void>;
  addClient(client: Client): Promise<void>; // addClientWithReferral
  pay(input: PaymentInput): Promise<Payment>;
  markInstallment(
    paymentId: string,
    n: number,
    received: boolean,
  ): Promise<void>;
  addExpense(e: Expense): Promise<void>;
  advanceFollowUp(
    id: string,
    stage: FollowUpStage,
    note: string,
    extra?: { rating?: number; comment?: string; convertedTo?: string },
  ): Promise<void>;
  addFollowUp(input: {
    clientId: string;
    due: string;
    note: string;
  }): Promise<void>; // Manual
  birthdayCoupon(followUpId: string): Promise<Benefit>;
  createPromotion(p: Promotion, clientIds: string[]): Promise<void>;
  saveCoupon(c: Coupon): Promise<void>;
  purchase(
    itemId: string,
    qty: number,
    totalCents: number,
    date: string,
  ): Promise<void>;
  adjustStock(itemId: string, qty: number, note: string): Promise<void>;
  saveStockItem(item: StockItem): Promise<void>;
}
// src/hooks/useStudio.ts
export const useTenant: () => Tenant; // tenants[useSession().tenantId!]
// useStudio usa queryKey ["studio", tenantId]; useAction invalida ["studio", tenantId]
```

**Seeds.** Cada estúdio tem cerca de 30 clientes fictícios, alguns indicados por outros, com aniversários espalhados (2 nos próximos 7 dias). Inclui também:

- atendimentos passados e futuros, com `procedure`;
- orçamentos com `valueCents`/`depositCents`/`details`;
- pagamentos dos últimos 3 meses (Pix, dinheiro, débito, crédito 3x e 6x) e alguns com benefício;
- despesas mensais (aluguel, material);
- 2 cupons (1 vencido), 1 promoção e 1 sorteio;
- follow-ups em todas as etapas;
- cerca de 8 itens de estoque, 2 abaixo do mínimo.

A base do Yannis aproveita nomes, projetos e Palmas-TO do seed atual. A da Lumi usa os procedimentos da Lumi. Os nomes de clientes dos dois estúdios não se repetem. Os helpers de data (`dateOffset`, `shortDate`, `initials`, `sampleReference`) continuam saindo de `mocks/studio.ts`.

- [ ] **Passo 1:** Escreva o `service.test.ts`:
  - `useSession.getState().login("YANNIS@demo.app ", "demo123") === true`; senha errada → `false`;
  - **isolamento no serviço:** logado como `yannis`, `addClient` de "Teste Isolado"; ao trocar para `lumi`, `get()` não contém esse nome, e a chave `studio-data-v3-lumi` não o contém;
  - sem sessão, `studio.get()` rejeita com "Sessão expirada.".
- [ ] **Passo 2:** Em `flows.test.tsx`, adicione:

```tsx
it("troca de estúdio sem mostrar dados do anterior", async () => {
  const user = open("/crm"); // open() faz login como yannis
  await screen.findByText("Mariana Costa");
  await user.click(screen.getByRole("button", { name: "Sair" }));
  await user.type(await screen.findByLabelText("E-mail"), "lumi@demo.app");
  await user.type(screen.getByLabelText("Senha"), "demo123");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByText("Lumi Estética Avançada");
  expect(screen.queryByText("Mariana Costa")).toBeNull();
});
```

O `open(route, tenant = "yannis")` chama `useSession.getState().login(...)` antes de renderizar. Este teste só passa depois da Tarefa 7. Marque-o com `it.todo` aqui e ative-o na Tarefa 7.

- [ ] **Passo 3:** `npm run test`. Esperado: o `service.test.ts` FALHA.
- [ ] **Passo 4:** Implemente os tenants, a sessão, a store de interface por estúdio, os seeds, o serviço e os hooks. As páginas existentes que usam `quote.value`, `size` e `placement` podem ficar quebradas em tipo até a Tarefa 9 só se o build continuar passando. Caso contrário, faça a adaptação mínima de leitura (`money(q.valueCents)`, `q.details`).
- [ ] **Passo 5:** `npm run lint && npm run test && npm run build`. Esperado: PASSA.
- [ ] **Passo 6:** Commit: `feat: dois estúdios com sessão simulada e dados isolados`.

---

### Tarefa 7: Login, proteção de rotas, marca e navegação mobile

**Arquivos:**

- Criar: `src/pages/Login.tsx`
- Modificar: `src/App.tsx`, `src/components/Layout.tsx`, `src/components/Modal.tsx` (folha inferior abaixo de 640 px), `src/index.css`, `index.html` (título "Painel do estúdio")

**Interfaces:**

- Consome: `useSession`, `useTenant`, `tenants`, `useInterface` (Tarefa 6).
- Produz:
  - a rota `/login`;
  - o `RequireSession`, que envolve o `Layout` e redireciona para `/login` sem sessão;
  - a navegação `navigation`:
    - itens primários: Início `/`, Agenda `/agenda`, Clientes `/crm`, Follow-up `/follow-up`;
    - itens do "Mais": Faturamento `/faturamento`, Fidelidade `/fidelidade`, Estoque `/estoque`, Orçamentos `/orcamentos`, Configurações `/configuracoes`;
  - as rotas novas apontam para páginas placeholder até as Tarefas 10 a 13.

Comportamento:

- **Login:**
  - campos "E-mail" e "Senha", botão "Entrar", aviso exato das Restrições globais e as duas contas demo listadas;
  - erro "E-mail ou senha incorretos.";
  - depois de entrar, redireciona para `/`.
- **Marca e tema:**
  - o `Layout` mostra o logo ou o `mark` e o `name` do tenant;
  - aplica `data-theme` e `--accent` do tenant;
  - atualiza `document.title` para `"<name> | Painel do estúdio"`.
- **Navegação:**
  - abaixo de 900 px: barra inferior fixa com os 4 itens primários e o "Mais", que abre uma folha com os itens secundários e o botão "Sair";
  - a partir de 900 px: a sidebar com todos os itens e "Sair";
  - "Sair" chama `logout()`, `queryClient.clear()` e navega para `/login`.

- [ ] **Passo 1:** Testes de fluxo:
  - sem sessão, `open("/crm", null)` mostra o botão "Entrar";
  - com senha errada, aparece "E-mail ou senha incorretos.";
  - ative o teste de troca de estúdio da Tarefa 6;
  - logado na Lumi, o link "Clientes" existe e o texto "YANNIS | TATTOO" não aparece.
- [ ] **Passo 2:** Os testes FALHAM.
- [ ] **Passo 3:** Implemente.
- [ ] **Passo 4:** `npm run lint && npm run test && npm run build`. Esperado: PASSA.
- [ ] **Passo 5:** Verificação visual com Playwright em 360×740 e 1280×800, nos dois estúdios: login, Início e o "Mais" aberto. O critério é `document.documentElement.scrollWidth <= 360`. Contraste AA no destaque da Lumi.
- [ ] **Passo 6:** Commit: `feat: login simulado, marca por estúdio e navegação mobile`.

---

### Tarefa 8: Clientes (CRM) com abas de financeiro e fidelidade

**Arquivos:**

- Modificar: `src/pages/CRM.tsx`, `src/schemas/forms.ts` (`clientSchema` ganha `birthday` opcional e `referredBy` opcional)

**Interfaces:**

- Consome: `studio.addClient`, `studio.moveClient`, `availableBenefits`, `benefitStatus`, `money`, `useTenant`. Usa também o `PaymentForm` da Tarefa 9; até lá, o botão "Registrar pagamento" da ficha pode ficar desativado.

Comportamento:

- **Lista:** abaixo de 900 px o CRM mostra uma lista com nome, etapa e próximo atendimento; o kanban fica no desktop. O formulário de novo cliente ganha "Aniversário" (data) e "Indicado por" (select de clientes).
- **Ficha:** abas "Dados", "Histórico", "Financeiro" e "Fidelidade".
  - **Financeiro:** pagamentos do cliente com data, valor cheio, desconto e motivo, sinal abatido, valor final, forma e parcelas ("3x de R$ 333,34"), e o total pago.
  - **Fidelidade:** "Indicado por", lista "Indicou" (com o status do benefício de cada indicação), e benefícios agrupados em Disponíveis, Pendentes, Usados e Vencidos.

- [ ] **Passo 1:** Teste de fluxo: criar o cliente "Lia Prado" com "Indicado por" = "Mariana Costa". A aba Fidelidade de Mariana mostra "Lia Prado" com o status "Pendente". A aba Financeiro de um cliente com pagamento mostra a forma e as parcelas.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** Implemente. Mantenha o teste existente "cria, valida e move um lead", ajustando as rotas e os rótulos se for preciso.
- [ ] **Passo 4:** lint, test e build PASSAM.
- [ ] **Passo 5:** Commit: `feat: ficha do cliente com financeiro e fidelidade`.

---

### Tarefa 9: Orçamentos e agenda com vocabulário do estúdio e pagamento

**Arquivos:**

- Criar: `src/components/PaymentForm.tsx`
- Modificar: `src/pages/Quotes.tsx`, `src/pages/Agenda.tsx`, `src/features/studioFields.ts`

**Interfaces:**

- Produz:
  - consome o `Quote` novo da Tarefa 6;
  - o componente:

```tsx
export function PaymentForm(props: {
  clientId: string;
  sessionId?: string;
  quoteId?: string;
  kind: Payment["kind"];
  defaultGrossCents: number;
  defaultDepositCents: number;
  close: () => void;
}): JSX.Element;
```

- **PaymentForm.** Campos: "Valor total", "Sinal já pago", "Desconto", "% do desconto", "Forma de pagamento", "Parcelas" e "Data".
  - "Desconto" é um select com "Nenhum", os benefícios disponíveis do cliente, "Cupom" e "Desconto manual".
  - "% do desconto" vem preenchido e é editável.
  - "Parcelas" só aparece em Crédito, de 1 a 12.
  - "Código do cupom" aparece quando o desconto escolhido é "Cupom". O "Motivo" aparece no desconto manual.
  - Um resumo ao vivo mostra "Total − desconto − sinal = a pagar" e o valor de cada parcela.
  - O envio chama `studio.pay(...)`. Os erros do domínio aparecem como alerta do formulário.
- **Orçamentos:**
  - os campos do formulário vêm de `tenant.quoteFields`;
  - os valores são digitados em reais e convertidos com `parseCents`;
  - a ação "Registrar sinal" abre o `PaymentForm` com `kind: "Sinal"` e `defaultGrossCents = depositCents`. Fica desativada se já existe pagamento Sinal do orçamento.
- **Agenda:**
  - os rótulos usam `tenant.terms`, por exemplo "Novo procedimento" na Lumi;
  - o formulário ganha "Procedimento", um select de `settings.procedures`;
  - concluir um atendimento oferece "Registrar pagamento", que abre o `PaymentForm` com `kind: "Atendimento"`, o `sessionId`, `defaultGrossCents` = `valueCents` do orçamento e `defaultDepositCents` = soma dos pagamentos Sinal do orçamento;
  - no celular, a visão padrão é "Dia" e a semana aparece como lista.

- [ ] **Passo 1:** Testes de fluxo:
  - na Lumi, o formulário de orçamento tem o campo "Região tratada" e não tem "Local do corpo";
  - **exemplo da spec:** concluir um atendimento com orçamento de R$ 1.000 e sinal de R$ 200, escolher um cupom de 10% e Crédito 2x. O resumo mostra "R$ 700,00" e "2x de R$ 350,00". Depois de salvar, `studio.get()` tem o pagamento com `netCents === 70000`;
  - clicar "Salvar" duas vezes no mesmo atendimento resulta em um único pagamento.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** Implemente. Mantenha os testes "converte proposta aprovada em sessão" e "rejeita sobreposição".
- [ ] **Passo 4:** lint, test e build PASSAM.
- [ ] **Passo 5:** Commit: `feat: orçamentos e agenda por estúdio com registro de pagamento`.

---

### Tarefa 10: Faturamento

**Arquivos:**

- Criar: `src/pages/Billing.tsx`

**Interfaces:**

- Consome: `monthSummary`, `monthEntries`, `isReceived`, `studio.markInstallment`, `studio.addExpense`, `PaymentForm`, `money`, `parseCents`.

Comportamento:

- **Seletor de mês** com anterior e próximo; o padrão é o mês atual.
- **Cartões:** "Entrou", "A receber", "Saiu", "Descontos", "Lucro" e "Por indicação" (contagem).
- **Abas:**
  - **"Entradas":** parcelas do mês com cliente, forma, "parcela n/N", valor e status, mais a ação "Marcar como recebida" ou "Desfazer";
  - **"Despesas":** lista e o botão "Nova despesa", com data, categoria, descrição e valor;
  - **"Pagamentos":** os pagamentos com filtro por forma.
- **Botão "Novo pagamento"** abre o `PaymentForm` com a escolha do cliente.
- **No celular,** as listas são cards.

- [ ] **Passo 1:** Teste de fluxo: em `/faturamento`, o valor de "Entrou" é igual à soma dos itens da aba "Entradas" com status "Recebida" (este é o anti-objetivo "faturamento que fecha"). Criar uma despesa de R$ 50,00 aumenta "Saiu" em R$ 50,00.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** Implemente.
- [ ] **Passo 4:** lint, test e build PASSAM.
- [ ] **Passo 5:** Commit: `feat: tela de faturamento`.

---

### Tarefa 11: Fidelidade/Descontos

**Arquivos:**

- Criar: `src/pages/Loyalty.tsx`

**Interfaces:**

- Consome: `benefitStatus`, `referralRanking`, `studio.createPromotion`, `studio.saveCoupon`.

Comportamento. A tela tem as abas "Benefícios", "Cupons", "Promoções e sorteios" e "Indicações".

- **Benefícios:** lista filtrável por status e tipo.
- **Cupons:** CRUD com código, %, validade e limite, mostrando usos/limite; o código é salvo em maiúsculas.
- **Promoções e sorteios:** criação com nome, tipo, %, validade e clientes contemplados (seleção múltipla com busca).
- **Indicações:** ranking de quem mais indicou, com o status de cada indicação.

- [ ] **Passo 1:** Testes de fluxo:
  - criar o cupom "verao15" de 15% → ele aparece como "VERAO15";
  - criar o sorteio "Sorteio de Natal" para 1 cliente → a ficha desse cliente mostra o benefício Disponível de 15%.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** Implemente.
- [ ] **Passo 4:** lint, test e build PASSAM.
- [ ] **Passo 5:** Commit: `feat: tela de fidelidade e descontos`.

---

### Tarefa 12: Follow-up

**Arquivos:**

- Criar: `src/pages/FollowUp.tsx`

**Interfaces:**

- Consome: `bucket`, `waLink`, `OPEN_STAGES`, `studio.advanceFollowUp`, `studio.addFollowUp`, `studio.birthdayCoupon`, `settings.templates`.

Comportamento:

- **Abas** "Hoje", "Atrasados", "Próximos" e "Todos", com filtro por etapa e um kanban opcional a partir de 900 px.
- **Card:** cliente, motivo, data e tentativas.
- **"Chamar no WhatsApp":** um link `target="_blank"` com o `waLink` do motivo, que também chama `advanceFollowUp(id, "Contatado", "Mensagem enviada pelo WhatsApp")`.
- **Ações por etapa:** "Respondeu", "Sem resposta", "Convertido" (pede o vínculo opcional com orçamento ou atendimento) e "Perdido", com nota opcional.
- **Pós-atendimento:** o "Respondeu" pede nota de 1 a 5 e comentário.
- **Aniversário:** botão "Gerar cupom".
- **Detalhe:** mostra o histórico.
- **"Novo follow-up"** cria um follow-up manual.

- [ ] **Passo 1:** Testes de fluxo:
  - "Sem resposta" em um card de "Hoje" o move para "Próximos" com "Tentativa 1 de 3";
  - "Chamar no WhatsApp" tem um `href` que começa com `https://wa.me/55`, e a etapa passa a "Contatado";
  - o histórico mostra as passagens.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** Implemente.
- [ ] **Passo 4:** lint, test e build PASSAM.
- [ ] **Passo 5:** Commit: `feat: funil de follow-up`.

---

### Tarefa 13: Estoque

**Arquivos:**

- Criar: `src/pages/Stock.tsx`

**Interfaces:**

- Consome: `lowStock`, `studio.purchase`, `studio.adjustStock`, `studio.saveStockItem`.

Comportamento:

- Lista de itens com quantidade e unidade; os itens com estoque baixo vêm primeiro, com o badge "Estoque baixo".
- Ações "Registrar compra" (quantidade e valor total em reais), "Ajustar contagem" (nova quantidade e nota) e "Novo item".
- O detalhe mostra os movimentos.

- [ ] **Passo 1:** Teste de fluxo: registrar a compra de 2 unidades por R$ 80,00 de um item → a quantidade aumenta 2 e, em `/faturamento`, a aba Despesas mostra "Compra: <nome> (2 <unidade>)".
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** Implemente.
- [ ] **Passo 4:** lint, test e build PASSAM.
- [ ] **Passo 5:** Commit: `feat: tela de estoque`.

---

### Tarefa 14: Início e Configurações

**Arquivos:**

- Modificar: `src/pages/Dashboard.tsx`, `src/pages/Settings.tsx`

Comportamento:

- **Início:** blocos com "Hoje na agenda" (lista com os termos do estúdio), "Follow-ups de hoje e atrasados" (contagem e os 5 primeiros), "Resumo do mês" (Entrou, A receber e Lucro, via `monthSummary`) e "Estoque baixo". Cada bloco leva ao módulo correspondente. O contador de lembretes do `Layout` passa a contar os follow-ups de "Hoje" e "Atrasados".
- **Configurações:** abas "Estúdio", "Follow-up", "Procedimentos", "Fidelidade" e "Aparência".
  - **Estúdio:** os dados atuais, com o rótulo do profissional vindo de `terms.profissional`.
  - **Follow-up:** os 6 prazos e as mensagens modelo por motivo, com a dica "use {nome}".
  - **Procedimentos:** lista editável de nome e dias de retorno.
  - **Fidelidade:** % padrão por tipo.
  - **Aparência:** tema e destaque, salvos por estúdio.

- [ ] **Passo 1:** Testes de fluxo:
  - mudar o "Orçamento sem resposta" para 5 dias e deixar um orçamento Pendente → o follow-up criado vence em `dateOffset(5)`;
  - mudar o destaque na Lumi não altera o destaque do Yannis (adaptar o teste existente "restaura o laranja como cor de destaque");
  - o Início mostra "Estoque baixo" com os itens do seed.
- [ ] **Passo 2:** FALHA.
- [ ] **Passo 3:** Implemente.
- [ ] **Passo 4:** lint, test e build PASSAM.
- [ ] **Passo 5:** Commit: `feat: início e configurações da nova versão`.

---

### Tarefa 15: Documentação e verificação final

**Arquivos:**

- Modificar: `README.md`, `docs/arquitetura.md`, `docs/roadmap.md`, `docs/schema.sql`
- Apagar: `public/referencia-botanica.svg` e o `sampleReference` (com `src/tests/base.test.ts`), apenas se nada mais usar

Conteúdo:

- **README:** o que o painel é (dois estúdios), as contas demo, o aviso de que o login é simulado, o roteiro de demonstração novo (login → agenda → concluir e pagar com cupom → faturamento → follow-up → fidelidade → estoque → trocar de estúdio) e as chaves `v3` para resetar os dados.
- **Arquitetura:** a camada `src/domain`, os tenants e a sessão, e o mapa de API atualizado (`/studios/{id}/payments`, `/followups`, `/benefits`, `/coupons`, `/stock`...).
- **Roadmap:** 1. Back-end Spring (auth real, tenants, Flyway); 2. App Flutter consumindo a API; 3. Permissões por perfil; 4. WhatsApp; 5. Baixa automática de estoque.
- **Schema:** tabelas `studio`, `app_user`, `payment`, `installment`, `expense`, `benefit`, `coupon`, `promotion`, `follow_up`, `follow_up_event`, `stock_item` e `stock_movement`, todas com `studio_id`. As tabelas de IA, conversas e campanhas saem.

- [ ] **Passo 1:** Escreva a documentação.
- [ ] **Passo 2:** `npm run lint && npm run test && npm run build && npm exec prettier -- --check .`. Esperado: tudo PASSA.
- [ ] **Passo 3:** Verificação com Playwright em `npm run preview`, em 360×740 e 1280×800, logado em cada estúdio. Visitar todas as rotas e conferir `scrollWidth <= innerWidth` e a ausência de erros no console. Fazer o roteiro do README de ponta a ponta na Lumi.
- [ ] **Passo 4:** Commit: `docs: nova versão com dois estúdios`. O push para a `main`, que dispara o deploy, só acontece com a confirmação do dono.
