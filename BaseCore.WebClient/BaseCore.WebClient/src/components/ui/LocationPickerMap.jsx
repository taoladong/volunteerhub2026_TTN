import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

function fixLeafletIcon(L) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export default function LocationPickerMap({ latitude, longitude, onChange, height = 300 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const L = (await import('leaflet')).default;
      if (!mounted || mapRef.current) return;

      leafletRef.current = L;
      fixLeafletIcon(L);

      const initialLat = Number(latitude) || 16.047;
      const initialLng = Number(longitude) || 108.206;
      const initialZoom = latitude && longitude ? 13 : 5;
      const map = L.map(containerRef.current, { zoomControl: true }).setView([initialLat, initialLng], initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      map.on('click', (e) => {
        onChange({
          latitude: e.latlng.lat.toFixed(6),
          longitude: e.latlng.lng.toFixed(6),
        });
      });

      mapRef.current = map;
    };

    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const next = e.target.getLatLng();
        onChange({
          latitude: next.lat.toFixed(6),
          longitude: next.lng.toFixed(6),
        });
      });
      map.setView([lat, lng], Math.max(map.getZoom(), 13));
      return;
    }

    markerRef.current.setLatLng([lat, lng]);
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [latitude, longitude, onChange]);

  return (
    <div
      ref={containerRef}
      style={{ height, borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb' }}
    />
  );
}
