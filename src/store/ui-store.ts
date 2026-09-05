import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface ModalState {
  id: string;
  isOpen: boolean;
  data?: unknown;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UIState {
  modals: ModalState[];
  toasts: Toast[];
  isLoading: boolean;
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSearchOpen: boolean;
  isFullscreen: boolean;
  viewMode: "grid" | "list" | "table";
  density: "compact" | "normal" | "comfortable";
  fontSize: "sm" | "md" | "lg";
  animationsEnabled: boolean;
  reducedMotion: boolean;
  isDevMode: boolean;
  inspectorOpen: boolean;
  selectedTab: string;
  scrollPositions: Record<string, number>;

  openModal: (id: string, data?: unknown) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
  getModalData: <T = unknown>(id: string) => T | undefined;

  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleFullscreen: () => void;
  setViewMode: (mode: UIState["viewMode"]) => void;
  setDensity: (density: UIState["density"]) => void;
  setFontSize: (size: UIState["fontSize"]) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  setDevMode: (enabled: boolean) => void;
  toggleInspector: () => void;
  setSelectedTab: (tab: string) => void;
  saveScrollPosition: (key: string, position: number) => void;
  getScrollPosition: (key: string) => number;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        modals: [],
        toasts: [],
        isLoading: false,
        isSidebarOpen: true,
        isCommandPaletteOpen: false,
        isSearchOpen: false,
        isFullscreen: false,
        viewMode: "grid",
        density: "normal",
        fontSize: "md",
        animationsEnabled: true,
        reducedMotion: false,
        isDevMode: false,
        inspectorOpen: false,
        selectedTab: "overview",
        scrollPositions: {},

        openModal: (id, data) =>
          set((state) => {
            const existing = state.modals.find((m) => m.id === id);
            if (existing) {
              return {
                modals: state.modals.map((m) =>
                  m.id === id ? { ...m, isOpen: true, data } : m
                ),
              };
            }
            return {
              modals: [...state.modals, { id, isOpen: true, data }],
            };
          }),

        closeModal: (id) =>
          set((state) => ({
            modals: state.modals.map((m) =>
              m.id === id ? { ...m, isOpen: false } : m
            ),
          })),

        isModalOpen: (id) => {
          const modal = get().modals.find((m) => m.id === id);
          return modal?.isOpen ?? false;
        },

        getModalData: <T = unknown>(id: string): T | undefined => {
          const modal = get().modals.find((m) => m.id === id);
          return modal?.data as T | undefined;
        },

        addToast: (toast) =>
          set((state) => {
            const id = `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
            const newToast: Toast = { ...toast, id };

            if (toast.duration !== 0) {
              setTimeout(() => {
                get().removeToast(id);
              }, toast.duration ?? 5000);
            }

            return {
              toasts: [...state.toasts, newToast].slice(-5),
            };
          }),

        removeToast: (id) =>
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          })),

        clearToasts: () => set({ toasts: [] }),

        setLoading: (isLoading) => set({ isLoading }),

        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

        setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

        toggleCommandPalette: () =>
          set((state) => ({
            isCommandPaletteOpen: !state.isCommandPaletteOpen,
          })),

        setCommandPaletteOpen: (isCommandPaletteOpen) =>
          set({ isCommandPaletteOpen }),

        toggleSearch: () =>
          set((state) => ({ isSearchOpen: !state.isSearchOpen })),

        setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),

        toggleFullscreen: () => {
          if (typeof document !== "undefined") {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            } else {
              document.exitFullscreen();
            }
          }
          set((state) => ({ isFullscreen: !state.isFullscreen }));
        },

        setViewMode: (viewMode) => set({ viewMode }),
        setDensity: (density) => set({ density }),
        setFontSize: (fontSize) => set({ fontSize }),

        setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),

        setReducedMotion: (reducedMotion) => {
          set({ reducedMotion });
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("reduce-motion", reducedMotion);
          }
        },

        setDevMode: (isDevMode) => set({ isDevMode }),
        toggleInspector: () =>
          set((state) => ({ inspectorOpen: !state.inspectorOpen })),
        setSelectedTab: (selectedTab) => set({ selectedTab }),

        saveScrollPosition: (key, position) =>
          set((state) => ({
            scrollPositions: { ...state.scrollPositions, [key]: position },
          })),

        getScrollPosition: (key) => get().scrollPositions[key] ?? 0,
      }),
      {
        name: "ui-store",
        partialize: (state) => ({
          isSidebarOpen: state.isSidebarOpen,
          viewMode: state.viewMode,
          density: state.density,
          fontSize: state.fontSize,
          animationsEnabled: state.animationsEnabled,
          reducedMotion: state.reducedMotion,
        }),
      }
    ),
    { name: "UIStore" }
  )
);
