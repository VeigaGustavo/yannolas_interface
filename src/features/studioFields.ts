import type { Client } from "../types/studio";
export const clientOptions = (
  clients: Client[],
  placeholder = "Selecione um cliente",
) => [
  { value: "", label: placeholder },
  ...clients.map((c) => ({ value: c.id, label: c.name })),
];
export const quoteStatuses = [
  "Rascunho",
  "Pendente",
  "Aprovado",
  "Recusado",
] as const;
export const sessionStatuses = [
  "Confirmado",
  "Pendente",
  "Cancelado",
  "Bloqueado",
  "Concluído",
] as const;
