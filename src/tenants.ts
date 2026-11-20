import type { TenantId } from "./types/studio";

export interface Tenant {
  id: TenantId;
  name: string;
  professional: string;
  logo?: string;
  mark: string;
  defaultTheme: "dark" | "light";
  defaultAccent: string;
  terms: {
    atendimento: string;
    atendimentos: string;
    servico: string;
    profissional: string;
    novo: string;
  };
  quoteFields: { name: string; label: string }[];
  email: string;
  password: string;
}

export const tenants: Record<TenantId, Tenant> = {
  yannis: {
    id: "yannis",
    name: "Yannis Tattoo",
    professional: "Yannis Manolas",
    logo: "brand/yannis-marca.png",
    mark: "YANNIS | TATTOO",
    defaultTheme: "dark",
    defaultAccent: "#ff9100",
    terms: {
      atendimento: "Sessão",
      atendimentos: "Sessões",
      servico: "Tatuagem",
      profissional: "Tatuador",
      novo: "Nova sessão",
    },
    quoteFields: [
      { name: "placement", label: "Local do corpo" },
      { name: "size", label: "Tamanho" },
      { name: "style", label: "Estilo" },
    ],
    email: "yannis@demo.app",
    password: "demo123",
  },
  lumi: {
    id: "lumi",
    name: "Lumi Estética Avançada",
    professional: "Dra. Helena Duarte",
    mark: "LUMI",
    defaultTheme: "light",
    defaultAccent: "#0e7c7b",
    terms: {
      atendimento: "Procedimento",
      atendimentos: "Procedimentos",
      servico: "Procedimento estético",
      profissional: "Biomédica",
      novo: "Novo procedimento",
    },
    quoteFields: [
      { name: "area", label: "Região tratada" },
      { name: "product", label: "Produto" },
      { name: "amount", label: "Quantidade (ml/U)" },
    ],
    email: "lumi@demo.app",
    password: "demo123",
  },
};

export const tenantList = Object.values(tenants);

export function authenticate(email: string, password: string): TenantId | null {
  const normalized = email.trim().toLowerCase();
  return (
    tenantList.find((t) => t.email === normalized && t.password === password)
      ?.id ?? null
  );
}
