"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Video } from "lucide-react";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import {
  getMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notification/notification.actions";
import type { Notification } from "@/modules/notification/notification.types";

const POLL_INTERVAL_MS = 60_000;

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Substitui o sino decorativo antigo (ícone estático + bolinha vermelha
 * fixa) por notificações reais, persistidas no banco. Sem infra de realtime
 * no projeto — atualiza no mount e via poll simples, mesmo idioma do
 * poll leve usado no painel de vídeo do aluno.
 */
export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      getMyNotificationsAction().then((result) => {
        if (cancelled || !result.success || !result.data) return;
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unreadCount);
      });
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleOpen = (notification: Notification) => {
    if (!notification.readAt) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      void markNotificationReadAction({ notificationId: notification.id });
    }
    if (notification.link) router.push(notification.link);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnreadCount(0);
    void markAllNotificationsReadAction();
  };

  return (
    <Dropdown
      align="right"
      width="w-64"
      trigger={
        <button
          className="relative text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-rose-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-semibold text-slate-500">Notificações</span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <CheckCheck className="h-3 w-3" />
            Marcar todas lidas
          </button>
        )}
      </div>
      <DropdownSeparator />

      {notifications.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-slate-400">Nenhuma notificação ainda.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((notification) => (
            <DropdownItem key={notification.id} onClick={() => handleOpen(notification)}>
              <Video className="w-4 h-4 mr-3 mt-0.5 shrink-0 text-slate-400 group-hover:text-primary" />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs ${notification.readAt ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                  {notification.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{notification.body}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(notification.createdAt)}</p>
              </div>
              {!notification.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            </DropdownItem>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
