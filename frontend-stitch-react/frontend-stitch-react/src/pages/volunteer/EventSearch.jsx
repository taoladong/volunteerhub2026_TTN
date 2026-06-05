import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventApi, eventCategoryApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import MapView from '../../components/common/MapView';
import { Alert, getErrorMessage, unwrap } from '../../components/common/CommonUI';

const normalizeEventsResponse = (data) => {
  if (Array.isArray(data)) return { items: data, totalCount: data.length };
  if (Array.isArray(data?.items)) return { items: data.items, totalCount: data.totalCount ?? data.items.length };
  if (Array.isArray(data?.data)) return { items: data.data, totalCount: data.totalCount ?? data.data.length };
  return { items: [], totalCount: 0 };
};

const getCategoryName = (event) => event.categoryName || event.category?.name || event.category || '';

const haversine = (lat1, lng1, lat2, lng2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function EventSearch() {
  const [events, setEvents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [filters, setFilters] = useState({ keyword: '', categoryId: '', page: 1, pageSize: 12 });

  useEffect(() => {
    eventCategoryApi.getAll({ skipAuth: true, skipAuthRefresh: true })
      .then((res) => {
        const list = unwrap(res, []);
        setCategories(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.warn('Không thể tải danh mục sự kiện', err);
        setCategories([]);
      });
  }, []);

  const queryParams = useMemo(() => {
    const params = {
      page: filters.page,
      pageSize: filters.pageSize,
      status: 'Approved',
    };

    if (filters.keyword.trim()) params.keyword = filters.keyword.trim();
    if (filters.categoryId) params.categoryId = filters.categoryId;

    return params;
  }, [filters]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await eventApi.getAll(queryParams, { skipAuth: true, skipAuthRefresh: true });
        const normalized = normalizeEventsResponse(res.data);
        setEvents(normalized.items);
        setTotalCount(normalized.totalCount);
      } catch (err) {
        setEvents([]);
        setTotalCount(0);
        setError(getErrorMessage(err, 'Không thể tải danh sách sự kiện. Vui lòng thử lại sau.'));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [queryParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleLocateNearby = () => {
    if (!navigator.geolocation) {
      setGeoError('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    setLocating(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setGeoError('Không thể lấy vị trí hiện tại của bạn.');
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  useEffect(() => {
    handleLocateNearby();
  }, []);

  const displayEvents = useMemo(() => {
    if (!userCoords) return events;

    return events
      .map((event) => {
        const lat = parseFloat(event.latitude);
        const lng = parseFloat(event.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return event;

        return {
          ...event,
          _distance: haversine(userCoords.lat, userCoords.lng, lat, lng),
        };
      })
      .sort((a, b) => {
        if (a._distance == null && b._distance == null) return 0;
        if (a._distance == null) return 1;
        if (b._distance == null) return -1;
        return a._distance - b._distance;
      });
  }, [events, userCoords]);

  return (
    <div className="space-y-8">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-5 rounded-3xl shadow-card border border-outline">
        <div className="md:col-span-2">
          <label className="block text-label-sm text-on-surface-variant mb-1.5 font-semibold">Từ khóa</label>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              className="input-field pl-10"
              placeholder="Tên sự kiện, địa điểm..."
            />
          </div>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1.5 font-semibold">Danh mục</label>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value, page: 1 }))}
            className="input-field"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            <Icon name="search" size={20} />
            Tìm kiếm
          </button>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleLocateNearby}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Icon name={locating ? 'progress_activity' : 'my_location'} size={20} />
            {locating ? 'Đang định vị...' : 'Cập nhật vị trí'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-3xl shadow-card border border-outline p-5 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Bản đồ sự kiện gần bạn</h3>
          <p className="text-sm text-on-surface-variant">
            {userCoords
              ? ''
              : 'Cho phép trình duyệt truy cập vị trí để xem khoảng cách từ bạn đến từng sự kiện.'}
          </p>
        </div>

        {geoError && <Alert type="warning">{geoError}</Alert>}

        <MapView events={displayEvents} userCoords={userCoords} height={280} />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? <Loading /> : (
        <>
          {displayEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayEvents.map((event) => {
                const categoryName = getCategoryName(event);
                const currentParticipants = Number(event.currentParticipants || 0);
                const maxParticipants = Number(event.maxParticipants || 0);
                const participantProgress = maxParticipants > 0
                  ? Math.min(100, Math.round((currentParticipants / maxParticipants) * 100))
                  : 0;

                return (
                  <Link
                    key={event.id}
                    to={`/su-kien/${event.id}`}
                    className="bg-white rounded-3xl overflow-hidden shadow-card border border-outline group transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
                  >
                    <div className="h-48 relative bg-primary-container flex items-center justify-center">
                      {event.bannerUrl || event.imageUrl ? (
                        <img
                          src={event.bannerUrl || event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <Icon name="event" className="text-primary" size={56} />
                      )}
                      {categoryName && (
                        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
                          <Icon name="category" className="text-primary" size={16} />
                          <span className="text-label-sm font-bold text-on-surface">{categoryName}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors mb-2">{event.title}</h3>
                      <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">{event.description || 'Chưa có mô tả.'}</p>
                      <div className="space-y-2">
                        {event.location && (
                          <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                            <Icon name="location_on" size={16} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.startDate && (
                          <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                            <Icon name="calendar_today" size={16} />
                            <span>{new Date(event.startDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                        )}
                        {event._distance != null && (
                          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                            <Icon name="near_me" size={16} />
                            <span>
                              Cách bạn {event._distance < 1
                                ? `${Math.round(event._distance * 1000)} m`
                                : `${event._distance.toFixed(1)} km`}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <Icon name="groups" size={16} />
                              <span>Người tham gia</span>
                            </div>
                            <span className="font-bold text-on-surface">
                              {currentParticipants}/{maxParticipants || '∞'}
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-surface-variant overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-teal-500 transition-all"
                              style={{ width: `${maxParticipants > 0 ? participantProgress : 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Icon name="search_off" size={64} className="text-outline mx-auto mb-4" />
              <h3 className="text-xl font-bold text-on-surface mb-2">Không tìm thấy sự kiện</h3>
              <p className="text-on-surface-variant">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
