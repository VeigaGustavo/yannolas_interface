export const stages = [
  "Novo lead",
  "Qualificação",
  "Orçamento",
  "Aguardando aprovação",
  "Agendado",
  "Concluído",
] as const;
export type Stage = (typeof stages)[number];
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  stage: Stage;
  tags: string;
  project: string;
  created: string;
  references: string[];
  history: string[];
}
export interface Quote {
  id: string;
  clientId: string;
  description: string;
  size: string;
  placement: string;
  value: number;
  deposit: number;
  validUntil: string;
  status: "Rascunho" | "Pendente" | "Aprovado" | "Recusado";
  reference: string;
}
export interface Session {
  id: string;
  clientId: string;
  quoteId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  status: "Confirmado" | "Pendente" | "Cancelado" | "Bloqueado" | "Concluído";
}
export interface Settings {
  studio: string;
  artist: string;
  hours: string;
  opensAt?: string;
  closesAt?: string;
  policies: string;
  notifications: boolean;
}
export interface StudioData {
  clients: Client[];
  quotes: Quote[];
  sessions: Session[];
  settings: Settings;
}
export type Collection = Exclude<keyof StudioData, "settings">;
export type Entity<K extends Collection> = StudioData[K][number];
export interface StudioService {
  get(): Promise<StudioData>;
  save<K extends Collection>(key: K, item: Entity<K>): Promise<void>;
  settings(value: Settings): Promise<void>;
  moveClient(id: string, stage: Stage): Promise<void>;
}
