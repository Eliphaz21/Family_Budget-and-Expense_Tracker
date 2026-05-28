import { Notification, FamilyUser } from '../types';
import { Bell, Check, Trash2 } from 'lucide-react';

interface NotificationsPanelProps {
  notifications: Notification[];
  currentUser: FamilyUser | null;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationsPanel({
  notifications,
  currentUser,
  onMarkAsRead,
  onClearAll
}: NotificationsPanelProps) {
  // Filters targeting 'all' or specifically current user's role
  const filteredNotifications = notifications.filter((n) => {
    if (!currentUser) return false;
    return n.recipientRole === 'all' || n.recipientRole === currentUser.role;
  });

  const unreadCount = filteredNotifications.filter(
    (n) => currentUser && !n.readBy.includes(currentUser.uid)
  ).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-blue-600 rounded shrink-0"></span>
          <div className="relative">
            <Bell className="w-4 h-4 text-blue-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            )}
          </div>
          <span className="font-display font-bold text-slate-800 tracking-tight text-xs uppercase text-slate-500 tracking-wider">
            Notifications ({unreadCount} new)
          </span>
        </div>
        {filteredNotifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-slate-400 hover:text-rose-600 font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            No active budget alerts. Alem is doing fine.
          </div>
        ) : (
          filteredNotifications.map((not) => {
            const isRead = currentUser ? not.readBy.includes(currentUser.uid) : false;

            return (
              <div
                key={not.id}
                className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 text-xs transition-all ${
                  isRead
                    ? 'bg-slate-50 border-slate-150 opacity-60'
                    : 'bg-blue-50/30 border-blue-105 shadow-xs'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`font-sans leading-normal ${isRead ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                    {not.text}
                  </p>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                    {new Date(not.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {!isRead && currentUser && (
                  <button
                    onClick={() => onMarkAsRead(not.id)}
                    className="p-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 cursor-pointer self-center"
                    title="Mark as Read"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
