import React, { useState, useEffect } from 'react';
import { notificationApi } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Pagination from '../components/ui/Pagination';

const TYPE_ICON = {
  EventApproved:          { icon: 'fa-calendar-check', color: 'bg-green-100 text-green-600' },
  RegistrationConfirmed:  { icon: 'fa-clipboard-check', color: 'bg-blue-100 text-blue-600' },
  EventReminder:          { icon: 'fa-bell', color: 'bg-yellow-100 text-yellow-600' },
  NewPost:                { icon: 'fa-comment', color: 'bg-purple-100 text-purple-600' },
  CertificateIssued:      { icon: 'fa-certificate', color: 'bg-primary-100 text-primary-600' },
  BadgeAwarded:           { icon: 'fa-medal', color: 'bg-yellow-100 text-yellow-500' },
};

function timeAgo(dt) {
  const raw = String(dt);
  const d = new Date(raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 0) return 'Vừa xong';
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 15;

  const load = (p = 1) => {
    setLoading(true);
    notificationApi.getAll({ page: p, pageSize: PAGE_SIZE })
      .then(r => { setItems(r.data.items || []); setTotalCount(r.data.totalCount || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const markRead = async (id) => {
    await notificationApi.markRead(id).catch(() => {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAll = async () => {
    await notificationApi.markAllRead().catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = items.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thông báo</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} chưa đọc</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="btn-secondary btn-sm flex items-center gap-2">
            <i className="fa-solid fa-check-double" /> Đọc tất cả
          </button>
        )}
      </div>

      {/* List */}
      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-bell-slash text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const t = TYPE_ICON[n.type] || { icon: 'fa-bell', color: 'bg-gray-100 text-gray-500' };
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`card p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow ${!n.isRead ? 'border-primary-200 bg-primary-50/30' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.color}`}>
                  <i className={`fa-solid ${t.icon} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(totalCount / PAGE_SIZE)}
        onPageChange={setPage}
      />
    </div>
  );
}
