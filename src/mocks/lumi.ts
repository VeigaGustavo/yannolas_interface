import type { SeedConfig } from "./seedConfig";

export const lumiSeed: SeedConfig = {
  names: [
    "Fernanda Araújo",
    "Patrícia Nogueira",
    "Renata Vieira",
    "Carolina Pacheco",
    "Luciana Rezende",
    "Tatiana Brandão",
    "Vanessa Queiroz",
    "Aline Fontes",
    "Simone Cavalcanti",
    "Marcos Tavares",
    "Eduardo Siqueira",
    "Helena Prado",
  ],
  surnames: ["Monteiro", "Guimarães", "Peixoto", "Sampaio", "Coelho", "Bastos"],
  ddd: "63",
  projects: [
    "Toxina botulínica — terço superior",
    "Preenchimento labial",
    "Bioestimulador de colágeno",
    "Limpeza de pele profunda",
    "Preenchimento de olheiras",
    "Toxina para bruxismo",
  ],
  tags: ["toxina", "preenchimento", "pele", "retorno"],
  details: (i) => ({
    area: ["Testa e glabela", "Lábios", "Face", "Olheiras", "Masseter"][i % 5],
    product: ["Toxina botulínica", "Ácido hialurônico", "Bioestimulador"][
      i % 3
    ],
    amount: ["50 U", "1 ml", "2 ml", "1 frasco"][i % 4],
  }),
  pricesCents: [120000, 180000, 250000, 35000, 160000, 90000],
  depositCents: 20000,
  durations: [30, 60, 90],
  procedures: [
    { name: "Toxina botulínica", returnDays: 120 },
    { name: "Preenchimento", returnDays: 270 },
    { name: "Bioestimulador", returnDays: 180 },
    { name: "Limpeza de pele", returnDays: 30 },
  ],
  stock: [
    {
      name: "Toxina botulínica 100 U",
      unit: "fr",
      qty: 1,
      min: 2,
      costCents: 95000,
    },
    {
      name: "Ácido hialurônico 1 ml",
      unit: "sr",
      qty: 6,
      min: 3,
      costCents: 42000,
    },
    { name: "Bioestimulador", unit: "fr", qty: 3, min: 1, costCents: 110000 },
    { name: "Seringas 1 ml", unit: "un", qty: 40, min: 20, costCents: 150 },
    { name: "Agulhas 30G", unit: "un", qty: 10, min: 30, costCents: 90 },
    { name: "Cânulas 25G", unit: "un", qty: 25, min: 10, costCents: 1200 },
    {
      name: "Anestésico tópico",
      unit: "bisn",
      qty: 4,
      min: 2,
      costCents: 6000,
    },
    { name: "Luvas estéreis", unit: "par", qty: 60, min: 20, costCents: 250 },
  ],
  coupon: "LUMI15",
  promotion: "Semana da pele",
  raffle: "Sorteio de Natal",
  rentCents: 250000,
  settings: {
    studio: "Lumi Estética Avançada",
    artist: "Dra. Helena Duarte",
    hours: "Segunda a sábado, com hora marcada",
    policies:
      "Sinal de R$ 200. Retornos de toxina em até 15 dias sem custo adicional.",
  },
};
