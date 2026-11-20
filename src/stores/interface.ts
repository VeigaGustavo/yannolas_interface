import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tenants } from "../tenants";
import type { TenantId } from "../types/studio";
import { useSession } from "./session";

type Theme = "dark" | "light";
interface InterfaceState {
  themes: Partial<Record<TenantId, Theme>>;
  accents: Partial<Record<TenantId, string>>;
  menu: boolean;
  notice: string;
  setTheme: (tenant: TenantId, theme: Theme) => void;
  setAccent: (tenant: TenantId, accent: string) => void;
  setMenu: (menu: boolean) => void;
  notify: (notice: string) => void;
}
export const useInterface = create<InterfaceState>()(
  persist(
    (set) => ({
      themes: {},
      accents: {},
      menu: false,
      notice: "",
      setTheme: (tenant, theme) =>
        set((s) => ({ themes: { ...s.themes, [tenant]: theme } })),
      setAccent: (tenant, accent) =>
        set((s) => ({ accents: { ...s.accents, [tenant]: accent } })),
      setMenu: (menu) => set({ menu }),
      notify: (notice) => set({ notice }),
    }),
    {
      name: "studio-ui-v3",
      partialize: ({ themes, accents }) => ({ themes, accents }),
    },
  ),
);

/** Tema e destaque do estúdio da sessão, com os padrões da marca. */
export function useAppearance() {
  const tenant = useSession((s) => s.tenantId) ?? "yannis";
  const { themes, accents, setTheme, setAccent } = useInterface();
  return {
    theme: themes[tenant] ?? tenants[tenant].defaultTheme,
    accent: accents[tenant] ?? tenants[tenant].defaultAccent,
    defaultAccent: tenants[tenant].defaultAccent,
    setTheme: (t: Theme) => setTheme(tenant, t),
    setAccent: (a: string) => setAccent(tenant, a),
  };
}
