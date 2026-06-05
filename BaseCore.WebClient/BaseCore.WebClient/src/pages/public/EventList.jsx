import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { eventApi, eventCategoryApi, skillApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import EventCard from '../../components/ui/EventCard';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const MapView = lazy(() => import('../../components/ui/MapView'));

const MONTH_COLORS = [
  '#0891b2','#7c3aed','#059669','#0ea5e9','#e11d48','#d97706',
  '#1b61c9','#10b981','#8b5cf6','#f97316','#6366f1','#dc2626',
];
const MONTH_VI = ['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'];

function DateBadge({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const m = d.getMonth();
  return (
    <div style={{
      width: 52, height: 56, background: MONTH_COLORS[m], borderRadius: 12,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, lineHeight: 1,
    }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{d.getDate()}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{MONTH_VI[m]}</span>
    </div>
  );
}

function UpcomingRow({ event }) {
  const full = event.maxParticipants > 0 && ((event.currentParticipants || 0) >= event.maxParticipants);
  const [hovered, setHovered] = useState(false);
  return (
    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12,
        background: '#fff', border: `1px solid ${hovered ? '#93c5fd' : '#e5e7eb'}`,
        boxShadow: hovered ? '0 2px 14px rgba(27,97,201,0.10)' : 'none',
        transition: 'all 0.14s',
      }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>
        <DateBadge date={event.startDate} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#181d26', marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(4,14,32,0.50)', flexWrap: 'wrap' }}>
            {event.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#1b61c9', fontSize: 11 }} />
                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.location}</span>
              </span>
            )}
            {event.category?.name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa-solid fa-tag" style={{ color: '#059669', fontSize: 10 }} />
                {event.category.name}
              </span>
            )}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, display: 'block', marginBottom: 4,
            background: full ? '#fee2e2' : 'rgba(27,97,201,0.09)',
            color: full ? '#dc2626' : '#1b61c9',
          }}>
            {full ? 'Đầy' : `${event.currentParticipants || 0}/${event.maxParticipants}`}
          </span>
          <i className="fa-solid fa-chevron-right" style={{ color: 'rgba(4,14,32,0.22)', fontSize: 11 }} />
        </div>
      </div>
    </Link>
  );
}

function SidebarCard({ title, icon, iconColor, children }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <div style={{ padding: '12px 16px', background: '#181d26', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className={`fa-solid ${icon}`} style={{ color: iconColor, fontSize: 13 }} />
        <span style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>{title}</span>
      </div>
      <div style={{ background: '#fafbfc', padding: 12 }}>{children}</div>
    </div>
  );
}

export default function EventList() {
  const { isAuthenticated, user }    = useAuth();
  const [events, setEvents]          = useState([]);
  const [upcoming, setUpcoming]      = useState([]);
  const [recommended, setRecommended]= useState([]);
  const [categories, setCategories]  = useState([]);
  const [skills, setSkills]          = useState([]);
  const [totalCount, setTotalCount]  = useState(0);
  const [loading, setLoading]        = useState(true);
  const [upLoading, setUpLoading]    = useState(true);
  const [recLoading, setRecLoading]  = useState(false);
  const [activeTab, setActiveTab]    = useState('');
  const [viewMode, setViewMode]      = useState('grid'); // 'grid' | 'map'
  const [locating, setLocating]      = useState(false);
  const [filters, setFilters]        = useState({
    keyword: '', categoryId: '', status: 'Approved',
    skillId: '', location: '', page: 1, pageSize: 9,
  });

  useEffect(() => {
    eventCategoryApi.getAll().then(r => setCategories(r.data || [])).catch(() => {});
    skillApi.getAll().then(r => setSkills(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setUpLoading(true);
    eventApi.getAll({ status: 'Approved', page: 1, pageSize: 5 })
      .then(r => setUpcoming(r.data?.items || []))
      .catch(() => {})
      .finally(() => setUpLoading(false));
  }, []);

  // Recommended: only for logged-in volunteers with skills
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Volunteer') return;
    setRecLoading(true);
    eventApi.getRecommended()
      .then(r => setRecommended(r.data || []))
      .catch(() => {})
      .finally(() => setRecLoading(false));
  }, [isAuthenticated, user]);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    eventApi.getAll(params)
      .then(r => { setEvents(r.data?.items || []); setTotalCount(r.data?.totalCount || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  const handleCategory = (catId) => {
    setActiveTab(catId);
    set('categoryId', catId);
  };

  const [userCoords, setUserCoords]   = useState(null);
  const [geoNote, setGeoNote]         = useState('');
  const [radiusKm, setRadiusKm]       = useState(0);
  // allExpanded: fetched whenever map view is active OR radius is set — bypasses pagination
  const [allExpanded, setAllExpanded] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Fetch full event list whenever map is open or radius is active
  useEffect(() => {
    if (viewMode !== 'map' && radiusKm === 0) return;
    setExpandedLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v !== '' && k !== 'page' && k !== 'pageSize'));
    eventApi.getAll({ ...params, page: 1, pageSize: 500 })
      .then(r => setAllExpanded(r.data?.items || []))
      .catch(() => {})
      .finally(() => setExpandedLoading(false));
  }, [viewMode, radiusKm, filters.keyword, filters.categoryId, filters.status, filters.skillId, filters.location]);

  const radiusEvents = useMemo(() => {
    if (!userCoords || radiusKm === 0) return null;
    return allExpanded
      .filter(ev => ev.latitude && ev.longitude)
      .map(ev => ({
        ...ev,
        _distance: haversine(userCoords.lat, userCoords.lng, parseFloat(ev.latitude), parseFloat(ev.longitude)),
      }))
      .filter(ev => ev._distance <= radiusKm)
      .sort((a, b) => a._distance - b._distance);
  }, [userCoords, radiusKm, allExpanded]);

  const handleLocateMe = () => {
    setViewMode('map');
    if (!navigator.geolocation) {
      setGeoNote('Trình duyệt không hỗ trợ định vị — đang hiển thị bản đồ tổng quan.');
      return;
    }
    setLocating(true);
    setGeoNote('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoNote('');
        setLocating(false);
      },
      (err) => {
        const msg = err.code === 1
          ? 'Bạn đã từ chối quyền vị trí — đang hiển thị bản đồ tổng quan.'
          : 'Không xác định được vị trí — đang hiển thị bản đồ tổng quan.';
        setGeoNote(msg);
        setLocating(false);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const stats = useMemo(() => [
    { icon: 'fa-calendar-check',     value: totalCount || 0,  label: 'Sự kiện đang mở',   color: '#1b61c9' },
    { icon: 'fa-tags',               value: categories.length, label: 'Danh mục hoạt động', color: '#059669' },
    { icon: 'fa-users',              value: '1.200+',          label: 'Tình nguyện viên',   color: '#7c3aed' },
    { icon: 'fa-hand-holding-heart', value: '48+',             label: 'Tổ chức tham gia',   color: '#d97706' },
  ], [totalCount, categories.length]);

  return (
    <div>

      {/* ════════ HERO ════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: 460 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center 40%',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(130deg, rgba(12,35,90,0.92) 0%, rgba(27,97,201,0.78) 55%, rgba(0,20,60,0.55) 100%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 24, marginBottom: 24,
            background: 'rgba(255,255,255,0.14)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.22)', fontSize: 14, fontWeight: 500,
          }}>
            <i className="fa-solid fa-leaf" /> Nền tảng tình nguyện Việt Nam
          </div>
          <h1 style={{
            color: '#fff', fontWeight: 800, lineHeight: 1.12, marginBottom: 18,
            fontSize: 'clamp(30px, 5.5vw, 56px)', maxWidth: 640,
          }}>
            Kết nối tình nguyện<br />viên với cộng đồng
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.72)', fontSize: 17, lineHeight: 1.65,
            maxWidth: 520, marginBottom: 36,
          }}>
            Hàng trăm cơ hội tình nguyện phù hợp với kỹ năng và đam mê của bạn — miễn phí, dễ đăng ký.
          </p>

          {/* Search row */}
          <div className="event-list-hero-search" style={{ display: 'flex', gap: 10, maxWidth: 580, flexWrap: 'wrap' }}>
            <div className="event-list-hero-search-field" style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <i className="fa-solid fa-magnifying-glass" style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(4,14,32,0.38)', fontSize: 14,
              }} />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện tình nguyện..."
                value={filters.keyword}
                onChange={e => set('keyword', e.target.value)}
                style={{
                  width: '100%', padding: '13px 14px 13px 46px', borderRadius: 12,
                  border: 'none', fontSize: 15, background: 'rgba(255,255,255,0.97)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.20)', outline: 'none', color: '#181d26',
                }}
              />
            </div>
            <Link className="event-list-hero-cta" to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 22px', borderRadius: 12,
              background: '#fff', color: '#1b61c9', fontWeight: 700, fontSize: 15,
              textDecoration: 'none', whiteSpace: 'nowrap',
              boxShadow: '0 8px 32px rgba(0,0,0,0.20)', transition: 'background 0.13s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f5ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <i className="fa-solid fa-user-plus" style={{ fontSize: 13 }} />
              Tham gia ngay
            </Link>
          </div>
        </div>
      </section>

      {/* ════════ CATEGORY TABS ══════════════════════════════ */}
      <section className="event-list-tabs-section" style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 60, zIndex: 20,
      }}>
        <div className="event-list-tabs-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div className="event-list-tabs-scroll" style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', padding: '10px 0', scrollbarWidth: 'none' }}>
            {[{ id: '', name: 'Tất cả' }, ...categories].map(cat => {
              const key = cat.id === '' ? '' : String(cat.id);
              const isActive = activeTab === key;
              return (
                <button key={key || 'all'} onClick={() => handleCategory(key)} style={{
                  padding: '7px 18px', borderRadius: 24, border: 'none',
                  fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.13s',
                  background: isActive ? '#1b61c9' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(4,14,32,0.60)',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(27,97,201,0.07)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ MAIN CONTENT ════════════════════════════════ */}
      <div className="event-list-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
        <div className="event-list-layout" style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

          {/* ── Event grid ──────────────────────────────────── */}
          <div className="event-list-results" style={{ flex: 1, minWidth: 0 }}>

            {/* ── Recommended (Volunteer only) ── */}
            {isAuthenticated && user?.role === 'Volunteer' && (recLoading || recommended.length > 0) && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#7c3aed', fontSize: 14 }} />
                  </div>
                  <div>
                    <h2 style={{ fontWeight: 700, fontSize: 16, color: '#181d26', margin: 0 }}>Gợi ý cho bạn</h2>
                    <p style={{ fontSize: 12, color: 'rgba(4,14,32,0.45)', margin: 0 }}>Dựa trên kỹ năng trong hồ sơ của bạn</p>
                  </div>
                </div>
                {recLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="event-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {recommended.map(ev => <EventCard key={ev.id} event={ev} highlight />)}
                  </div>
                )}
                <div style={{ height: 1, background: '#e5e7eb', margin: '28px 0 0' }} />
              </div>
            )}

            {/* Filter bar */}
            <div className="event-list-filter" style={{
              display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
              marginBottom: 20, padding: '12px 14px', borderRadius: 14,
              background: '#fff', border: '1px solid #e5e7eb',
            }}>
              {/* Keyword */}
              <div className="event-list-filter-field event-list-filter-keyword" style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                <i className="fa-solid fa-magnifying-glass" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(4,14,32,0.35)', fontSize: 12,
                }} />
                <input type="text" placeholder="Từ khóa..." value={filters.keyword}
                  onChange={e => set('keyword', e.target.value)}
                  className="input-field" style={{ paddingLeft: 34, fontSize: 13 }} />
              </div>

              {/* Skill */}
              <select className="event-list-filter-select input-field" value={filters.skillId} onChange={e => set('skillId', e.target.value)}
                style={{ width: 'auto', minWidth: 140, fontSize: 13 }}>
                <option value="">Tất cả kỹ năng</option>
                <option value="0">Không yêu cầu kỹ năng</option>
                {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              {/* Status */}
              <select className="event-list-filter-select input-field" value={filters.status} onChange={e => set('status', e.target.value)}
                style={{ width: 'auto', minWidth: 150, fontSize: 13 }}>
                <option value="">Tất cả trạng thái</option>
                <option value="Approved">Đang mở đăng ký</option>
                <option value="Completed">Đã hoàn thành</option>
              </select>

              {/* View toggle + locate me */}
              <div className="event-list-view-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                <button title="Xem dạng lưới"
                  onClick={() => setViewMode('grid')}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer',
                    background: viewMode === 'grid' ? '#1b61c9' : '#fff',
                    color: viewMode === 'grid' ? '#fff' : 'rgba(4,14,32,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <i className="fa-solid fa-grip text-xs" />
                </button>
                <button title="Bản đồ tình nguyện"
                  onClick={() => setViewMode('map')}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer',
                    background: viewMode === 'map' ? '#1b61c9' : '#fff',
                    color: viewMode === 'map' ? '#fff' : 'rgba(4,14,32,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <i className="fa-solid fa-map text-xs" />
                </button>
                <button title="Gần tôi" onClick={handleLocateMe} disabled={locating}
                  style={{
                    padding: '0 12px', height: 34, borderRadius: 8, border: '1px solid #e5e7eb',
                    background: userCoords ? 'rgba(5,150,105,0.08)' : '#fff',
                    color: '#059669', fontWeight: 600, fontSize: 12,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                  }}>
                  <i className={`fa-solid fa-location-crosshairs ${locating ? 'fa-spin' : ''}`} style={{ fontSize: 12 }} />
                  {userCoords ? 'Đã định vị' : 'Gần tôi'}
                </button>
                <select
                  value={radiusKm}
                  onChange={e => setRadiusKm(Number(e.target.value))}
                  disabled={!userCoords}
                  title={userCoords ? 'Lọc theo bán kính' : 'Nhấn "Gần tôi" để bật tính năng này'}
                  style={{
                    height: 34, borderRadius: 8, border: '1px solid #e5e7eb',
                    padding: '0 8px', fontSize: 12, fontWeight: 600,
                    color: userCoords && radiusKm > 0 ? '#059669' : 'rgba(4,14,32,0.45)',
                    background: userCoords && radiusKm > 0 ? 'rgba(5,150,105,0.08)' : '#fff',
                    cursor: userCoords ? 'pointer' : 'not-allowed',
                    opacity: userCoords ? 1 : 0.5, outline: 'none',
                  }}>
                  <option value={0}>Bán kính</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
                <span className="event-list-count" style={{ fontSize: 13, color: 'rgba(4,14,32,0.45)', marginLeft: 4, whiteSpace: 'nowrap' }}>
                  {radiusEvents != null
                    ? <><b style={{ color: '#059669' }}>{radiusEvents.length}</b> trong {radiusKm} km</>
                    : loading ? '…' : <><b style={{ color: '#181d26' }}>{totalCount}</b> sự kiện</>}
                </span>
              </div>
            </div>

            {/* Geo note banner */}
            {geoNote && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.25)',
              }}>
                <i className="fa-solid fa-circle-info" style={{ color: '#d97706', fontSize: 13, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#92400e' }}>{geoNote}</span>
                <button onClick={() => setGeoNote('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', fontSize: 13 }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}

            {/* Radius mode banner */}
            {radiusEvents != null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)',
              }}>
                <i className="fa-solid fa-circle-dot" style={{ color: '#059669', fontSize: 13, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#065f46' }}>
                  Đang lọc sự kiện trong bán kính <b>{radiusKm} km</b> từ vị trí của bạn —&nbsp;
                  {radiusEvents.length === 0
                    ? 'không tìm thấy sự kiện nào có tọa độ trong khu vực này.'
                    : `tìm thấy ${radiusEvents.length} sự kiện, sắp xếp theo khoảng cách.`}
                </span>
                <button onClick={() => setRadiusKm(0)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 13 }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}

            {/* Map or Grid view */}
            {viewMode === 'map' ? (
              <Suspense fallback={<LoadingSpinner />}>
                <MapView key={radiusEvents != null ? `r-${radiusKm}` : 'all'} events={radiusEvents ?? allExpanded} height={520} userCoords={userCoords} />
              </Suspense>
            ) : expandedLoading && radiusKm > 0 ? (
              <LoadingSpinner />
            ) : radiusEvents != null ? (
              radiusEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(5,150,105,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <i className="fa-solid fa-location-xmark" style={{ color: '#059669', fontSize: 24 }} />
                  </div>
                  <p style={{ color: 'rgba(4,14,32,0.50)', fontWeight: 500 }}>Không có sự kiện nào trong bán kính {radiusKm} km</p>
                  <p style={{ color: 'rgba(4,14,32,0.35)', fontSize: 13, marginTop: 4 }}>Thử tăng bán kính hoặc xóa bộ lọc kỹ năng/danh mục</p>
                </div>
              ) : (
                <div className="event-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {radiusEvents.map(ev => <EventCard key={ev.id} event={ev} distance={ev._distance} />)}
                </div>
              )
            ) : loading ? (
              <LoadingSpinner />
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'rgba(27,97,201,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <i className="fa-solid fa-calendar-xmark" style={{ color: '#1b61c9', fontSize: 24 }} />
                </div>
                <p style={{ color: 'rgba(4,14,32,0.50)', fontWeight: 500 }}>Không tìm thấy sự kiện phù hợp</p>
                <button onClick={() => { setFilters(f => ({ ...f, keyword: '', categoryId: '', skillId: '', page: 1 })); setActiveTab(''); }}
                  className="btn-secondary btn-sm" style={{ marginTop: 16 }}>
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="event-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {events.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            )}

            {viewMode === 'grid' && radiusEvents == null && (
              <div style={{ marginTop: 28 }}>
                <Pagination
                  page={filters.page}
                  totalPages={Math.ceil(totalCount / filters.pageSize)}
                  onPageChange={p => setFilters(f => ({ ...f, page: p }))}
                />
              </div>
            )}
          </div>

          {/* ── Sidebar ─────────────────────────────────────── */}
          <div className="event-list-sidebar" style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Upcoming */}
            <SidebarCard title="Sắp diễn ra" icon="fa-clock" iconColor="#7aaaf5">
              {upLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{
                    width: 20, height: 20, border: '2px solid #1b61c9', borderTopColor: 'transparent',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto',
                  }} />
                </div>
              ) : upcoming.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'rgba(4,14,32,0.40)' }}>
                  Chưa có sự kiện sắp tới
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming.map(ev => <UpcomingRow key={ev.id} event={ev} />)}
                  <Link to="/" style={{ textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1b61c9', padding: '8px 0', cursor: 'pointer' }}>
                      Xem tất cả →
                    </div>
                  </Link>
                </div>
              )}
            </SidebarCard>

            {/* Quick links */}
            <SidebarCard title="Khám phá" icon="fa-bolt" iconColor="#fbbf24">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: 'fa-certificate',     label: 'Tra cứu chứng chỉ',   to: '/verify/check', color: '#059669' },
                  { icon: 'fa-user-plus',        label: 'Đăng ký tình nguyện', to: '/register',     color: '#1b61c9' },
                  { icon: 'fa-gauge',            label: 'Vào dashboard',        to: '/dashboard',    color: '#7c3aed' },
                ].map(item => (
                  <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb',
                      transition: 'all 0.13s', cursor: 'pointer',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.background = '#f8faff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 13 }} />
                      </div>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: '#181d26' }}>{item.label}</span>
                      <i className="fa-solid fa-chevron-right" style={{ color: 'rgba(4,14,32,0.24)', fontSize: 11 }} />
                    </div>
                  </Link>
                ))}
              </div>
            </SidebarCard>
          </div>
        </div>
      </div>

      {/* ════════ STATS ══════════════════════════════════════ */}
      <section style={{ background: '#181d26' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px 48px', alignItems: 'center' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: `${s.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
