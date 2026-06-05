import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { registrationApi, ratingApi } from '../../services/api';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

function VolunteerCheckInModal({ registration, onClose, onDone }) {
  const scannerId = `volunteer-checkin-reader-${registration?.id || 'x'}`;
  const scannerRef = useRef(null);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const stopScanner = async () => {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.stop();
    } catch {
    }

    try {
      scannerRef.current.clear();
    } catch {
    }

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
    if (!navigator.geolocation) {
      setMessage('Trình duyệt không hỗ trợ GPS.');
      return;
    }

    setSaving(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await submit('', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        setSaving(false);
        setMessage('Không lấy được vị trí hiện tại.');
      },
      { timeout: 8000, maximumAge: 30000 }
    );
  };

  if (!registration) return null;

  return (
    <Modal isOpen={!!registration} onClose={async () => { await stopScanner(); onClose(); }} title="Điểm danh sự kiện" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-sm font-semibold text-gray-900">{registration.event?.title || `Sự kiện #${registration.eventId}`}</p>
          <p className="text-xs text-gray-500 mt-1">Quét QR do nhà tổ chức hiển thị tại địa điểm sự kiện.</p>
        </div>

        <div id={scannerId} className="overflow-hidden rounded-xl border border-gray-100 bg-black/5" />

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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Mã điểm danh dự phòng</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field text-center font-mono tracking-widest" placeholder="Nhập mã QR do organizer hiển thị" />
        </div>

        {message && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <i className="fa-solid fa-circle-exclamation mr-1" /> {message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={async () => { await stopScanner(); onClose(); }} className="btn-secondary">Hủy</button>
          <button type="button" onClick={() => submit()} disabled={saving || !code.trim()} className="btn-primary flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Xác nhận điểm danh
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CancelRequestModal({ registration, onClose, onSubmit, saving }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (registration) {
      setReason(registration.cancelReason || '');
    }
  }, [registration]);

  if (!registration) return null;

  return (
    <Modal isOpen={!!registration} onClose={onClose} title="Xin hủy đăng ký" size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason);
        }}
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <i className="fa-solid fa-triangle-exclamation mr-1" />
          Yêu cầu sẽ được gửi đến nhà tổ chức để xác nhận hủy.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lý do hủy</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field resize-none"
            placeholder="Ví dụ: bận việc đột xuất, không thể tham gia đúng giờ..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Đóng</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Gửi yêu cầu
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MyRegistrations() {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [ratingForms, setRatingForms] = useState({});
  const [checkinTarget, setCheckinTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const loadRegistrations = async () => {
    const response = await registrationApi.getMyRegistrations();
    setRegs(response.data || []);
  };

  useEffect(() => {
    loadRegistrations()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const withdraw = async (eventId) => {
    if (!confirm('Bạn có chắc muốn rút đăng ký?')) return;

    try {
      await registrationApi.withdraw(eventId);
      setRegs((prev) => prev.filter((registration) => registration.eventId !== eventId));
    } catch (err) {
      alert(err.response?.data?.message || 'Rút đăng ký thất bại');
    }
  };

  const requestCancel = async (reason) => {
    if (!cancelTarget) return;

    setCancelSaving(true);
    try {
      const response = await registrationApi.requestCancelRegistration(cancelTarget.eventId, reason);
      setRegs((prev) => prev.map((registration) => (
        registration.id === cancelTarget.id
          ? { ...registration, ...response.data, event: registration.event, shift: registration.shift }
          : registration
      )));
      setCancelTarget(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi yêu cầu hủy thất bại');
    } finally {
      setCancelSaving(false);
    }
  };

  const submitRating = async (registration) => {
    const form = ratingForms[registration.id] || { score: 5, comment: '' };
    const rateeId = registration.event?.organizerId;
    if (!rateeId) {
      alert('Không tìm thấy ban tổ chức để đánh giá');
      return;
    }

    try {
      await ratingApi.create(registration.eventId, {
        rateeId,
        score: Number(form.score) || 5,
        comment: form.comment || '',
      });
      setRatingForms((prev) => ({
        ...prev,
        [registration.id]: { ...form, done: true },
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Đánh giá thất bại');
    }
  };

  const handleCheckinDone = (updated) => {
    setRegs((prev) => prev.map((registration) => (
      registration.id === updated.id
        ? { ...registration, ...updated, event: registration.event, shift: registration.shift }
        : registration
    )));
    setCheckinTarget(null);
    alert(`Đã ghi nhận check-in. Giờ tình nguyện hiện tại: ${updated.volunteerHours || 0}h. Giờ thực tế sẽ cập nhật khi ban tổ chức check-out.`);
  };

  const filtered = filter === 'all'
    ? regs
    : regs.filter((registration) => (filter === 'attended' ? registration.isAttended : registration.status === filter));

  const filters = [
    { key: 'all', label: 'Tất cả', count: regs.length },
    { key: 'Pending', label: 'Chờ xác nhận', count: regs.filter((registration) => registration.status === 'Pending').length },
    { key: 'Confirmed', label: 'Đã xác nhận', count: regs.filter((registration) => registration.status === 'Confirmed').length },
    { key: 'attended', label: 'Đã tham gia', count: regs.filter((registration) => registration.isAttended).length },
    { key: 'Cancelled', label: 'Đã hủy', count: regs.filter((registration) => registration.status === 'Cancelled').length },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Đăng ký của tôi</h1>

      <div className="flex gap-2 flex-wrap">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === item.key ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}
          >
            {item.label}
            <span className="ml-1.5 text-xs opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-clipboard-list text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">Không có đăng ký nào</p>
          <Link to="/" className="btn-primary btn-sm mt-4 inline-flex items-center gap-2">
            <i className="fa-solid fa-search" /> Tìm sự kiện
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((registration) => {
            const canRequestCancel = registration.status === 'Confirmed'
              && !registration.isAttended
              && registration.event?.status !== 'Completed'
              && registration.event?.status !== 'Cancelled';

            return (
              <div key={registration.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link to={`/events/${registration.eventId}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 block truncate">
                    {registration.event?.title || `Sự kiện #${registration.eventId}`}
                  </Link>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                    <span><i className="fa-solid fa-calendar mr-1" />{fmt(registration.event?.startDate)}</span>
                    {registration.event?.location && <span><i className="fa-solid fa-location-dot mr-1" />{registration.event.location}</span>}
                    <span>Đăng ký: {fmt(registration.registeredAt)}</span>
                    {registration.isAttended && (
                      <span className="text-primary-600 font-medium">
                        <i className="fa-solid fa-clock mr-1" />{registration.volunteerHours}h
                      </span>
                    )}
                  </div>
                  {registration.note && <p className="text-xs text-gray-400 mt-1 italic">"{registration.note}"</p>}
                  {registration.cancelRequested && registration.status !== 'Cancelled' && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      <i className="fa-solid fa-hourglass-half" /> Đang chờ hủy
                    </div>
                  )}
                  {registration.cancelRequested && registration.cancelReason && registration.status !== 'Cancelled' && (
                    <p className="mt-2 text-xs text-amber-700">Lý do: {registration.cancelReason}</p>
                  )}

                  {registration.isAttended && registration.event?.status === 'Completed' && (
                    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      {ratingForms[registration.id]?.done ? (
                        <p className="text-xs font-medium text-green-700">
                          <i className="fa-solid fa-check mr-1" /> Đã gửi đánh giá ban tổ chức
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={ratingForms[registration.id]?.score || 5}
                            onChange={(e) => setRatingForms((prev) => ({ ...prev, [registration.id]: { ...(prev[registration.id] || {}), score: e.target.value } }))}
                            className="input-field text-xs sm:w-24"
                          >
                            {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} sao</option>)}
                          </select>
                          <input
                            value={ratingForms[registration.id]?.comment || ''}
                            onChange={(e) => setRatingForms((prev) => ({ ...prev, [registration.id]: { ...(prev[registration.id] || {}), comment: e.target.value } }))}
                            className="input-field text-xs"
                            placeholder="Nhận xét về ban tổ chức..."
                          />
                          <button type="button" onClick={() => submitRating(registration)} className="btn-primary btn-sm text-xs">
                            Gửi đánh giá
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={registration.isAttended ? 'Confirmed' : registration.status} />
                  {registration.isAttended && (
                    <span className="text-xs bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 rounded-full font-medium">
                      Đã điểm danh
                    </span>
                  )}

                  {registration.status === 'Confirmed' && !registration.isAttended && registration.event?.status === 'Approved' && (
                    <button type="button" onClick={() => setCheckinTarget(registration)} className="btn-primary btn-sm text-xs">
                      <i className="fa-solid fa-qrcode mr-1" /> Điểm danh
                    </button>
                  )}

                  {registration.status === 'Confirmed' && !registration.isAttended && registration.event?.status !== 'Approved' && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
                      Chưa mở điểm danh
                    </span>
                  )}

                  {canRequestCancel && !registration.cancelRequested && (
                    <button type="button" onClick={() => setCancelTarget(registration)} className="btn-secondary btn-sm text-xs">
                      <i className="fa-solid fa-paper-plane mr-1" /> Xin hủy đăng ký
                    </button>
                  )}

                  {registration.status === 'Pending' && (
                    <button type="button" onClick={() => withdraw(registration.eventId)} className="btn-danger btn-sm text-xs">
                      <i className="fa-solid fa-xmark mr-1" /> Rút đăng ký
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VolunteerCheckInModal
        registration={checkinTarget}
        onClose={() => setCheckinTarget(null)}
        onDone={handleCheckinDone}
      />

      <CancelRequestModal
        registration={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSubmit={requestCancel}
        saving={cancelSaving}
      />
    </div>
  );
}
