import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  notifications: Notification[];
  unreadCount: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
  } | null;
  organization: {
    id: string;
    name: string;
    plan: string;
  } | null;
  theme: "light" | "dark" | "system";
  locale: string;
  timezone: string;
  sidebarCollapsed: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
  currentPage: string;
  isOnline: boolean;
  lastSyncAt: number | null;

  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setUser: (user: AppState["user"]) => void;
  setOrganization: (org: AppState["organization"]) => void;
  setTheme: (theme: AppState["theme"]) => void;
  setLocale: (locale: string) => void;
  setTimezone: (timezone: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBreadcrumbs: (breadcrumbs: AppState["breadcrumbs"]) => void;
  setCurrentPage: (page: string) => void;
  setOnline: (online: boolean) => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  logout: () => void;
}

const initialState = {
  isInitialized: false,
  isLoading: false,
  notifications: [] as Notification[],
  unreadCount: 0,
  user: null,
  organization: null,
  theme: "system" as const,
  locale: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  sidebarCollapsed: false,
  breadcrumbs: [] as Array<{ label: string; href?: string }>,
  currentPage: "",
  isOnline: true,
  lastSyncAt: null as number | null,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,

        setInitialized: (value) => set({ isInitialized: value }),
        setLoading: (value) => set({ isLoading: value }),

        setUser: (user) =>
          set({
            user,
            unreadCount: user
              ? get().notifications.filter((n) => !n.read).length
              : 0,
          }),

        setOrganization: (org) => set({ organization: org }),

        setTheme: (theme) => {
          set({ theme });
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", theme === "dark");
          }
        },

        setLocale: (locale) => set({ locale }),
        setTimezone: (timezone) => set({ timezone }),

        toggleSidebar: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }),

        setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
        setCurrentPage: (page) => set({ currentPage: page }),
        setOnline: (online) => set({ isOnline: online }),

        addNotification: (notification) => {
          const id = `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: Date.now(),
            read: false,
          };

          set((state) => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
          }));
        },

        markNotificationRead: (id) =>
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          })),

        markAllNotificationsRead: () =>
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
          })),

        removeNotification: (id) =>
          set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            return {
              notifications: state.notifications.filter((n) => n.id !== id),
              unreadCount:
                notification && !notification.read
                  ? Math.max(0, state.unreadCount - 1)
                  : state.unreadCount,
            };
          }),

        clearNotifications: () =>
          set({ notifications: [], unreadCount: 0 }),

        logout: () =>
          set({
            ...initialState,
            isInitialized: true,
            theme: get().theme,
            locale: get().locale,
            timezone: get().timezone,
          }),
      })),
      {
        name: "app-store",
        partialize: (state) => ({
          theme: state.theme,
          locale: state.locale,
          timezone: state.timezone,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: "AppStore" }
  )
);
