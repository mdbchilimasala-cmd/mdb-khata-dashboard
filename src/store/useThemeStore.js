import { create } from "zustand";

export const useThemeStore = create((set) => ({
  dark: localStorage.getItem("mdb-theme") === "dark",
  toggle: () =>
    set((state) => {
      const dark = !state.dark;
      document.documentElement.classList.toggle("dark", dark);
      localStorage.setItem("mdb-theme", dark ? "dark" : "light");
      return { dark };
    }),
  init: () => {
    const dark = localStorage.getItem("mdb-theme") === "dark";
    document.documentElement.classList.toggle("dark", dark);
    set({ dark });
  },
}));
