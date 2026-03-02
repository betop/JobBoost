import { create } from "zustand";

interface ToastState {
  message: string;
  type: "success" | "error" | "info" | "warning";
  show: boolean;
}

interface UIState {
  sidebarCollapsed: boolean;
  toast: ToastState;
  toggleSidebar: () => void;
  showToast: (message: string, type: ToastState["type"]) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toast: {
    message: "",
    type: "info",
    show: false,
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  showToast: (message, type) =>
    set({
      toast: {
        message,
        type,
        show: true,
      },
    }),
  hideToast: () =>
    set((state) => ({
      toast: {
        ...state.toast,
        show: false,
      },
    })),
}));
