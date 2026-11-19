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
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
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
    references: i === 0 ? ["/referencia-botanica.svg"] : [],
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
  const conversations = clients.slice(0, 8).map((c, i) => ({
    id: "t" + i,
    clientId: c.id,
    unread: i < 6 ? 1 : 0,
    mode: i % 3 === 1 ? ("Humano" as const) : ("IA" as const),
    summary:
      "Cliente busca " +
      c.project.toLowerCase() +
      ". Confirmar tamanho e disponibilidade.",
    messages: [
      {
        id: "m" + i,
        from: "cliente" as const,
        text:
          "Oi! Gostaria de saber mais sobre " + c.project.toLowerCase() + ".",
        at: dateOffset() + "T09:15",
      },
      {
        id: "r" + i,
        from: i % 3 === 1 ? ("humano" as const) : ("agente" as const),
        text:
          "Olá, " +
          c.name.split(" ")[0] +
          "! Você tem alguma referência para o projeto?",
        at: dateOffset() + "T09:16",
      },
      ...(i < 6
        ? [
            {
              id: "followup" + i,
              from: "cliente" as const,
              text:
                i === 0
                  ? "Tenho esta referência. Vocês têm horário esta semana?"
                  : "Tenho uma referência. Posso mandar por aqui?",
              at: dateOffset() + "T09:21",
              image: c.references[0],
            },
          ]
        : []),
    ],
  }));
  return {
    clients,
    quotes,
    sessions,
    conversations,
    executions: [
      {
        id: "a1",
        title: "Referência visual analisada",
        detail: "Briefing de fine line gerado para Mariana Costa.",
        at: dateOffset() + "T10:42",
        status: "Simulado",
      },
      {
        id: "a2",
        title: "Lead qualificado",
        detail: "Rafael Mendes avançou para qualificação.",
        at: dateOffset() + "T09:35",
        status: "Aprovado",
      },
      {
        id: "a3",
        title: "Resumo de conversa criado",
        detail: "Preferências de Camila Oliveira registradas.",
        at: dateOffset() + "T08:24",
        status: "Simulado",
      },
    ],
    campaigns: [
      {
        id: "p1",
        name: "Flash Day floral de novembro",
        type: "Flash tattoo",
        segment: "floral",
        message:
          "Oi, {nome}! Abrimos horários para o Flash Day floral do Yannis.",
        date: dateOffset(7),
        status: "Agendada",
        sent: 0,
      },
    ],
    feedback: clients.slice(0, 5).map((c, i) => ({
      id: "f" + i,
      clientId: c.id,
      rating: i === 4 ? 0 : i === 2 ? 4 : 5,
      comment: i === 4 ? "" : "Ótima experiência no estúdio.",
      followUp: dateOffset(i + 2),
      status: i === 4 ? "Pendente" : "Recebido",
    })),
    settings: {
      studio: "Yannis Tattoo",
      artist: "Yannis Manolas",
      hours: "Atendimento diário com horário marcado",
      opensAt: "10:00",
      closesAt: "19:00",
      policies: "Sinal de R$ 150. Reagendamentos com 48 horas de antecedência.",
      tone: "Próximo, profissional e direto",
      knowledge:
        "Estilos do estúdio: traços finos, pontilhismo, floral e realismo em preto e cinza. Estúdio em Palmas-TO.",
      rules: "Confirme o tamanho e a região antes de encaminhar um orçamento.",
      tools: "Resumo de conversa, análise de referência, atualização de CRM",
      notifications: true,
      agent: true,
    },
  };
}
