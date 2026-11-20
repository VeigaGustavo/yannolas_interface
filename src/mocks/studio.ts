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
    settings: {
      studio: "Yannis Tattoo",
      artist: "Yannis Manolas",
      hours: "Atendimento diário com horário marcado",
      opensAt: "10:00",
      closesAt: "19:00",
      policies: "Sinal de R$ 150. Reagendamentos com 48 horas de antecedência.",
      notifications: true,
    },
  };
}
