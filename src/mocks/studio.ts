import { stages, type StudioData } from "../types/studio";
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
const names = [
  "Mariana Costa",
  "Rafael Mendes",
  "Camila Oliveira",
  "Lucas Ferreira",
  "Beatriz Santos",
  "Pedro Almeida",
  "Isabela Rocha",
  "Gabriel Lima",
  "Ana Ribeiro",
  "Bruno Silva",
  "Juliana Martins",
  "Diego Souza",
];
export const sampleReference =
  import.meta.env.BASE_URL + "referencia-botanica.svg";
const projects = [
  "Floral em fine line",
  "Pontilhismo geométrico",
  "Borboleta delicada",
  "Realismo preto e cinza",
  "Cobertura floral",
  "Mandala em pontilhismo",
];
const times = ["10:00", "13:30", "16:00"];
export function seed(): StudioData {
  const clients = Array.from({ length: 48 }, (_, i) => ({
    id: "c" + i,
    name:
      i < 12
        ? names[i]
        : names[i % 12].split(" ")[0] +
          " " +
          [
            "Castro",
            "Dias",
            "Moreira",
            "Cardoso",
            "Barros",
            "Azevedo",
            "Moura",
            "Teixeira",
            "Lopes",
            "Campos",
            "Freitas",
            "Pereira",
          ][Math.floor(i / 3) % 12],
    phone: "(11) 99824-" + (1280 + i),
    email: "cliente" + (i + 1) + "@example.com",
    stage: stages[i % 6],
    tags: ["fine line", "pontilhismo", "floral", "retorno"][i % 4],
    project: projects[i % 6],
    created: dateOffset(-Math.floor(i / 4)),
    references: i === 0 ? [sampleReference] : [],
    history: ["Contato cadastrado pelo WhatsApp"],
  }));
  const quotes = Array.from({ length: 19 }, (_, i) => ({
    id: "q" + i,
    clientId: "c" + i,
    description: projects[i % 6],
    size: "12 cm",
    placement: ["Antebraço", "Braço", "Ombro"][i % 3],
    value: [650, 1800, 450, 1400, 850, 550][i % 6],
    deposit: 150,
    validUntil: dateOffset(10 + i),
    status: i < 12 ? ("Pendente" as const) : ("Aprovado" as const),
    reference: "",
  }));
  const sessions = Array.from({ length: 14 }, (_, i) => ({
    id: "s" + i,
    clientId: "c" + (i + 12),
    quoteId: i < 7 ? "q" + (i + 12) : "",
    title: projects[(i + 12) % 6],
    date: dateOffset(Math.floor(i / 3)),
    time: times[i % 3],
    duration: 90,
    status: "Confirmado" as const,
  }));
  return {
    clients,
    quotes,
    sessions,
    payments: [],
    expenses: [],
    benefits: [],
    coupons: [],
    promotions: [],
    followUps: [],
    stock: [],
    settings: {
      studio: "Yannis Tattoo",
      artist: "Yannis Manolas",
      hours: "Atendimento diário com horário marcado",
      opensAt: "10:00",
      closesAt: "19:00",
      policies: "Sinal de R$ 150. Reagendamentos com 48 horas de antecedência.",
      notifications: true,
      ...defaultSettings(),
    },
  };
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
