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
export interface Message {
  id: string;
  from: "cliente" | "humano" | "agente";
  text: string;
  image?: string;
  at: string;
}
export interface Conversation {
  id: string;
  clientId: string;
  unread: number;
  mode: "IA" | "Humano";
  summary: string;
  messages: Message[];
}
export interface InboundMessageEvent {
  event: "messages.upsert";
  conversationId: string;
  messageId: string;
  text: string;
  image?: string;
  at: string;
}
export interface Execution {
  id: string;
  title: string;
  detail: string;
  at: string;
  status: "Simulado" | "Pendente" | "Aprovado" | "Rejeitado";
  clientId?: string;
  image?: string;
}
export interface Campaign {
  id: string;
  name: string;
  type: "Promoção" | "Aviso" | "Flash tattoo";
  segment: string;
  message: string;
  date: string;
  status: "Rascunho" | "Agendada" | "Simulada";
  sent: number;
}
export interface Feedback {
  id: string;
  clientId: string;
  rating: number;
  comment: string;
  followUp: string;
  status: "Pendente" | "Recebido" | "Concluído";
}
export interface Settings {
  studio: string;
  artist: string;
  hours: string;
  opensAt?: string;
  closesAt?: string;
  policies: string;
  tone: string;
  knowledge: string;
  rules: string;
  tools: string;
  notifications: boolean;
  agent: boolean;
}
export interface StudioData {
  clients: Client[];
  quotes: Quote[];
  sessions: Session[];
  conversations: Conversation[];
  executions: Execution[];
  campaigns: Campaign[];
  feedback: Feedback[];
  settings: Settings;
}
export type Collection = Exclude<keyof StudioData, "settings">;
export type Entity<K extends Collection> = StudioData[K][number];
export interface StudioService {
  get(): Promise<StudioData>;
  save<K extends Collection>(key: K, item: Entity<K>): Promise<void>;
  settings(value: Settings): Promise<void>;
  moveClient(id: string, stage: Stage): Promise<void>;
  send(id: string, message: Message): Promise<void>;
  receive(event: InboundMessageEvent): Promise<void>;
  read(id: string): Promise<void>;
  review(id: string, detail: string, approve: boolean): Promise<void>;
  dispatch(id: string): Promise<number>;
}
