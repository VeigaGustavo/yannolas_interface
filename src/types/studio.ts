export const stages = [
  "Novo lead",
  "Qualificação",
  "Orçamento",
  "Aguardando aprovação",
  "Agendado",
  "Concluído",
] as const;
export type Stage = (typeof stages)[number];
export type TenantId = "yannis" | "lumi";
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
  birthday?: string;
  referredBy?: string;
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
  procedure?: string;
}
export type PaymentMethod = "Pix" | "Dinheiro" | "Débito" | "Crédito";
export const paymentMethods: PaymentMethod[] = [
  "Pix",
  "Dinheiro",
  "Débito",
  "Crédito",
];
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
export const expenseCategories: ExpenseCategory[] = [
  "Material",
  "Aluguel",
  "Marketing",
  "Outros",
];
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
export const benefitTypes: BenefitType[] = [
  "Indicação",
  "Promoção",
  "Sorteio",
  "Cupom",
  "Aniversário",
];
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
export const followUpReasons: FollowUpReason[] = [
  "Orçamento sem resposta",
  "Pós-atendimento",
  "Retorno",
  "Inativo",
  "Aniversário",
  "Indicação",
  "Manual",
];
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
  templates: Record<FollowUpReason, string>;
}
export interface StudioData {
  clients: Client[];
  quotes: Quote[];
  sessions: Session[];
  payments: Payment[];
  expenses: Expense[];
  benefits: Benefit[];
  coupons: Coupon[];
  promotions: Promotion[];
  followUps: FollowUp[];
  stock: StockItem[];
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
