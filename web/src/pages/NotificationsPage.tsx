import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../lib/api';
import type { NotificationItem } from '../lib/api';
import { Bell, CheckCheck, ChevronRight, Inbox } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list({ limit: 50 });
      setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Live polling every 6 seconds to stay synced with actions taken on React Native mobile app
    const interval = setInterval(() => {
      notificationsApi
        .list({ limit: 50 })
        .then((res) => setNotifications(res.notifications))
        .catch(() => {});
    }, 6_000);

    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.is_read) {
      await notificationsApi.markRead([n.id]).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
    }

    if (n.group_id) {
      if (n.type?.includes('withdrawal')) {
        navigate(`/groups/${n.group_id}?tab=withdrawals`);
      } else if (n.type?.includes('objective')) {
        navigate(`/groups/${n.group_id}?tab=objectives`);
      } else {
        navigate(`/groups/${n.group_id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Restez informé des cotisations, demandes de retrait et objectifs de vos groupes.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs transition border border-slate-200"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          Tout marquer comme lu
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-600 font-bold text-base">Aucune notification</p>
          <p className="text-xs text-slate-400">Vous recevrez des alertes dès qu'une activité aura lieu dans vos groupes.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-5 transition cursor-pointer flex items-center justify-between gap-4 ${
                !n.is_read ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                  <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                </div>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">{n.message}</p>
                <span className="text-[11px] text-slate-400 block pt-1 font-normal">
                  {new Date(n.created_at).toLocaleString('fr-FR')}
                </span>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
