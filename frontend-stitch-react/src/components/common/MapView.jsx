import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const MONTH_COLORS = [
  '#0891b2', '#7c3aed', '#059669', '#0ea5e9', '#e11d48', '#d97706',
  '#1b61c9', '#10b981', '#8b5cf6', '#f97316', '#6366f1', '#dc2626',
];

function fixLeafletIcon(L) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export default function MapView({ events, height = 420, userCoords = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const leafletRef = useRef(null);
  const didAutoCenterUserRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');

      if (!mounted || mapRef.current) return;

      leafletRef.current = L;
      fixLeafletIcon(L);

      const map = L.map(containerRef.current, { zoomControl: true }).setView([16.047, 108.206], 5);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      markerLayerRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 36 : count < 50 ? 44 : 52;
          return L.divIcon({
            html: `<div style="
              width:${size}px;height:${size}px;border-radius:50%;
              background:#1b61c9;border:3px solid #fff;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
              color:#fff;font-weight:700;font-size:${count < 10 ? 13 : 14}px;
            ">${count}</div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      }).addTo(map);
    };

    init();

    return () => {
      mounted = false;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      markerLayerRef.current = null;
      leafletRef.current = null;
      didAutoCenterUserRef.current = false;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!L || !map || !markerLayer) return;

    markerLayer.clearLayers();

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    const eventsWithCoords = (events || []).filter((event) => event.latitude && event.longitude);
    const bounds = [];

    eventsWithCoords.forEach((event) => {
      const lat = parseFloat(event.latitude);
      const lng = parseFloat(event.longitude);

      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const month = event.startDate ? new Date(event.startDate).getMonth() : 0;
      const color = MONTH_COLORS[month];

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50% 50% 50% 0;
          background:${color};border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
        "><div style="transform:rotate(45deg);color:#fff;font-size:13px;">
          📅
        </div></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
      });

      const startFmt = event.startDate ? new Date(event.startDate).toLocaleDateString('vi-VN') : '';
      const distanceBadge = event._distance != null
        ? `<div style="font-size:11px;color:#059669;font-weight:700;margin-bottom:4px;">
             ${event._distance < 1 ? Math.round(event._distance * 1000) + ' m' : event._distance.toFixed(1) + ' km'} từ bạn
           </div>`
        : '';

      L.marker([lat, lng], { icon })
        .addTo(markerLayer)
        .bindPopup(
          `<div style="min-width:180px;font-family:inherit;">
            <div style="font-weight:700;font-size:13px;color:#181d26;margin-bottom:4px;line-height:1.4;">
              ${event.title || 'Sự kiện'}
            </div>
            ${distanceBadge}
            ${event.location ? `<div style="font-size:11px;color:#6b7280;margin-bottom:2px;">${event.location}</div>` : ''}
            ${startFmt ? `<div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${startFmt}</div>` : ''}
            <a href="/su-kien/${event.id}" style="
              display:inline-block;padding:5px 12px;border-radius:8px;
              background:#1b61c9;color:#fff;font-size:12px;font-weight:600;
              text-decoration:none;
            ">Xem chi tiết →</a>
          </div>`,
          { maxWidth: 220 }
        );

      bounds.push([lat, lng]);
    });

    if (userCoords) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:20px;height:20px;border-radius:50%;
          background:#1b61c9;border:3px solid #fff;
          box-shadow:0 0 0 4px rgba(27,97,201,0.25),0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Vị trí của bạn</b>');
      userMarkerRef.current = userMarker;

      bounds.push([userCoords.lat, userCoords.lng]);

      if (!didAutoCenterUserRef.current) {
        map.setView([userCoords.lat, userCoords.lng], 11);
        didAutoCenterUserRef.current = true;
      }
    } else {
      didAutoCenterUserRef.current = false;
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      return;
    }

    if (bounds.length === 1 && !userCoords) {
      map.setView(bounds[0], 11);
    }
  }, [events, userCoords]);

  const eventsWithCoords = (events || []).filter((event) => event.latitude && event.longitude);
  const hasMapData = eventsWithCoords.length > 0 || !!userCoords;

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height, borderRadius: 24, overflow: 'hidden', border: '1px solid #e5e7eb' }} />
      {!hasMapData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-slate-50/95 pointer-events-none">
          <span className="material-symbols-outlined text-outline mb-3" style={{ fontSize: 42 }}>map</span>
          <p className="text-sm font-semibold text-on-surface-variant">Chưa có sự kiện nào có dữ liệu tọa độ</p>
          <p className="text-xs text-on-surface-variant/70 mt-1">Người tổ chức cần thêm Latitude/Longitude khi tạo sự kiện</p>
        </div>
      )}
    </div>
  );
}