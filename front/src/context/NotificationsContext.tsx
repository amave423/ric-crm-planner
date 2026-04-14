import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { CreateNotificationInput, NotificationItem } from "../types/notification";

const LS_NOTIFICATIONS = "ric_notifications_v1";

interface NotificationsContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (input: CreateNotificationInput) => NotificationItem;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

function readLS<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nextId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState<NotificationItem[]>(() => readLS<NotificationItem[]>(LS_NOTIFICATIONS, []));

  useEffect(() => {
    localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(items));
  }, [items]);

  const notifications = useMemo(() => {
    if (!user) return [];
    return items
      .filter((x) => typeof x.userId === "undefined" || Number(x.userId) === Number(user.id))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [items, user]);

  const unreadCount = useMemo(() => notifications.filter((x) => !x.read).length, [notifications]);

  const addNotification = useCallback(
    (input: CreateNotificationInput): NotificationItem => {
      const created: NotificationItem = {
        id: nextId(),
        userId: input.userId ?? user?.id,
        title: input.title,
        message: input.message,
        link: input.link,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setItems((prev) => [created, ...prev]);
      return created;
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    setItems((prev) =>
      prev.map((x) => {
        const belongsToCurrent = typeof x.userId === "undefined" || Number(x.userId) === Number(user.id);
        return belongsToCurrent && !x.read ? { ...x, read: true } : x;
      })
    );
  }, [user]);

  const markAsRead = useCallback(
    (id: string) => {
      if (!user) return;
      setItems((prev) =>
        prev.map((x) => {
          const belongsToCurrent = typeof x.userId === "undefined" || Number(x.userId) === Number(user.id);
          return x.id === id && belongsToCurrent && !x.read ? { ...x, read: true } : x;
        })
      );
    },
    [user]
  );

  const removeNotification = useCallback(
    (id: string) => {
      if (!user) return;
      setItems((prev) => prev.filter((x) => x.id !== id));
    },
    [user]
  );

  const clearNotifications = useCallback(() => {
    if (!user) return;
    setItems((prev) =>
      prev.filter((x) => typeof x.userId !== "undefined" && Number(x.userId) !== Number(user.id))
    );
  }, [user]);

  const value = useMemo<NotificationsContextType>(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAllAsRead,
      markAsRead,
      removeNotification,
      clearNotifications,
    }),
    [notifications, unreadCount, addNotification, markAllAsRead, markAsRead, removeNotification, clearNotifications]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return ctx;
}
