import { create } from "zustand";
import { persist } from "zustand/middleware";
interface InterfaceState {
  theme: "dark" | "light";
  accent: string;
  menu: boolean;
  notice: string;
  setTheme: (theme: InterfaceState["theme"]) => void;
  setAccent: (accent: string) => void;
  setMenu: (menu: boolean) => void;
  notify: (notice: string) => void;
}
export const useInterface = create<InterfaceState>()(
  persist(
    (set) => ({
      theme: "dark",
      accent: "#ff9100",
      menu: false,
      notice: "",
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setMenu: (menu) => set({ menu }),
      notify: (notice) => set({ notice }),
    }),
    {
      name: "tattoo-studio-ui-v2",
      partialize: ({ theme, accent }) => ({ theme, accent }),
    },
  ),
);
