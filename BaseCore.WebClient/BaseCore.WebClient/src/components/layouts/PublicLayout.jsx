import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function PublicLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Giới thiệu' },
    { to: '/events', label: 'Sự kiện' },
    { to: '/verify/check', label: 'Tra cứu chứng chỉ' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'rgba(255,255,255,0.98)',
          borderBottom: '1px solid #e5e7eb',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between" style={{ height: 60 }}>
            <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1b61c9' }}>
                <i className="fa-solid fa-leaf text-white text-sm" />
              </div>
              <span className="font-bold text-lg" style={{ color: '#181d26', letterSpacing: '-0.3px' }}>
                VolunteerHub
              </span>
            </Link>

            <nav className="hidden md:flex items-center p-1.5 bg-slate-100/60 rounded-full border border-slate-200/60 backdrop-blur-sm">
              {navLinks.map((link) => {
                const active = location.pathname === link.to;

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative px-5 py-2 rounded-full text-[14.5px] font-semibold tracking-wide transition-all duration-300 ease-out ${
                      active
                        ? 'text-primary-600 bg-white shadow-sm ring-1 ring-slate-200/50'
                        : 'text-slate-500 hover:text-primary-600 hover:bg-slate-50/80'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary btn-sm">
                  <i className="fa-solid fa-gauge mr-1.5" style={{ fontSize: 12 }} />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary btn-sm hidden sm:inline-flex">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="btn-primary btn-sm hidden sm:inline-flex">
                    Đăng ký
                  </Link>
                </>
              )}
              <button
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg"
                style={{ color: 'rgba(4,14,32,0.55)', background: menuOpen ? '#f0f5ff' : 'transparent' }}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`} style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium"
                style={{ color: '#181d26', textDecoration: 'none' }}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ color: '#1b61c9', textDecoration: 'none' }}
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ color: '#181d26', textDecoration: 'none' }}
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer style={{ background: '#181d26' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1b61c9' }}>
                  <i className="fa-solid fa-hand-holding-heart text-white" style={{ fontSize: 12 }} />
                </div>
                <span className="font-bold text-white text-base">VolunteerHub</span>
              </div>
              <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Nền tảng kết nối tình nguyện viên, ban tổ chức và nhà tài trợ. Mọi đóng góp đều được ghi nhận.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Liên kết</h4>
              <div className="flex flex-col gap-2 text-sm">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#7aaaf5')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Thông tin</h4>
              <div className="flex flex-col gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span>Đồ án thực tập — CNTT59</span>
                <span>Học viện Kỹ thuật Quân sự</span>
                <a href="https://github.com/taoladong/volunteerhub" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-400 transition-colors" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                  <i className="fa-brands fa-github" /> GitHub Repository
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 text-center text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} VolunteerHub · CNTT59 - Học viện Kỹ thuật Quân sự
          </div>
        </div>
      </footer>
    </div>
  );
}
