import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../services/api';

interface Notification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Notification[]>('/notifications')
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('notifications.title')}</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sushi-400 hover:text-sushi-300 text-sm flex items-center"
          >
            <CheckCheck size={16} className="mr-1" />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <Bell className="mx-auto text-gray-500 mb-4" size={48} />
          <p className="text-gray-400">{t('notifications.noNotifications')}</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 divide-y divide-gray-700">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`px-5 py-4 ${!notif.isRead ? 'bg-sushi-900/10' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {!notif.isRead && (
                    <span className="inline-block w-2 h-2 bg-sushi-500 rounded-full mr-2 mt-1.5 flex-shrink-0" />
                  )}
                  <p className={`${!notif.isRead ? 'text-white' : 'text-gray-300'} inline`}>
                    {notif.message}
                  </p>
                </div>
                <span className="text-gray-500 text-xs ml-4 flex-shrink-0">
                  {formatDate(notif.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
