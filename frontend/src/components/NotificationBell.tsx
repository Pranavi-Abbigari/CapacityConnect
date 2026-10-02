import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/client';
import type { AppNotification } from '../types';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data);
    } catch {
      // Ignore background fetch errors
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      try {
        await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'CERTIFICATE':
        return '🏆';
      case 'ACHIEVEMENT':
        return '🎯';
      case 'SUCCESS':
        return '🎉';
      case 'DEADLINE':
        return '⏰';
      case 'ANNOUNCEMENT':
        return '📢';
      case 'FEEDBACK':
        return '⭐';
      case 'ALERT':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };


  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl transition-all cursor-pointer"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-linear-to-r from-rose-500 to-indigo-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 px-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <span className="text-2xl block mb-1">📭</span>
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-800/60 ${
                    !notif.is_read ? 'bg-indigo-950/20' : 'bg-transparent'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !notif.is_read ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          title="Mark as read"
                          className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 hover:bg-indigo-400 ring-2 ring-indigo-500/20"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      {new Date(notif.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
