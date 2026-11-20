import {
  advanceFollowUp,
  onQuoteSaved,
  onSessionConcluded,
  scanTimeEvents,
} from "../domain/followups";
import {
  createPromotion,
  registerPayment,
  saveCoupon,
} from "../domain/loyalty";
import { addMonths } from "../domain/money";
import { purchase } from "../domain/stock";
import {
  stages,
  type Client,
  type PaymentMethod,
  type Quote,
  type Session,
  type StudioData,
  type TenantId,
} from "../types/studio";
import { lumiSeed } from "./lumi";
import { yannisSeed } from "./yannis";
export const dateOffset = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
export const shortDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(date + "T12:00:00"),
  );
export { money } from "../domain/money";
export const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
export const sampleReference =
  import.meta.env.BASE_URL + "referencia-botanica.svg";

const pad = (n: number) => String(n).padStart(2, "0");
const birthdayIn = (days: number) => "1992" + dateOffset(days).slice(4);
const methods: PaymentMethod[] = [
  "Pix",
  "Dinheiro",
  "Débito",
  "Crédito",
  "Pix",
  "Crédito",
];
const referrals: [number, number][] = [
  [12, 0],
  [13, 0],
  [14, 2],
  [20, 5],
  [27, 1],
  [10, 0],
];

export function seed(tenant: TenantId = "yannis"): StudioData {
  const cfg = tenant === "lumi" ? lumiSeed : yannisSeed;
  const today = dateOffset();
  const id = (() => {
    let n = 0;
    return () => tenant + "-" + ++n;
  })();
  const d: StudioData = {
    clients: [],
    quotes: [],
    sessions: [],
    payments: [],
    expenses: [],
    benefits: [],
    coupons: [],
    promotions: [],
    followUps: [],
    stock: [],
    settings: {
      ...cfg.settings,
      opensAt: "10:00",
      closesAt: "19:00",
      notifications: true,
      ...defaultSettings(),
      procedures: cfg.procedures,
    },
  };

  d.clients = Array.from({ length: 30 }, (_, i): Client => {
    const name =
      i < 12
        ? cfg.names[i]
        : cfg.names[i % 12].split(" ")[0] +
          " " +
          cfg.surnames[Math.floor((i - 12) / 12)];
    return {
      id: "c" + i,
      name,
      phone: `(${cfg.ddd}) 9${8800 + i}-${1000 + i * 7}`,
      email: "cliente" + (i + 1) + "@example.com",
      stage: stages[i % 6],
      tags: cfg.tags[i % cfg.tags.length],
      project: cfg.projects[i % cfg.projects.length],
      created: dateOffset(-Math.floor(i * 3)),
      references: i === 0 && tenant === "yannis" ? [sampleReference] : [],
      history: ["Contato cadastrado pelo WhatsApp"],
      birthday:
        i === 3
          ? birthdayIn(2)
          : i === 7
            ? birthdayIn(5)
            : `${1980 + (i % 20)}-${pad(1 + ((i * 5) % 12))}-${pad(1 + ((i * 7) % 28))}`,
    };
  });
  for (const [referred, referrer] of referrals) {
    const client = d.clients[referred];
    client.referredBy = "c" + referrer;
    d.benefits.push({
      id: id(),
      clientId: "c" + referrer,
      type: "Indicação",
      pct: d.settings.benefitPct.Indicação,
      label: "Indicação de " + client.name,
      status: "Pendente",
      createdAt: client.created,
      sourceClientId: client.id,
    });
  }

  d.quotes = Array.from({ length: 20 }, (_, i): Quote => ({
    id: "q" + i,
    clientId: "c" + i,
    description: cfg.projects[i % cfg.projects.length],
    details: cfg.details(i),
    valueCents: cfg.pricesCents[i % cfg.pricesCents.length],
    depositCents: cfg.depositCents,
    validUntil: dateOffset(10 + i),
    status: i < 12 ? "Pendente" : "Aprovado",
    reference: "",
  }));
  const procedure = (i: number) =>
    cfg.procedures[i % cfg.procedures.length].name;
  const upcoming = Array.from({ length: 14 }, (_, i): Session => ({
    id: "s" + i,
    clientId: "c" + (i + 12),
    quoteId: i < 7 ? "q" + (i + 12) : "",
    title: cfg.projects[(i + 12) % cfg.projects.length],
    date: dateOffset(Math.floor(i / 3)),
    time: ["10:00", "13:30", "16:00"][i % 3],
    duration: cfg.durations[i % cfg.durations.length],
    status: "Confirmado",
    procedure: procedure(i),
  }));
  const past = Array.from({ length: 18 }, (_, i): Session => ({
    id: "ps" + i,
    clientId: "c" + (i + 12),
    quoteId: "",
    title: cfg.projects[i % cfg.projects.length],
    date: dateOffset(i === 17 ? -200 : -(5 + i * 5)),
    time: ["10:00", "13:30", "16:00"][i % 3],
    duration: cfg.durations[i % cfg.durations.length],
    status: "Concluído",
    procedure: procedure(i),
  }));
  d.sessions = [...upcoming, ...past];

  saveCoupon(d, {
    id: id(),
    code: cfg.coupon,
    pct: Number(cfg.coupon.replace(/\D/g, "")) || 10,
    validUntil: dateOffset(30),
    maxUses: 20,
    uses: 0,
  });
  saveCoupon(d, {
    id: id(),
    code: "VERAO25",
    pct: 25,
    validUntil: dateOffset(-10),
    maxUses: 50,
    uses: 0,
  });

  [...past]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((s, i) => {
      const method = methods[i % methods.length];
      registerPayment(
        d,
        {
          clientId: s.clientId,
          sessionId: s.id,
          kind: "Atendimento",
          date: s.date,
          grossCents: cfg.pricesCents[i % cfg.pricesCents.length],
          depositCents: 0,
          method,
          installments: method === "Crédito" ? (i % 2 ? 3 : 6) : 1,
          couponCode: i % 7 === 4 ? cfg.coupon : undefined,
        },
        s.date,
        id,
      );
    });
  for (const q of d.quotes.slice(12, 16))
    registerPayment(
      d,
      {
        clientId: q.clientId,
        quoteId: q.id,
        kind: "Sinal",
        date: dateOffset(-3),
        grossCents: q.depositCents,
        depositCents: 0,
        method: "Pix",
        installments: 1,
      },
      today,
      id,
    );

  for (let m = 0; m < 3; m++) {
    const month = addMonths(today, -m).slice(0, 7);
    d.expenses.push(
      {
        id: id(),
        date: month + "-05",
        category: "Aluguel",
        description: "Aluguel da sala",
        cents: cfg.rentCents,
      },
      {
        id: id(),
        date: month + "-10",
        category: "Marketing",
        description: "Impulsionamento no Instagram",
        cents: 15000,
      },
    );
  }
  d.stock = cfg.stock.map((s) => ({
    id: id(),
    name: s.name,
    unit: s.unit,
    qty: s.qty,
    min: s.min,
    lastCostCents: s.costCents,
    movements: [],
  }));
  for (const index of [2, 5]) {
    const item = cfg.stock[index];
    purchase(d, d.stock[index].id, 2, item.costCents * 2, dateOffset(-12), id);
  }

  createPromotion(
    d,
    {
      id: id(),
      name: cfg.promotion,
      type: "Promoção",
      pct: 10,
      validUntil: dateOffset(20),
    },
    ["c1", "c2", "c3"],
    dateOffset(-5),
    id,
  );
  createPromotion(
    d,
    {
      id: id(),
      name: cfg.raffle,
      type: "Sorteio",
      pct: d.settings.benefitPct.Sorteio,
      validUntil: dateOffset(45),
    },
    ["c4"],
    dateOffset(-2),
    id,
  );

  d.quotes.slice(0, 12).forEach((q, i) => {
    onQuoteSaved(d, q, undefined, dateOffset(-(i % 6)));
  });
  past.forEach((s, i) => {
    onSessionConcluded(d, s, s.date);
    const post = d.followUps.find(
      (f) => f.reason === "Pós-atendimento" && f.refId === s.id,
    );
    if (!post || i < 2) return;
    advanceFollowUp(d, post.id, "Contatado", "Mensagem enviada", s.date);
    if (i % 3 === 2) {
      advanceFollowUp(d, post.id, "Sem resposta", "", dateOffset(-2));
      return;
    }
    advanceFollowUp(d, post.id, "Respondeu", "Cliente satisfeito", s.date, {
      rating: i % 4 === 0 ? 4 : 5,
      comment: "Ficou ótimo, obrigado!",
    });
    advanceFollowUp(d, post.id, "Convertido", "Atendimento avaliado", s.date);
  });
  scanTimeEvents(d, today);
  return d;
}

export const defaultSettings = () => ({
  followUp: {
    quoteDays: 3,
    postDays: 1,
    inactiveDays: 180,
    birthdayDays: 7,
    retryDays: 3,
    maxAttempts: 3,
  },
  procedures: [{ name: "Tatuagem", returnDays: 30 }],
  benefitPct: {
    Indicação: 10,
    Promoção: 10,
    Sorteio: 15,
    Cupom: 10,
    Aniversário: 10,
  },
  templates: {
    "Orçamento sem resposta":
      "Oi, {nome}! Conseguiu ver o orçamento que enviamos? Posso ajudar com alguma dúvida?",
    "Pós-atendimento":
      "Oi, {nome}! Como você está? Conta pra gente como ficou e se está tudo bem.",
    Retorno: "Oi, {nome}! Já está na hora do seu retorno. Vamos agendar?",
    Inativo: "Oi, {nome}! Sentimos sua falta. Que tal marcar um novo horário?",
    Aniversário:
      "Oi, {nome}! Feliz aniversário! Preparamos um desconto especial pra você.",
    Indicação:
      "Oi, {nome}! Obrigado pela indicação! Seu desconto já está disponível.",
    Manual: "Oi, {nome}! Tudo bem?",
  },
});
