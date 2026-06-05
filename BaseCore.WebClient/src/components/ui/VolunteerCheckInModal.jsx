import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Modal from './Modal';
import { registrationApi } from '../../services/api';

export default function VolunteerCheckInModal({ registration, onClose, onDone }) {
  const scannerId = `volunteer-checkin-reader-${registration?.id || 'x'}`;
  const scannerRef = useRef(null);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    try { await scannerRef.current.stop(); } catch {}
    try { scannerRef.current.clear(); } catch {}
    scannerRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => { stopScanner(); }, []);

  const submit = async (nextCode = code, gps = null) => {
    const qrCode = (nextCode || '').trim();
    if (!qrCode && !gps) {
      setMessage('Vui lòng quét QR hoặc nhập mã điểm danh.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const payload = gps ? { ...gps } : { qrCode };
      const response = await registrationApi.selfCheckin(registration.eventId, payload);
      await stopScanner();
      onDone(response.data);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Điểm danh thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const startScanner = async () => {
    setMessage('');
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          setCode(decodedText);
          await stopScanner();
          await submit(decodedText);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setMessage('Không mở được camera. Bạn có thể nhập mã thủ công.');
    }
  };

  const checkInWithGps = () => {
    if (!navigator.geolocation) { setMessage('Trình duyệt không hỗ trợ GPS.'); return; }
    setSaving(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await submit('', { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => { setSaving(false); setMessage('Không lấy được vị trí hiện tại.'); },
      { timeout: 8000, maximumAge: 30000 }
    );
  };

  if (!registration) return null;

  return (
    <Modal isOpen={!!registration} onClose={async () => { await stopScanner(); onClose(); }} title="Điểm danh sự kiện" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-warmborder bg-surface-2 p-3">
          <p className="text-sm font-semibold text-warmink">{registration.event?.title || `Sự kiện #${registration.eventId}`}</p>
          <p className="text-xs text-warmink-2 mt-1">Quét QR do nhà tổ chức hiển thị tại địa điểm sự kiện.</p>
        </div>

        <div id={scannerId} className="overflow-hidden rounded-xl border border-warmborder bg-black/5" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="button" onClick={scanning ? stopScanner : startScanner} disabled={saving} className="btn-secondary flex items-center justify-center gap-2">
            <i className={`fa-solid ${scanning ? 'fa-stop' : 'fa-camera'}`} />
            {scanning ? 'Dừng quét' : 'Quét QR'}
          </button>
          <button type="button" onClick={checkInWithGps} disabled={saving} className="btn-secondary flex items-center justify-center gap-2">
            <i className="fa-solid fa-location-crosshairs" />
            Dùng GPS
          </button>
        </div>

        {message && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <i className="fa-solid fa-circle-exclamation mr-1" /> {message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={async () => { await stopScanner(); onClose(); }} className="btn-secondary">Đóng</button>
        </div>
      </div>
    </Modal>
  );
}
