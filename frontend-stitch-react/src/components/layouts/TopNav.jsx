import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../common/Icon';
import { ROLE_LABELS } from '../../utils/navigation';

export default function TopNav({ onMenuToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    let mounted = true;

    notificationApi.getAll({ page: 1, pageSize: 20 })
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setHasUnreadNotifications(items.some((item) => !item.isRead));
      })
      .catch(() => {
        if (mounted) setHasUnreadNotifications(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const avatarUrl = user?.avatarUrl
    || user?.avatar
    || user?.imageUrl
    || user?.photoUrl
    || user?.profileImageUrl
    || user?.profile?.avatarUrl
    || user?.profile?.avatar
    || user?.profile?.imageUrl;

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 md:pl-72 z-40 bg-white/80 backdrop-blur-md sticky top-0 border-b border-outline">
      <div className="flex items-center gap-4 flex-1">
        <button className="md:hidden p-2 hover:bg-primary-container rounded-xl transition-colors" onClick={onMenuToggle}>
          <Icon name="menu" className="text-primary" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/thong-bao')}
          className="relative p-2.5 text-on-surface-variant hover:text-primary hover:bg-primary-container/30 rounded-xl transition-all"
          aria-label="Mở trang thông báo"
        >
          <Icon name="notifications" />
          {hasUnreadNotifications && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
          )}
        </button>
        <div className="flex items-center gap-3 pl-2 border-l border-outline">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface">{user?.fullName || user?.email || 'Người dùng'}</p>
            <p className="text-[10px] text-primary font-medium">{ROLE_LABELS[user?.role] || 'Tình nguyện viên'}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl overflow-hidden ring-2 ring-primary-container bg-primary-container flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Icon name="person" className="text-primary" size={20} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}