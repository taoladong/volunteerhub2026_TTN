import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VolunteerCheckInModal from '../../components/ui/VolunteerCheckInModal';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { fmt } from '../../utils/format';
import { registrationApi, ratingApi } from '../../services/api';
import { isWithinCheckinWindow } from '../../utils/checkin';

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
          <label className="block text-sm font-medium text-warmink-2 mb-1">Lý do hủy</label>
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

    setRatingForms((prev) => ({ ...prev, [registration.id]: { ...form, saving: true } }));
    try {
      const payload = {
        rateeId,
        score: Number(form.score) || 5,
        comment: form.comment || '',
      };
      const ratingId = form.ratingId || registration.ratingId;
      const response = ratingId
        ? await ratingApi.update(ratingId, { score: payload.score, comment: payload.comment })
        : await ratingApi.create(registration.eventId, payload);
      setRatingForms((prev) => ({
        ...prev,
        [registration.id]: {
          ...form,
          ratingId: ratingId || response.data?.id,
          score: payload.score,
          comment: payload.comment,
          done: true,
          editing: false,
          saving: false,
        },
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Đánh giá thất bại');
      setRatingForms((prev) => ({ ...prev, [registration.id]: { ...form, saving: false } }));
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
    : regs.filter((r) => {
        if (filter === 'attended') return r.isAttended;
        if (filter === 'Confirmed') return r.status === 'Confirmed' && !r.isAttended;
        return r.status === filter;
      });

  const filters = [
    { key: 'all', label: 'Tất cả', count: regs.length },
    { key: 'Pending', label: 'Chờ xác nhận', count: regs.filter((registration) => registration.status === 'Pending').length },
    { key: 'Confirmed', label: 'Đã xác nhận', count: regs.filter((r) => r.status === 'Confirmed' && !r.isAttended).length },
    { key: 'attended', label: 'Đã tham gia', count: regs.filter((registration) => registration.isAttended).length },
    { key: 'Cancelled', label: 'Đã hủy', count: regs.filter((registration) => registration.status === 'Cancelled').length },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-warmink">Đăng ký của tôi</h1>

      <div className="flex gap-2 flex-wrap">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === item.key ? 'bg-primary-600 text-white' : 'bg-white border border-warmborder text-warmink-2 hover:border-primary-300'
            }`}
          >
            {item.label}
            <span className="ml-1.5 text-xs opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-clipboard-list text-4xl text-warmink-3 mb-3 block" />
          <p className="text-warmink-2">Không có đăng ký nào</p>
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
                  <Link to={`/events/${registration.eventId}`} className="text-sm font-semibold text-warmink hover:text-primary-600 block truncate">
                    {registration.event?.title || `Sự kiện #${registration.eventId}`}
                  </Link>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-warmink-3">
                    <span><i className="fa-solid fa-calendar mr-1" />{fmt(registration.event?.startDate)}</span>
                    {registration.event?.location && <span><i className="fa-solid fa-location-dot mr-1" />{registration.event.location}</span>}
                    <span>Đăng ký: {fmt(registration.registeredAt)}</span>
                    {registration.shift?.name && <span><i className="fa-solid fa-layer-group mr-1" />{registration.shift.name}</span>}
                    {registration.isAttended && (
                      <span className="text-primary-600 font-medium">
                        <i className="fa-solid fa-clock mr-1" />{registration.volunteerHours}h
                      </span>
                    )}
                  </div>
                  {registration.note && <p className="text-xs text-warmink-3 mt-1 italic">"{registration.note}"</p>}
                  {registration.cancelRequested && registration.status !== 'Cancelled' && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      <i className="fa-solid fa-hourglass-half" /> Đang chờ hủy
                    </div>
                  )}
                  {registration.cancelRequested && registration.cancelReason && registration.status !== 'Cancelled' && (
                    <p className="mt-2 text-xs text-amber-700">Lý do: {registration.cancelReason}</p>
                  )}

                  {registration.isAttended && registration.event?.status === 'Completed' && (
                    <div className="mt-3 rounded-lg border border-warmborder bg-surface-2 p-3">
                      {(registration.hasRated || ratingForms[registration.id]?.done) && !ratingForms[registration.id]?.editing ? (
                        <p className="text-xs font-medium text-green-700">
                          <i className="fa-solid fa-check mr-1" /> Đã gửi đánh giá ban tổ chức
                          <button
                            type="button"
                            onClick={() => setRatingForms((prev) => ({
                              ...prev,
                              [registration.id]: {
                                ...(prev[registration.id] || {}),
                                ratingId: registration.ratingId,
                                score: prev[registration.id]?.score ?? registration.ratingScore ?? 5,
                                comment: prev[registration.id]?.comment ?? registration.ratingComment ?? '',
                                editing: true,
                              },
                            }))}
                            className="btn-secondary btn-sm text-xs ml-2"
                          >
                            Sửa
                          </button>
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={ratingForms[registration.id]?.score ?? registration.ratingScore ?? 5}
                            onChange={(e) => setRatingForms((prev) => ({ ...prev, [registration.id]: { ...(prev[registration.id] || {}), score: e.target.value } }))}
                            className="input-field text-xs sm:w-24"
                          >
                            {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} sao</option>)}
                          </select>
                          <input
                            value={ratingForms[registration.id]?.comment ?? registration.ratingComment ?? ''}
                            onChange={(e) => setRatingForms((prev) => ({ ...prev, [registration.id]: { ...(prev[registration.id] || {}), comment: e.target.value } }))}
                            className="input-field text-xs"
                            placeholder="Nhận xét về ban tổ chức..."
                          />
                          <button type="button" onClick={() => submitRating(registration)} disabled={ratingForms[registration.id]?.saving} className="btn-primary btn-sm text-xs flex items-center gap-1">
                            {ratingForms[registration.id]?.saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
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

                  {registration.status === 'Confirmed' && !registration.isAttended && registration.event?.status === 'Approved' && isWithinCheckinWindow(registration.event, registration.shift) && (
                    <button type="button" onClick={() => setCheckinTarget(registration)} className="btn-primary btn-sm text-xs">
                      <i className="fa-solid fa-qrcode mr-1" /> Điểm danh
                    </button>
                  )}

                  {registration.status === 'Confirmed' && !registration.isAttended && (!isWithinCheckinWindow(registration.event, registration.shift) || registration.event?.status !== 'Approved') && (
                    <span className="rounded-full border border-warmborder bg-surface-2 px-2.5 py-1 text-xs font-medium text-warmink-2">
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
