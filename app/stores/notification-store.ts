import { create } from "zustand";
import { SEED_NOTIFICATIONS, type NotificationItem } from "~/data/platform";

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: () => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: SEED_NOTIFICATIONS,
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  markRead: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
}));
