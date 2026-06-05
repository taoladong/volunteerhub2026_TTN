import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { eventApi, eventCategoryApi, skillApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import EventCardLarge from '../../components/ui/EventCardLarge';
import EventCardCompact from '../../components/ui/EventCardCompact';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SectionLabel from '../../components/ui/SectionLabel';
import EmptyState from '../../components/ui/EmptyState';

const MapView = lazy(() => import('../../components/ui/MapView'));

export default function EventList() {
  const { isAuthenticated, user }    = useAuth();
  const [events, setEvents]          = useState([]);
  const [recommended, setRecommended]= useState([]);
  const [categories, setCategories]  = useState([]);
  const [skills, setSkills]          = useState([]);
  const [totalCount, setTotalCount]  = useState(0);
  const [loading, setLoading]        = useState(true);
  const [recLoading, setRecLoading]  = useState(false);
  const [activeTab, setActiveTab]    = useState('');
  const [viewMode, setViewMode]      = useState('grid');
  const [filterOpen, setFilterOpen]  = useState(false);
  const [locating, setLocating]      = useState(false);
  const [filters, setFilters]        = useState({
    keyword: '', categoryId: '', status: 'Approved',
    skillId: '', location: '', page: 1, pageSize: 9,
  });

  const [userCoords, setUserCoords]          = useState(null);
  const [geoNote, setGeoNote]               = useState('');
  const [radiusKm, setRadiusKm]             = useState(0);
  const [allExpanded, setAllExpanded]        = useState([]);
  const [expandedLoading, setExpandedLoading]= useState(false);

  useEffect(() => {
    eventCategoryApi.getAll()
      .then(r => setCategories(r.data || []))
      .catch(err => console.error('[EventList] load categories failed:', err));
    skillApi.getAll()
      .then(r => setSkills(r.data || []))
      .catch(err => console.error('[EventList] load skills failed:', err));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Volunteer') return;
    setRecLoading(true);
    eventApi.getRecommended()
      .then(r => setRecommended(r.data || []))
      .catch(err => console.error('[EventList] load recommended failed:', err))
      .finally(() => setRecLoading(false));
  }, [isAuthenticated, user]);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    eventApi.getAll(params)
      .then(r => { setEvents(r.data?.items || []); setTotalCount(r.data?.totalCount || 0); })
      .catch(err => console.error('[EventList] load events failed:', err))
      .finally(() => setLoading(false));
  }, [filters]);

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  const handleCategory = (catId) => {
    setActiveTab(catId);
    set('categoryId', catId);
  };

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  useEffect(() => {
    if (viewMode !== 'map' && radiusKm === 0) return;
    setExpandedLoading(true);
    const params = Object.fromEntries(
      Object.entries(filters).filter(([k, v]) => v !== '' && k !== 'page' && k !== 'pageSize')
    );
    eventApi.getAll({ ...params, page: 1, pageSize: 500 })
      .then(r => setAllExpanded(r.data?.items || []))
      .catch(err => console.error('[EventList] load expanded failed:', err))
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

  const hasActiveFilters = !!(filters.keyword || filters.skillId || filters.status !== 'Approved');
  const activeFilterCount = [filters.skillId, filters.status !== 'Approved'].filter(Boolean).length;

  const clearFilters = () => {
    setFilters(f => ({ ...f, keyword: '', categoryId: '', skillId: '', status: 'Approved', page: 1 }));
    setActiveTab('');
  };

  const displayEvents = radiusEvents ?? events;

  return (
    <div style={{ background: 'var(--c-canvas)', minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════════════
          COVER PHOTO BAND
      ══════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1400&q=80"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 42%' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(36,25,15,0.72) 0%, rgba(36,25,15,0.12) 60%, transparent 100%)',
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px 22px' }}>
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase" style={{ letterSpacing: '0.04em', color: '#ffd9c9' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c-accent)' }} />
              Khám phá cơ hội
            </span>
            <h1 style={{ fontSize: 30, fontWeight: 600, color: '#fff', margin: '8px 0 0', letterSpacing: '-0.02em' }}>
              Sự kiện tình nguyện
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.86)', marginTop: 5 }}>
              {loading ? '…' : <><b>{totalCount}</b> sự kiện đang mở đăng ký</>}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE HEADER (thin strip below cover)
      ══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '12px 24px 8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        {/* View toggles */}
        {[
          { mode: 'grid', icon: 'fa-grip',  title: 'Lưới' },
          { mode: 'map',  icon: 'fa-map',   title: 'Bản đồ' },
        ].map(({ mode, icon, title }) => (
          <button
            key={mode}
            title={title}
            onClick={() => setViewMode(mode)}
            style={{
              width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${viewMode === mode ? 'rgba(27,97,201,0.30)' : 'rgba(15,15,15,0.12)'}`,
              background: viewMode === mode ? '#1b61c9' : '#fff',
              color: viewMode === mode ? '#fff' : 'rgba(15,15,15,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.13s',
            }}
          >
            <i className={`fa-solid ${icon}`} style={{ fontSize: 12 }} />
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          STICKY FILTER BAR
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        // PublicLayout: window scroll, header công khai cao 60px → top:60.
        // MainLayout (đã đăng nhập): <main> có overflow-y-auto riêng, topbar ngoài vùng cuộn → top:0.
        position: 'sticky', top: isAuthenticated ? 0 : 64, zIndex: 20,
        background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)',
      }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>

          {/* Main row: search | category chips | [filter] [count] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            {/* Search — pill */}
            <div style={{ position: 'relative', flexShrink: 0, width: 210 }}>
              <i className="fa-solid fa-magnifying-glass" style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--c-ink-3)', fontSize: 13, pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện…"
                value={filters.keyword}
                onChange={e => set('keyword', e.target.value)}
                style={{
                  width: '100%', height: 40, paddingLeft: 38, paddingRight: 14, fontSize: 13.5,
                  fontFamily: 'inherit', color: 'var(--c-ink)', background: 'var(--c-canvas)',
                  border: '1px solid var(--c-border-2)', borderRadius: 999, outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,97,201,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border-2)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 20, background: 'var(--c-border)', flexShrink: 0, margin: '0 2px' }} />

            {/* Category chips — horizontal scroll */}
            <div style={{ flex: 1, display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none', minWidth: 0 }}>
              {[{ id: '', name: 'Tất cả' }, ...categories].map(cat => {
                const key = cat.id === '' ? '' : String(cat.id);
                const isActive = activeTab === key;
                return (
                  <button
                    key={key || 'all'}
                    onClick={() => handleCategory(key)}
                    style={{
                      flexShrink: 0, padding: '5px 14px', borderRadius: 999, border: 'none',
                      fontSize: 13, fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.13s',
                      background: isActive ? 'var(--c-ink)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--c-ink-2)',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--c-surface-2)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                border: `1px solid ${filterOpen ? 'rgba(27,97,201,0.30)' : 'rgba(15,15,15,0.12)'}`,
                background: filterOpen ? 'rgba(27,97,201,0.07)' : 'transparent',
                color: filterOpen ? '#1b61c9' : 'rgba(15,15,15,0.60)',
                transition: 'all 0.13s',
              }}
            >
              <i className="fa-solid fa-sliders" style={{ fontSize: 11 }} />
              Lọc
              {activeFilterCount > 0 && (
                <span style={{
                  minWidth: 16, height: 16, borderRadius: 8, background: '#1b61c9',
                  color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Count */}
            <span style={{ fontSize: 12, color: 'rgba(15,15,15,0.40)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {radiusEvents != null
                ? <><b style={{ color: '#059669' }}>{radiusEvents.length}</b> / {radiusKm} km</>
                : loading
                  ? '…'
                  : <><b style={{ color: 'var(--c-ink)' }}>{totalCount}</b> kết quả</>}
            </span>
          </div>

          {/* Expandable filter panel */}
          {filterOpen && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
              padding: '8px 0 12px', borderTop: '1px solid rgba(15,15,15,0.07)',
            }}>
              {/* Skill */}
              <select
                value={filters.skillId}
                onChange={e => set('skillId', e.target.value)}
                className="input-field"
                style={{ width: 'auto', minWidth: 140, fontSize: 13 }}
              >
                <option value="">Tất cả kỹ năng</option>
                <option value="0">Không yêu cầu kỹ năng</option>
                {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              {/* Status */}
              <select
                value={filters.status}
                onChange={e => set('status', e.target.value)}
                className="input-field"
                style={{ width: 'auto', minWidth: 150, fontSize: 13 }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Approved">Đang mở đăng ký</option>
                <option value="Completed">Đã hoàn thành</option>
              </select>

              {/* Locate me */}
              <button
                title="Gần tôi"
                onClick={handleLocateMe}
                disabled={locating}
                style={{
                  height: 34, padding: '0 12px', borderRadius: 8, cursor: locating ? 'default' : 'pointer',
                  border: `1px solid ${userCoords ? 'rgba(5,150,105,0.30)' : 'rgba(15,15,15,0.12)'}`,
                  background: userCoords ? 'rgba(5,150,105,0.07)' : 'transparent',
                  color: '#059669', fontWeight: 600, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                }}
              >
                <i className={`fa-solid fa-location-crosshairs${locating ? ' fa-spin' : ''}`} style={{ fontSize: 12 }} />
                {userCoords ? 'Đã định vị' : 'Gần tôi'}
              </button>

              {/* Radius */}
              <select
                value={radiusKm}
                onChange={e => setRadiusKm(Number(e.target.value))}
                disabled={!userCoords}
                style={{
                  height: 34, borderRadius: 8, padding: '0 8px', fontSize: 12, fontWeight: 600, outline: 'none',
                  border: `1px solid ${userCoords && radiusKm > 0 ? 'rgba(5,150,105,0.30)' : 'rgba(15,15,15,0.12)'}`,
                  color: userCoords && radiusKm > 0 ? '#059669' : 'rgba(15,15,15,0.45)',
                  background: userCoords && radiusKm > 0 ? 'rgba(5,150,105,0.07)' : 'transparent',
                  cursor: userCoords ? 'pointer' : 'not-allowed',
                  opacity: userCoords ? 1 : 0.5,
                }}
              >
                <option value={0}>Bán kính</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    height: 34, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    border: '1px solid rgba(15,15,15,0.12)', background: 'transparent', color: 'rgba(15,15,15,0.55)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />
                  Xóa lọc
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Geo note banner */}
        {geoNote && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            padding: '9px 14px', borderRadius: 10,
            background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.25)',
          }}>
            <i className="fa-solid fa-circle-info" style={{ color: '#d97706', fontSize: 13, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#92400e' }}>{geoNote}</span>
            <button
              onClick={() => setGeoNote('')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', fontSize: 13 }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        {/* Radius mode banner */}
        {radiusEvents != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
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
            <button
              onClick={() => setRadiusKm(0)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 13 }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        {/* ── Section: Gợi ý cho bạn (Volunteer only) ───────────── */}
        {isAuthenticated && user?.role === 'Volunteer' && (recLoading || recommended.length > 0) && (
          <div style={{ marginBottom: 40 }}>
            <SectionLabel>Gợi ý cho bạn</SectionLabel>
            <p style={{ fontSize: 12, color: 'rgba(15,15,15,0.45)', marginTop: -8, marginBottom: 12 }}>
              Dựa trên kỹ năng trong hồ sơ của bạn
            </p>
            {recLoading ? (
              <LoadingSpinner />
            ) : (
              <div style={{
                display: 'flex', gap: 12, overflowX: 'auto',
                scrollbarWidth: 'none', scrollSnapType: 'x mandatory',
                paddingBottom: 4,
              }}>
                {recommended.map(ev => (
                  <EventCardCompact
                    key={ev.id}
                    event={ev}
                    matchPct={ev.matchPercentage ?? ev.matchPct ?? null}
                  />
                ))}
              </div>
            )}
            <div style={{ height: 1, background: 'rgba(15,15,15,0.07)', marginTop: 28 }} />
          </div>
        )}

        {/* ── Section: Tất cả sự kiện ────────────────────────────── */}
        <div>
          <SectionLabel>Tất cả sự kiện</SectionLabel>

          {/* Map view */}
          {viewMode === 'map' && (
            <Suspense fallback={<LoadingSpinner />}>
              <MapView
                key={radiusEvents != null ? `r-${radiusKm}` : 'all'}
                events={radiusEvents ?? allExpanded}
                height={520}
                userCoords={userCoords}
              />
            </Suspense>
          )}

          {/* Grid view */}
          {viewMode === 'grid' && (
            <>
              {(expandedLoading && radiusKm > 0) || loading ? (
                <LoadingSpinner />
              ) : displayEvents.length === 0 ? (
                <EmptyState
                  icon="fa-calendar-xmark"
                  title="Không tìm thấy sự kiện phù hợp"
                  description="Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác."
                  cta={hasActiveFilters ? 'Xóa bộ lọc' : undefined}
                  onCta={hasActiveFilters ? clearFilters : undefined}
                />
              ) : (
                <div style={{
                  display: 'grid',
                  gap: 20,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                }}>
                  {displayEvents.map(ev => (
                    <EventCardLarge key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {viewMode === 'grid' && radiusEvents == null && !loading && events.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <Pagination
                page={filters.page}
                totalPages={Math.ceil(totalCount / filters.pageSize)}
                onPageChange={p => setFilters(f => ({ ...f, page: p }))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
