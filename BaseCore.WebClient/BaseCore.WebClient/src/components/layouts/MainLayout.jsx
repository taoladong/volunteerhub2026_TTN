import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { profileApi } from '../../services/api';

const NAV = {
  Volunteer: [
    { to: '/dashboard', icon: 'fa-gauge', label: 'Tổng quan' },
    { to: '/events', icon: 'fa-calendar-days', label: 'Sự kiện' },
    { to: '/my-registrations', icon: 'fa-clipboard-list', label: 'Đăng ký của tôi' },
    { to: '/my-donations', icon: 'fa-hand-holding-heart', label: 'Ủng hộ của tôi' },
    { to: '/profile', icon: 'fa-user', label: 'Hồ sơ' },
    { to: '/profile/passport', icon: 'fa-id-card', label: 'Hộ chiếu tình nguyện' },
    { to: '/my-badges', icon: 'fa-medal', label: 'Huy hiệu' },
    { to: '/my-certificates', icon: 'fa-certificate', label: 'Chứng chỉ' },
    { to: '/notifications', icon: 'fa-bell', label: 'Thông báo' },
  ],
  Organizer: [
    { to: '/dashboard', icon: 'fa-gauge', label: 'Tổng quan' },
    { to: '/events', icon: 'fa-calendar-days', label: 'Sự kiện công khai' },
    { to: '/my-events', icon: 'fa-list-check', label: 'Sự kiện của tôi' },
    { to: '/events/create', icon: 'fa-circle-plus', label: 'Tạo sự kiện' },
    { to: '/organizer/insights', icon: 'fa-chart-line', label: 'Báo cáo tác động' },
    { to: '/organizer/verification', icon: 'fa-building-shield', label: 'Xác minh tổ chức' },
    { to: '/notifications', icon: 'fa-bell', label: 'Thông báo' },
  ],
  Sponsor: [
    { to: '/dashboard', icon: 'fa-gauge', label: 'Tổng quan' },
    { to: '/events', icon: 'fa-calendar-days', label: 'Sự kiện công khai' },
    { to: '/my-sponsorships', icon: 'fa-hand-holding-dollar', label: 'Tài trợ của tôi' },
    { to: '/notifications', icon: 'fa-bell', label: 'Thông báo' },
  ],
  Admin: [
    { to: '/dashboard', icon: 'fa-gauge', label: 'Tổng quan' },
    { to: '/admin/events', icon: 'fa-calendar-check', label: 'Duyệt sự kiện' },
    { to: '/admin/organizer-verifications', icon: 'fa-building-shield', label: 'Duyệt tổ chức' },
    { to: '/admin/volunteer-verifications', icon: 'fa-id-card', label: 'Duyệt volunteer' },
    { to: '/admin/users', icon: 'fa-users', label: 'Quản lý người dùng' },
    { to: '/admin/categories', icon: 'fa-tags', label: 'Danh mục' },
    { to: '/admin/skills', icon: 'fa-star', label: 'Kỹ năng' },
    { to: '/admin/ratings', icon: 'fa-star-half-stroke', label: 'Kiểm duyệt đánh giá' },
    { to: '/admin/monitoring', icon: 'fa-shield-halved', label: 'Giám sát' },
    { to: '/admin/export', icon: 'fa-file-export', label: 'Xuất dữ liệu' },
    { to: '/notifications', icon: 'fa-bell', label: 'Thông báo' },
  ],
};

const ROLE_LABEL = {
  Volunteer: 'Tình nguyện viên',
  Organizer: 'Nhà tổ chức',
  Sponsor: 'Nhà tài trợ',
  Admin: 'Quản trị viên',
};

const ROLE_BADGE = {
  Volunteer: { bg: 'rgba(27,97,201,0.18)', color: '#7aaaf5' },
  Organizer: { bg: 'rgba(124,58,237,0.18)', color: '#a78bfa' },
  Sponsor: { bg: 'rgba(245,158,11,0.18)', color: '#fbbf24' },
  Admin: { bg: 'rgba(239,68,68,0.18)', color: '#f87171' },
};

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.innerWidth >= 768
  ));
  const mobileModeRef = useRef(null);

  const navItems = NAV[user?.role] || [];
  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  useEffect(() => {
    const syncLayout = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);

      if (mobileModeRef.current !== nextIsMobile) {
        mobileModeRef.current = nextIsMobile;
        setSidebarOpen(!nextIsMobile);
      }
    };

    syncLayout();
    window.addEventListener('resize', syncLayout);

    return () => window.removeEventListener('resize', syncLayout);
  }, []);

  useEffect(() => {
    if (user?.role !== 'Volunteer') {
      setAvatarUrl('');
      return undefined;
    }

    let alive = true;
    profileApi
      .getMyProfile()
      .then((response) => {
        if (alive) setAvatarUrl(response.data?.profile?.avatarUrl || '');
      })
      .catch(() => {
        if (alive) setAvatarUrl('');
      });

    const syncAvatar = (event) => {
      setAvatarUrl(event.detail?.avatarUrl || '');
    };

    window.addEventListener('volunteerhub:profile-updated', syncAvatar);

    return () => {
      alive = false;
      window.removeEventListener('volunteerhub:profile-updated', syncAvatar);
    };
  }, [user?.role, user?.id]);

  const closeSidebarOnMobile = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.charAt(0)?.toUpperCase() || 'U';
  const roleBadge = ROLE_BADGE[user?.role] || { bg: 'rgba(255,255,255,0.15)', color: '#fff' };
  const avatarFallback = (
    <span className="flex h-full w-full items-center justify-center">{initials}</span>
  );
  const renderAvatar = (className) => (
    <div
      className={`${className} rounded-full overflow-hidden flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ background: '#1b61c9' }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setAvatarUrl('')}
        />
      ) : avatarFallback}
    </div>
  );

  return (
    <div className="relative flex h-screen overflow-hidden" style={{ background: '#f8fafc' }}>
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={
          isMobile
            ? `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col transition-transform duration-300`
            : `${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'} flex-shrink-0 flex flex-col transition-all duration-300`
        }
        style={{ background: '#181d26', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1b61c9' }}>
            <i className="fa-solid fa-leaf text-white text-xs" />
          </div>
          <span className="font-semibold text-white text-[15px] tracking-[0.12px]">VolunteerHub</span>
        </div>

        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            {renderAvatar('w-8 h-8 text-sm')}
            <div className="min-w-0">
              <p className="text-white text-[13px] font-medium truncate leading-tight">{user?.name}</p>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block"
                style={{ background: roleBadge.bg, color: roleBadge.color }}
              >
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeSidebarOnMobile}
              className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
            >
              <i className={`fa-solid ${item.icon} w-4 text-center`} style={{ fontSize: 13 }} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full"
            style={{ color: 'rgba(248,113,113,0.80)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <i className="fa-solid fa-right-from-bracket w-4 text-center" style={{ fontSize: 13 }} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="flex items-center gap-4 px-5 flex-shrink-0"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e0e2e6',
            height: 52,
            boxShadow: 'rgba(15,48,106,0.04) 0px 1px 0px',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: 'rgba(4,14,32,0.55)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f5ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <i className="fa-solid fa-bars" style={{ fontSize: 15 }} />
          </button>

          <Link
            to="/events"
            className="flex items-center gap-1.5 text-[13px] font-medium transition-colors"
            style={{ color: 'rgba(4,14,32,0.55)', letterSpacing: '0.07px', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1b61c9')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(4,14,32,0.55)')}
          >
            <i className="fa-solid fa-calendar-days" />
            Sự kiện công khai
          </Link>

          <div className="flex-1" />

          <Link
            to="/notifications"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: 'rgba(4,14,32,0.55)', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f5ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <i className="fa-solid fa-bell" style={{ fontSize: 15 }} />
          </Link>

          <div className="flex items-center gap-2.5">
            {renderAvatar('w-7 h-7 text-xs')}
            <span className="text-[13px] font-medium hidden sm:block" style={{ color: '#181d26', letterSpacing: '0.07px' }}>
              {user?.name}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
