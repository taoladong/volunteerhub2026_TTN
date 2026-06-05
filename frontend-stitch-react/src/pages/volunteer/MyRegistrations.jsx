import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ratingApi, registrationApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, ConfirmDialog, StarRating, getErrorMessage } from '../../components/common/CommonUI';

const STATUS_MAP = {
  Pending: { label: 'Chờ duyệt', bg: 'bg-warning-container', text: 'text-amber-700' },
  Confirmed: { label: 'Đã xác nhận', bg: 'bg-success-container', text: 'text-on-success-container' },
  CheckedIn: { label: 'Đã check-in', bg: 'bg-primary-container', text: 'text-primary' },
  Attended: { label: 'Đã tham gia', bg: 'bg-primary-container', text: 'text-primary' },
  Completed: { label: 'Hoàn thành', bg: 'bg-success-container', text: 'text-on-success-container' },
  CancelRequested: { label: 'Chờ hủy', bg: 'bg-warning-container', text: 'text-amber-700' },
  Cancelled: { label: 'Đã hủy', bg: 'bg-error-container', text: 'text-error' },
  Rejected: { label: 'Bị từ chối', bg: 'bg-error-container', text: 'text-error' },
};

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.registrations)) return payload.registrations;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const eventIdOf = (reg) => reg?.eventId || reg?.event?.id || reg?.event?.eventId;
const registrationIdOf = (reg) => reg?.id || reg?.registrationId;
const eventTitleOf = (reg) => reg?.eventTitle || reg?.event?.title || reg?.title || 'Sự kiện';
const eventDescriptionOf = (reg) => reg?.eventDescription || reg?.event?.description || reg?.description || '';
const eventBannerOf = (reg) => reg?.eventBannerUrl || reg?.event?.bannerUrl || reg?.event?.imageUrl || '';
const eventStartOf = (reg) => reg?.eventStartDate || reg?.event?.startDate || reg?.startDate;
const hasRating = (reg) => Boolean(reg?.ratingId || reg?.rating || reg?.hasRating || reg?.ratedAt);

export default function MyRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [checkinCode, setCheckinCode] = useState('');
  const [ratingForm, setRatingForm] = useState({ score: 5, comment: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadRegistrations = useCallback(async () => {
    setError('');
    try {
      const res = await registrationApi.getMyRegistrations();
      setRegistrations(normalizeList(res.data));
    } catch (err) {
      setRegistrations([]);
      setError(getErrorMessage(err, 'Không thể tải danh sách đăng ký của bạn.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const groups = useMemo(() => {
    const upcomingStatuses = new Set(['Pending', 'Confirmed', 'CheckedIn', 'Attended', 'CancelRequested']);
    return {
      upcoming: registrations.filter((item) => upcomingStatuses.has(item.status)),
      completed: registrations.filter((item) => item.status === 'Completed'),
      cancelled: registrations.filter((item) => ['Cancelled', 'Rejected'].includes(item.status)),
    };
  }, [registrations]);

  const tabs = [
    { key: 'upcoming', label: `Sắp tới (${groups.upcoming.length})` },
    { key: 'completed', label: `Đã hoàn thành (${groups.completed.length})` },
    { key: 'cancelled', label: `Đã hủy (${groups.cancelled.length})` },
  ];

  const currentList = groups[activeTab] || [];

  const openDialog = (type, registration) => {
    setSelected(registration);
    setDialog(type);
    setReason('');
    setCheckinCode('');
    setRatingForm({ score: 5, comment: '' });
    setNotice('');
    setError('');
  };

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setSelected(null);
    setReason('');
    setCheckinCode('');
  };

  const refreshAfterAction = async (successMessage) => {
    await loadRegistrations();
    setNotice(successMessage);
    setDialog(null);
    setSelected(null);
    setReason('');
    setCheckinCode('');
  };

  const handleWithdraw = async () => {
    const eventId = eventIdOf(selected);
    if (!eventId) return;
    setBusy(true);
    setError('');
    try {
      await registrationApi.withdraw(eventId);
      await refreshAfterAction('Đã rút đăng ký thành công.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể rút đăng ký.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    const eventId = eventIdOf(selected);
    if (!eventId) return;
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hủy đăng ký.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await registrationApi.requestCancelRegistration(eventId, reason.trim());
      await refreshAfterAction('Đã gửi yêu cầu hủy đăng ký cho ban tổ chức.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi yêu cầu hủy đăng ký.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSelfCheckin = async () => {
    const eventId = eventIdOf(selected);
    if (!eventId) return;
    if (!checkinCode.trim()) {
      setError('Vui lòng nhập mã QR/check-in của sự kiện.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await registrationApi.selfCheckin(eventId, {
        qrCode: checkinCode.trim(),
        code: checkinCode.trim(),
        registrationId: registrationIdOf(selected),
      });
      await refreshAfterAction('Check-in thành công.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể check-in. Vui lòng kiểm tra mã QR.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitRating = async () => {
    const eventId = eventIdOf(selected);
    if (!eventId) return;
    if (!ratingForm.comment.trim()) {
      setError('Vui lòng nhập nhận xét sau khi tham gia.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await ratingApi.create(eventId, {
        score: ratingForm.score,
        rating: ratingForm.score,
        comment: ratingForm.comment.trim(),
      });
      await refreshAfterAction('Đã gửi đánh giá sự kiện.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi đánh giá.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface mb-2">Đăng ký của tôi</h2>
        <p className="text-body-lg text-on-surface-variant">Quản lý hoạt động đã đăng ký, check-in và đánh giá sau khi hoàn thành.</p>
      </div>

      {notice && <Alert type="success">{notice}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="flex items-center gap-8 border-b border-outline overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 px-1 font-label text-label-md whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-outline">
          <div className="w-24 h-24 mb-6 flex items-center justify-center bg-primary-container rounded-full text-primary">
            <Icon name={activeTab === 'upcoming' ? 'event_available' : 'hourglass_empty'} size={48} />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">
            {activeTab === 'upcoming' ? 'Chưa có đăng ký nào' : 'Danh sách trống'}
          </h3>
          <p className="text-on-surface-variant max-w-sm mb-8">
            {activeTab === 'upcoming' ? 'Hãy khám phá các sự kiện và đăng ký tham gia.' : 'Không có mục nào trong danh sách này.'}
          </p>
          {activeTab === 'upcoming' && <Link to="/su-kien" className="btn-primary">Khám phá sự kiện</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {currentList.map((reg) => {
            const eventId = eventIdOf(reg);
            const status = STATUS_MAP[reg.status] || { label: reg.status || 'Không rõ', bg: 'bg-surface-variant', text: 'text-on-surface-variant' };
            const canWithdraw = reg.status === 'Pending';
            const canCancelRequest = ['Confirmed', 'CheckedIn', 'Attended'].includes(reg.status);
            const canSelfCheckin = reg.status === 'Confirmed';
            const canRate = reg.status === 'Completed' && !hasRating(reg);

            return (
              <article key={registrationIdOf(reg) || eventId} className="bg-white rounded-2xl shadow-soft border border-outline overflow-hidden flex flex-col group hover:shadow-card hover:border-primary/20 transition-all">
                <div className="h-40 overflow-hidden relative bg-primary-container">
                  {eventBannerOf(reg) ? (
                    <img src={eventBannerOf(reg)} alt={eventTitleOf(reg)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-primary">
                      <Icon name="image" size={52} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className={`${status.bg} ${status.text} px-3 py-1 rounded-full text-label-sm font-bold`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                    <Icon name="calendar_today" size={16} />
                    <span className="text-label-sm">
                      {eventStartOf(reg) ? new Date(eventStartOf(reg)).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">
                    {eventTitleOf(reg)}
                  </h3>
                  <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">{eventDescriptionOf(reg)}</p>

                  {reg.hours || reg.attendedHours ? (
                    <div className="mb-4 rounded-2xl bg-surface-variant/60 px-4 py-3 text-sm text-on-surface-variant">
                      <Icon name="timer" size={16} className="text-primary mr-1" />
                      Ghi nhận {reg.hours || reg.attendedHours} giờ tình nguyện
                    </div>
                  ) : null}

                  <div className="mt-auto space-y-2">
                    <Link to={`/su-kien/${eventId}`} className="btn-secondary w-full text-center flex items-center justify-center gap-2">
                      <Icon name="info" size={18} />
                      Xem chi tiết
                    </Link>
                    {canSelfCheckin && (
                      <button type="button" onClick={() => openDialog('checkin', reg)} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Icon name="qr_code_scanner" size={18} />
                        Tự check-in
                      </button>
                    )}
                    {canRate && (
                      <button type="button" onClick={() => openDialog('rating', reg)} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Icon name="reviews" size={18} />
                        Đánh giá sự kiện
                      </button>
                    )}
                    {canWithdraw && (
                      <button type="button" onClick={() => openDialog('withdraw', reg)} className="btn-danger w-full">
                        Rút đăng ký
                      </button>
                    )}
                    {canCancelRequest && (
                      <button type="button" onClick={() => openDialog('cancel-request', reg)} className="btn-secondary w-full text-error border-error/20">
                        Yêu cầu hủy
                      </button>
                    )}
                    {hasRating(reg) && (
                      <div className="rounded-2xl bg-success-container px-4 py-3 text-sm font-bold text-on-success-container text-center">
                        Đã gửi đánh giá
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={dialog === 'withdraw'}
        title="Rút đăng ký"
        message={`Bạn chắc chắn muốn rút khỏi "${eventTitleOf(selected)}"?`}
        confirmText={busy ? 'Đang xử lý...' : 'Rút đăng ký'}
        danger
        onConfirm={handleWithdraw}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={dialog === 'cancel-request'}
        title="Yêu cầu hủy đăng ký"
        message={`Gửi lý do hủy đăng ký "${eventTitleOf(selected)}" để ban tổ chức xét duyệt.`}
        confirmText={busy ? 'Đang gửi...' : 'Gửi yêu cầu'}
        reason={reason}
        onReasonChange={setReason}
        onConfirm={handleCancelRequest}
        onClose={closeDialog}
      />

      {dialog === 'checkin' && (
        <Modal title="Tự check-in" onClose={closeDialog}>
          <p className="text-on-surface-variant">Nhập mã QR/check-in mà ban tổ chức công bố tại sự kiện.</p>
          <input
            className="input-field mt-4"
            value={checkinCode}
            onChange={(event) => setCheckinCode(event.target.value)}
            placeholder="VD: VH-CHECKIN-..."
          />
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={closeDialog}>Hủy</button>
            <button type="button" className="btn-primary" onClick={handleSelfCheckin} disabled={busy}>
              {busy ? 'Đang check-in...' : 'Check-in'}
            </button>
          </div>
        </Modal>
      )}

      {dialog === 'rating' && (
        <Modal title="Đánh giá sự kiện" onClose={closeDialog}>
          <div className="space-y-4">
            <div>
              <p className="font-bold text-on-surface">{eventTitleOf(selected)}</p>
              <p className="text-on-surface-variant text-sm">Đánh giá giúp ban tổ chức cải thiện chất lượng hoạt động.</p>
            </div>
            <StarRating value={ratingForm.score} onChange={(score) => setRatingForm((prev) => ({ ...prev, score }))} />
            <textarea
              className="input-field min-h-32"
              value={ratingForm.comment}
              onChange={(event) => setRatingForm((prev) => ({ ...prev, comment: event.target.value }))}
              placeholder="Nhận xét của bạn về khâu tổ chức, nội dung, điểm danh..."
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={closeDialog}>Hủy</button>
            <button type="button" className="btn-primary" onClick={handleSubmitRating} disabled={busy}>
              {busy ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-soft border border-outline w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-title-lg font-bold text-on-surface">{title}</h3>
          <button type="button" className="text-on-surface-variant hover:text-on-surface" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
