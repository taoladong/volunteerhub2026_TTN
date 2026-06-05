import React, { useEffect, useState } from 'react';
import { notificationApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

const getNotificationTone = (type = '') => {
  const normalized = String(type).toLowerCase();

  if (normalized.includes('approved') || normalized.includes('verified') || normalized.includes('confirmed')) {
    return { icon: 'check_circle', box: 'bg-success-container text-success', dot: 'bg-success' };
  }
  if (normalized.includes('rejected') || normalized.includes('cancel') || normalized.includes('failed')) {
    return { icon: 'error', box: 'bg-error-container text-error', dot: 'bg-error' };
  }
  if (normalized.includes('pending') || normalized.includes('request') || normalized.includes('understaffed')) {
    return { icon: 'warning', box: 'bg-warning-container text-amber-700', dot: 'bg-warning' };
  }
  if (normalized.includes('registration') || normalized.includes('attend') || normalized.includes('checkin')) {
    return { icon: 'how_to_reg', box: 'bg-primary-container text-primary', dot: 'bg-primary' };
  }
  if (normalized.includes('event')) {
    return { icon: 'event', box: 'bg-primary-container text-primary', dot: 'bg-primary' };
  }
  if (normalized.includes('donation') || normalized.includes('sponsor')) {
    return { icon: 'volunteer_activism', box: 'bg-success-container text-success', dot: 'bg-success' };
  }

  return { icon: 'notifications', box: 'bg-surface-variant text-on-surface-variant', dot: 'bg-primary' };
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi.getAll({ page: 1, pageSize: 50 })
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : res.data?.items || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    await notificationApi.markRead(id);
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Thông báo</h2>
          <p className="text-on-surface-variant">Theo dõi cập nhật mới từ sự kiện, đăng ký, xác minh và tài trợ.</p>
        </div>
        {notifications.some((item) => !item.isRead) && (
          <button type="button" onClick={handleMarkAllRead} className="btn-secondary inline-flex items-center gap-2 w-fit">
            <Icon name="done_all" size={20} />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-outline">
          <Icon name="notifications_none" size={64} className="text-outline mx-auto mb-4" />
          <h3 className="text-xl font-bold text-on-surface mb-2">Không có thông báo</h3>
          <p className="text-on-surface-variant">Bạn sẽ nhận được thông báo khi có hoạt động mới.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const tone = getNotificationTone(notif.type);
            const title = notif.title || 'Thông báo mới';
            const message = notif.message && notif.message !== title ? notif.message : '';

            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                className={`w-full rounded-2xl border bg-white p-5 text-left shadow-soft transition-all ${
                  notif.isRead ? 'border-outline opacity-75' : 'border-primary/20 ring-1 ring-primary/10 hover:border-primary/40 hover:shadow-card'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${notif.isRead ? 'bg-surface-variant text-on-surface-variant' : tone.box}`}>
                    <Icon name={tone.icon} size={24} filled={!notif.isRead} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-label-md font-bold ${notif.isRead ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                          {title}
                        </p>
                        {message && (
                          <p className="mt-1 text-body-sm leading-6 text-on-surface-variant">
                            {message}
                          </p>
                        )}
                      </div>
                      {!notif.isRead && <span className={`mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone.dot}`} />}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                      {notif.type && <span className="rounded-full bg-surface-variant px-2 py-1">{notif.type}</span>}
                      <span>{notif.createdAt ? new Date(notif.createdAt).toLocaleString('vi-VN') : 'Vừa cập nhật'}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
