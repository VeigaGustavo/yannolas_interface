import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authenticate } from "../tenants";
import type { TenantId } from "../types/studio";

interface SessionState {
  tenantId: TenantId | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      tenantId: null,
      login: (email, password) => {
        const tenantId = authenticate(email, password);
        if (tenantId) set({ tenantId });
        return tenantId !== null;
      },
      logout: () => set({ tenantId: null }),
    }),
    { name: "studio-session-v3", partialize: ({ tenantId }) => ({ tenantId }) },
  ),
);

export function currentTenant(): TenantId {
  const id = useSession.getState().tenantId;
  if (!id) throw new Error("Sessão expirada.");
  return id;
}
