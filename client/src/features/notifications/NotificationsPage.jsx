import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { broadcastNotificationsUpdated, notificationsApi } from '../../services/watchtowerApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../../components/ui/DataState.jsx';

export function NotificationsPage() {
  const { t, formatDate } = useI18n();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    const res = await notificationsApi.list();
    return res?.data || [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((rows) => {
        if (!active) return;
        setNotifications(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || t('common.errorTitle'));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchNotifications, t]);

  const reload = async () => {
    try {
      const rows = await fetchNotifications();
      setNotifications(rows);
      setError('');
      broadcastNotificationsUpdated(rows.filter((item) => !item.isRead).length);
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      await reload();
    } catch (err) {
      setError(err?.message || t('common.errorTitle'));
    }
  };

  const visible = notifications.filter((n) => (filter === 'UNREAD' ? !n.isRead : true));
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{t('notifications.title')}</h2>
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{t('notifications.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg p-1 bg-[#F1F5F9] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#273449]">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'ALL'
                  ? 'bg-[#FFFFFF] dark:bg-[#111827] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#64748B] dark:text-[#9CA3AF]'
              }`}
            >
              {t('notifications.filterAll')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'UNREAD'
                  ? 'bg-[#FFFFFF] dark:bg-[#111827] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#64748B] dark:text-[#9CA3AF]'
              }`}
            >
              {t('notifications.filterUnread')} ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAll}>
              <CheckCheck className="w-4 h-4" aria-hidden="true" />
              <span>{t('notifications.markAllRead')}</span>
            </Button>
          )}
        </div>
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : visible.length === 0 ? (
        <EmptyState icon={Bell} title={t('notifications.empty')} />
      ) : (
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449] divide-y divide-[#E2E8F0] dark:divide-[#273449]">
          {visible.map((item) => (
            <div
              key={item.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                !item.isRead ? 'bg-[#6366F1]/[0.03] dark:bg-[#818CF8]/[0.05]' : ''
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-sm text-[#111827] dark:text-[#F8FAFC]">
                    {item.title}
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                  <span
                    className={
                      item.isRead
                        ? 'text-[#64748B] dark:text-[#9CA3AF]'
                        : 'text-[#6366F1] dark:text-[#818CF8] font-medium'
                    }
                  >
                    {item.isRead ? t('notifications.read') : t('notifications.unread')}
                  </span>
                </div>
                <p className="text-sm text-[#64748B] dark:text-[#9CA3AF]">{item.message}</p>
                <p className="text-xs text-[#9CA3AF] tabular-nums">
                  {formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>

              {!item.isRead && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkRead(item.id)}
                  className="self-start sm:self-center"
                >
                  {t('notifications.markRead')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
