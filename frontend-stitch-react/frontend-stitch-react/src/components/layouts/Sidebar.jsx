import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../common/Icon';

const volunteerLinks = [
  { to: '/tinh-nguyen', icon: 'dashboard', label: 'Trang chủ' },
  { to: '/su-kien', icon: 'calendar_month', label: 'Tìm sự kiện' },
  { to: '/dang-ky-cua-toi', icon: 'fact_check', label: 'Đăng ký của tôi' },
  { to: '/ung-ho-cua-toi', icon: 'volunteer_activism', label: 'Ủng hộ của tôi' },
  { to: '/ho-so', icon: 'person', label: 'Hồ sơ cá nhân' },
  { to: '/kenh-giao-tiep', icon: 'forum', label: 'Kênh trao đổi' },
  { to: '/ho-so/passport', icon: 'military_tech', label: 'Chứng nhận' },
];

const organizerLinks = [
  { to: '/to-chuc', icon: 'dashboard', label: 'Trang chủ' },
  { to: '/quan-ly-su-kien', icon: 'event', label: 'Quản lý sự kiện' },
  { to: '/dang-ky-diem-danh', icon: 'how_to_reg', label: 'Đăng ký & Điểm danh' },
  { to: '/to-chuc/tai-tro', icon: 'handshake', label: 'Tài trợ' },
  { to: '/to-chuc/chien-dich', icon: 'volunteer_activism', label: 'Chiến dịch quyên góp' },
  { to: '/kenh-giao-tiep', icon: 'forum', label: 'Kênh trao đổi' },
  { to: '/xac-minh-to-chuc', icon: 'verified', label: 'Xác minh tổ chức' },
];

const sponsorLinks = [
  { to: '/tai-tro', icon: 'dashboard', label: 'Trang chủ' },
  { to: '/tai-tro-quyen-gop', icon: 'volunteer_activism', label: 'Tài trợ & Quyên góp' },
  { to: '/ho-so-tai-tro', icon: 'business', label: 'Hồ sơ nhà tài trợ' },
];

const adminLinks = [
  { to: '/quan-tri', icon: 'dashboard', label: 'Trang chủ' },
  { to: '/quan-tri/nguoi-dung', icon: 'group', label: 'Người dùng' },
  { to: '/quan-tri/su-kien', icon: 'event', label: 'Sự kiện' },
  { to: '/quan-tri/xac-minh', icon: 'verified_user', label: 'Xác minh & Phê duyệt' },
  { to: '/quan-tri/tai-chinh', icon: 'monitoring', label: 'Giám sát tài chính' },
  { to: '/quan-tri/danh-muc', icon: 'category', label: 'Danh mục & Kỹ năng' },
  { to: '/quan-tri/danh-gia', icon: 'reviews', label: 'Đánh giá' },
  { to: '/quan-tri/he-thong', icon: 'settings', label: 'Hệ thống' },
];

function getLinksForRole(role) {
  switch (role) {
    case 'Admin': return adminLinks;
    case 'Organizer': return organizerLinks;
    case 'Sponsor': return sponsorLinks;
    default: return volunteerLinks;
  }
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = getLinksForRole(user?.role);

  const handleLogout = async () => {
    await logout();
    navigate('/dang-nhap');
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 bg-white border-r border-outline z-50
          flex flex-col transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="volunteer_activism" className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-extrabold text-primary font-headline">VolunteerHub</h1>
          </div>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest pl-10 opacity-70">
            Nền tảng Tình nguyện
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/ho-so' || link.to === '/tinh-nguyen' || link.to === '/to-chuc' || link.to === '/tai-tro' || link.to === '/quan-tri'}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <Icon name={link.icon} size={22} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 space-y-2">
          <NavLink
            to="/xac-thuc-chung-nhan"
            onClick={onClose}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
          >
            <Icon name="verified" size={20} />
            <span>Xác thực chứng nhận</span>
          </NavLink>
          <NavLink
            to="/thong-bao"
            onClick={onClose}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
          >
            <Icon name="notifications" size={20} />
            <span>Thông báo</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-left hover:!text-error hover:!bg-error-container"
          >
            <Icon name="logout" size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}