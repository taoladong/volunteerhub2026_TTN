import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { registrationApi, ratingApi, supportCampaignApi } from '../../services/api';
import VolunteerCheckInModal from '../../components/ui/VolunteerCheckInModal';
import InterviewCallModal from '../../components/ui/InterviewCallModal';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import SectionLabel from '../../components/ui/SectionLabel';
import Tabs from '../../components/ui/Tabs';
import { fmt, fmtDateTime, money } from '../../utils/format';
import { isWithinCheckinWindow } from '../../utils/checkin';

/* ─── Status pill maps (ink color system) ─────────────────────────── */

const REG_PILL = {
  Attended:  { label: 'Đã tham gia',  bg: 'rgba(21,128,61,0.08)',   color: '#15803d' },
  Confirmed: { label: 'Đã xác nhận',  bg: 'rgba(27,97,201,0.08)',   color: '#1b61c9' },
  Pending:   { label: 'Chờ xác nhận', bg: 'rgba(180,83,9,0.08)',    color: '#b45309' },
  Cancelled: { label: 'Đã hủy',       bg: 'rgba(15,15,15,0.06)',    color: 'rgba(15,15,15,0.45)' },
  CancelReq: { label: 'Chờ hủy',      bg: 'rgba(180,83,9,0.08)',    color: '#b45309' },
};

const DON_PILL = {
  PendingConfirmation: { label: 'Chờ xác nhận', bg: 'rgba(180,83,9,0.08)',   color: '#b45309' },
  Confirmed:           { label: 'Đã xác nhận',  bg: 'rgba(21,128,61,0.08)', color: '#15803d' },
  Rejected:            { label: 'Bị từ chối',   bg: 'rgba(220,38,38,0.08)', color: '#dc2626' },
  Cancelled:           { label: 'Đã hủy',       bg: 'rgba(15,15,15,0.06)',  color: 'rgba(15,15,15,0.45)' },
};

/* ─── Helpers ─────────────────────────────────────────────────────── */

/** Build a Google Calendar "add event" template URL for an interview slot */
function buildGoogleCalendarUrl(r) {
  const slot = r.interviewSlot;
  if (!slot?.scheduledAt) return '#';
  const start = new Date(slot.scheduledAt);
  const end = new Date(start.getTime() + (slot.durationMinutes || 30) * 60000);
  const z = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = encodeURIComponent(`Phỏng vấn: ${r.event?.title || 'Sự kiện tình nguyện'}`);
  const details = encodeURIComponent(`Link cuộc họp: ${slot.meetingUrl || ''}\n${slot.note || ''}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${z(start)}/${z(end)}&details=${details}`;
}

/** Group registrations by event month (desc by startDate) */
function groupByMonth(items) {
  const sorted = [...items].sort((a, b) => {
    const da = a.event?.startDate ? new Date(a.event.startDate) : new Date(0);
    const db = b.event?.startDate ? new Date(b.event.startDate) : new Date(0);
    return db - da;
  });
  const map = new Map();
  sorted.forEach((item) => {
    const d = item.event?.startDate ? new Date(item.event.startDate) : null;
    const key = d
      ? d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
      : 'Không có ngày';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return Array.from(map.entries()).map(([label, list]) => ({ label, list }));
}

function RegStatusPill({ registration }) {
  let meta;
  if (registration.isAttended) meta = REG_PILL.Attended;
  else if (registration.cancelRequested && registration.status !== 'Cancelled') meta = REG_PILL.CancelReq;
  else meta = REG_PILL[registration.status] || REG_PILL.Pending;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 whitespace-nowrap"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function DonStatusPill({ status }) {
  const meta = DON_PILL[status] || { label: status, bg: 'rgba(15,15,15,0.06)', color: 'rgba(15,15,15,0.45)' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 whitespace-nowrap"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(f.key)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
          style={
            value === f.key
              ? { background: 'var(--c-ink)', color: '#fff', borderColor: 'var(--c-ink)' }
              : {
                  background: '#fff',
                  color: 'rgba(15,15,15,0.65)',
                  borderColor: 'rgba(15,15,15,0.12)',
                }
          }
        >
          {f.label}
          {f.count != null && (
            <span className="ml-1 opacity-55">{f.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Cancel modal ────────────────────────────────────────────────── */

function CancelRequestModal({ registration, onClose, onSubmit, saving }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (registration) setReason(registration.cancelReason || ''); }, [registration]);
  if (!registration) return null;
  return (
    <Modal isOpen={!!registration} onClose={onClose} title="Xin hủy đăng ký" size="md">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(reason); }}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <i className="fa-solid fa-triangle-exclamation mr-1.5" />
          Yêu cầu sẽ được gửi đến nhà tổ chức để xác nhận hủy.
        </div>
        <div>
          <label className="block text-sm font-medium text-warmink-2 mb-1.5">Lý do hủy</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field resize-none"
            placeholder="Ví dụ: bận việc đột xuất, không thể tham gia đúng giờ..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
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

/* ─── Main page ───────────────────────────────────────────────────── */

export default function Activity() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'donations' ? 'donations' : 'registrations';
  const [tab, setTab] = useState(initialTab);

  const [regs, setRegs] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingForms, setRatingForms] = useState({});
  const [checkinTarget, setCheckinTarget] = useState(null);
  const [interviewCallSlot, setInterviewCallSlot] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const loadAll = async () => {
    const [regsRes, donsRes] = await Promise.all([
      registrationApi.getMyRegistrations().catch(() => ({ data: [] })),
      supportCampaignApi.getMyDonations().catch(() => ({ data: [] })),
    ]);
    setRegs(regsRes.data || []);
    setDonations(donsRes.data || []);
  };

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (tab === 'donations') setSearchParams({ tab: 'donations' }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [tab]);

  return (
    <div className="max-w-[880px] mx-auto pb-12">
      <header className="mt-2 mb-6">
        <h1
          className="text-[28px] font-medium leading-tight tracking-tight"
          style={{ color: 'var(--c-ink)' }}
        >
          Hoạt động
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'rgba(15,15,15,0.55)' }}>
          Theo dõi đăng ký sự kiện và các khoản ủng hộ bạn đã gửi.
        </p>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'registrations', label: 'Đăng ký',  count: regs.length     || undefined },
          { key: 'donations',     label: 'Ủng hộ',   count: donations.length || undefined },
        ]}
        className="mb-6"
      />

      {loading ? (
        <LoadingSpinner />
      ) : tab === 'registrations' ? (
        <RegistrationsView
          regs={regs}
          ratingForms={ratingForms}
          setRatingForms={setRatingForms}
          onCheckin={setCheckinTarget}
          onOpenInterviewCall={setInterviewCallSlot}
          onCancel={setCancelTarget}
          onReload={loadAll}
        />
      ) : (
        <DonationsView donations={donations} onReload={loadAll} />
      )}

      <VolunteerCheckInModal
        registration={checkinTarget}
        onClose={() => setCheckinTarget(null)}
        onDone={(updated) => {
          setRegs((prev) => prev.map((r) =>
            r.id === updated.id ? { ...r, ...updated, event: r.event, shift: r.shift } : r,
          ));
          setCheckinTarget(null);
        }}
      />

      <CancelRequestModal
        registration={cancelTarget}
        onClose={() => setCancelTarget(null)}
        saving={cancelSaving}
        onSubmit={async (reason) => {
          if (!cancelTarget) return;
          setCancelSaving(true);
          try {
            const res = await registrationApi.requestCancelRegistration(cancelTarget.eventId, reason);
            setRegs((prev) => prev.map((r) =>
              r.id === cancelTarget.id ? { ...r, ...res.data, event: r.event, shift: r.shift } : r,
            ));
            setCancelTarget(null);
          } catch (err) {
            alert(err.response?.data?.message || 'Gửi yêu cầu hủy thất bại');
          } finally {
            setCancelSaving(false);
          }
        }}
      />

      <InterviewCallModal
        slot={interviewCallSlot}
        forceCaller={false}
        onClose={() => setInterviewCallSlot(null)}
      />
    </div>
  );
}

/* ─── Registrations view ──────────────────────────────────────────── */

function RegistrationsView({ regs, ratingForms, setRatingForms, onCheckin, onOpenInterviewCall, onCancel, onReload }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all')       return regs;
    if (filter === 'attended')  return regs.filter((r) => r.isAttended);
    if (filter === 'Confirmed') return regs.filter((r) => r.status === 'Confirmed' && !r.isAttended);
    return regs.filter((r) => r.status === filter);
  }, [regs, filter]);

  const filterOptions = [
    { key: 'all',       label: 'Tất cả',       count: regs.length },
    { key: 'Pending',   label: 'Chờ xác nhận', count: regs.filter((r) => r.status === 'Pending').length },
    { key: 'Confirmed', label: 'Đã xác nhận',  count: regs.filter((r) => r.status === 'Confirmed' && !r.isAttended).length },
    { key: 'attended',  label: 'Đã tham gia',  count: regs.filter((r) => r.isAttended).length },
    { key: 'Cancelled', label: 'Đã hủy',       count: regs.filter((r) => r.status === 'Cancelled').length },
  ];

  const withdraw = async (eventId) => {
    if (!confirm('Bạn có chắc muốn rút đăng ký?')) return;
    try { await registrationApi.withdraw(eventId); onReload(); }
    catch (err) { alert(err.response?.data?.message || 'Rút đăng ký thất bại'); }
  };

  const submitRating = async (registration) => {
    const form = ratingForms[registration.id] || { score: 5, comment: '' };
    const rateeId = registration.event?.organizerId;
    if (!rateeId) { alert('Không tìm thấy ban tổ chức để đánh giá'); return; }
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

  if (regs.length === 0) {
    return (
      <EmptyState
        icon="fa-clipboard-list"
        title="Bạn chưa đăng ký sự kiện nào"
        description="Tìm sự kiện phù hợp và bắt đầu hành trình tình nguyện của bạn."
        cta="Khám phá sự kiện"
        ctaTo="/events"
      />
    );
  }

  const groups = groupByMonth(filtered);

  return (
    <div className="space-y-1">
      <FilterChips options={filterOptions} value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div
          className="card px-5 py-10 text-center text-sm mt-4"
          style={{ border: '1px solid var(--c-border)', color: 'rgba(15,15,15,0.45)' }}
        >
          Không có đăng ký nào ở trạng thái này.
        </div>
      ) : groups.map(({ label, list }) => (
        <div key={label}>
          <SectionLabel className="mt-7 mb-3">{label}</SectionLabel>
          <div className="space-y-2">
            {list.map((r) => (
              <RegistrationCard
                key={r.id}
                registration={r}
                ratingForm={ratingForms[r.id]}
                setRatingForms={setRatingForms}
                onCheckin={onCheckin}
                onOpenInterviewCall={onOpenInterviewCall}
                onCancel={onCancel}
                onWithdraw={withdraw}
                onSubmitRating={submitRating}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Registration card ───────────────────────────────────────────── */

function RegistrationCard({
  registration: r,
  ratingForm,
  setRatingForms,
  onCheckin,
  onOpenInterviewCall,
  onCancel,
  onWithdraw,
  onSubmitRating,
}) {
  const canCheckin  = r.status === 'Confirmed'
    && !r.isAttended
    && r.event?.status === 'Approved'
    && isWithinCheckinWindow(r.event, r.shift);
  const canCancel   = r.status === 'Confirmed' && !r.isAttended && !r.cancelRequested
    && r.event?.status !== 'Completed' && r.event?.status !== 'Cancelled';
  const canWithdraw = r.status === 'Pending';
  const hasRated = r.hasRated || ratingForm?.done;
  const isEditingRating = ratingForm?.editing;
  const needsRating = r.isAttended && r.event?.status === 'Completed';

  // Single primary CTA — highest priority first
  const primaryAction = canCheckin ? 'checkin'
    : (needsRating && !hasRated) ? 'rate'
    : canCancel ? 'cancel'
    : canWithdraw ? 'withdraw'
    : null;

  return (
    <div
      className="rounded-lg overflow-hidden bg-white"
      style={{ border: '1px solid var(--c-border)' }}
    >
      {/* ── Card body ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Thumbnail */}
        <Link to={`/events/${r.eventId}`} className="flex-shrink-0 mt-0.5">
          <div
            className="w-[72px] h-[72px] rounded-lg overflow-hidden"
            style={{
              background: 'var(--c-surface-2)',
              border: '1px solid var(--c-border)',
            }}
          >
            {r.event?.imageUrl ? (
              <img
                src={r.event.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="fa-solid fa-calendar-days text-lg" style={{ color: 'rgba(27,97,201,0.22)' }} />
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/events/${r.eventId}`}
              className="text-[14px] font-medium leading-snug line-clamp-2 no-underline hover:underline"
              style={{ color: 'var(--c-ink)' }}
            >
              {r.event?.title || `Sự kiện #${r.eventId}`}
            </Link>
            <RegStatusPill registration={r} />
          </div>

          <div
            className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs"
            style={{ color: 'rgba(15,15,15,0.50)' }}
          >
            {r.event?.startDate && (
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-calendar text-[10px]" style={{ color: 'rgba(15,15,15,0.28)' }} />
                {fmt(r.event.startDate)}
              </span>
            )}
            {r.event?.location && (
              <span className="flex items-center gap-1 max-w-[160px] sm:max-w-none">
                <i className="fa-solid fa-location-dot flex-shrink-0 text-[10px]" style={{ color: 'rgba(15,15,15,0.28)' }} />
                <span className="truncate">{r.event.location}</span>
              </span>
            )}
            {r.shift?.name && (
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-layer-group text-[10px]" style={{ color: 'rgba(15,15,15,0.28)' }} />
                {r.shift.name}
              </span>
            )}
            {r.isAttended && r.volunteerHours != null && (
              <span className="flex items-center gap-1 font-medium" style={{ color: '#15803d' }}>
                <i className="fa-solid fa-clock text-[10px]" />
                {r.volunteerHours}h
              </span>
            )}
          </div>

          {r.note && (
            <p
              className="text-xs italic mt-1.5 line-clamp-1"
              style={{ color: 'rgba(15,15,15,0.38)' }}
            >
              "{r.note}"
            </p>
          )}

          {r.interviewSlot && r.interviewStatus === 'Scheduled' && (
            <div className="mt-2 rounded-lg p-2.5" style={{ background: 'rgba(27,97,201,0.06)', border: '1px solid rgba(27,97,201,0.18)' }}>
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#1b61c9' }}>
                <i className="fa-solid fa-video" />
                <span>Phỏng vấn: {fmtDateTime(r.interviewSlot.scheduledAt)}</span>
              </div>
              {r.interviewSlot.note && (
                <p className="text-xs mt-1" style={{ color: 'rgba(15,15,15,0.55)' }}>{r.interviewSlot.note}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={() => onOpenInterviewCall && onOpenInterviewCall(r.interviewSlot)} className="btn-primary btn-sm text-xs no-underline">
                  <i className="fa-solid fa-video mr-1" /> Vào phòng phỏng vấn
                </button>
                {r.interviewSlot.meetingUrl && (
                  <a href={r.interviewSlot.meetingUrl} target="_blank" rel="noreferrer" className="btn-primary btn-sm text-xs no-underline">
                    <i className="fa-solid fa-arrow-up-right-from-square mr-1" /> Vào phòng họp
                  </a>
                )}
                <a href={buildGoogleCalendarUrl(r)} target="_blank" rel="noreferrer" className="btn-secondary btn-sm text-xs no-underline">
                  <i className="fa-regular fa-calendar-plus mr-1" /> Thêm vào lịch
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Rating form (inline, when attended + completed) ── */}
      {needsRating && (!hasRated || isEditingRating) && (
        <div
          className="px-4 py-3 space-y-2"
          style={{
            borderTop: '1px solid var(--c-border)',
            background: 'rgba(15,15,15,0.015)',
          }}
        >
          <p className="text-xs font-medium" style={{ color: 'rgba(15,15,15,0.55)' }}>
            <i className="fa-solid fa-star mr-1.5" style={{ color: '#f59e0b' }} />
            Đánh giá ban tổ chức
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={ratingForm?.score ?? r.ratingScore ?? 5}
              onChange={(e) => setRatingForms((prev) => ({
                ...prev, [r.id]: { ...(prev[r.id] || {}), score: e.target.value },
              }))}
              className="input-field text-xs sm:w-28"
            >
              {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} sao</option>)}
            </select>
            <input
              value={ratingForm?.comment ?? r.ratingComment ?? ''}
              onChange={(e) => setRatingForms((prev) => ({
                ...prev, [r.id]: { ...(prev[r.id] || {}), comment: e.target.value },
              }))}
              className="input-field text-xs flex-1"
              placeholder="Nhận xét về ban tổ chức..."
            />
            <button
              type="button"
              onClick={() => onSubmitRating(r)}
              disabled={ratingForm?.saving}
              className="text-xs font-semibold px-3 py-1.5 rounded-md text-white flex items-center justify-center gap-1.5 transition-opacity whitespace-nowrap"
              style={{ background: 'var(--c-ink)', opacity: ratingForm?.saving ? 0.6 : 1 }}
            >
              {ratingForm?.saving
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <i className="fa-solid fa-paper-plane text-[10px]" />}
              Gửi đánh giá
            </button>
          </div>
        </div>
      )}

      {/* ── Rating done confirmation ── */}
      {hasRated && !isEditingRating && (
        <div
          className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-medium"
          style={{
            borderTop: '1px solid var(--c-border)',
            color: '#15803d',
            background: 'rgba(21,128,61,0.04)',
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <i className="fa-solid fa-circle-check" />
          Đã gửi đánh giá ban tổ chức
          </span>
          <button
            type="button"
            onClick={() => setRatingForms((prev) => ({
              ...prev,
              [r.id]: {
                ...(prev[r.id] || {}),
                ratingId: r.ratingId,
                score: prev[r.id]?.score ?? r.ratingScore ?? 5,
                comment: prev[r.id]?.comment ?? r.ratingComment ?? '',
                editing: true,
              },
            }))}
            className="rounded-md border border-green-200 bg-white px-2 py-1 text-[11px] font-semibold text-green-700"
          >
            Sửa
          </button>
        </div>
      )}

      {/* ── Primary CTA strip ── */}
      {primaryAction && primaryAction !== 'rate' && (
        <div
          className="px-4 py-2.5 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--c-border)' }}
        >
          <span className="text-xs" style={{ color: 'rgba(15,15,15,0.35)' }}>
            {primaryAction === 'checkin'  && 'Sự kiện đang diễn ra'}
            {primaryAction === 'cancel'   && 'Muốn thay đổi kế hoạch?'}
            {primaryAction === 'withdraw' && 'Chưa được xác nhận'}
          </span>

          {primaryAction === 'checkin' && (
            <button
              type="button"
              onClick={() => onCheckin(r)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 text-white transition-opacity"
              style={{ background: '#1b61c9' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <i className="fa-solid fa-circle-check" /> Điểm danh
            </button>
          )}

          {primaryAction === 'cancel' && (
            <button
              type="button"
              onClick={() => onCancel(r)}
              className="text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
              style={{ border: '1px solid rgba(15,15,15,0.12)', color: 'rgba(15,15,15,0.65)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(15,15,15,0.25)';
                e.currentTarget.style.background  = 'rgba(15,15,15,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(15,15,15,0.12)';
                e.currentTarget.style.background  = 'transparent';
              }}
            >
              <i className="fa-solid fa-paper-plane" /> Xin hủy tham dự
            </button>
          )}

          {primaryAction === 'withdraw' && (
            <button
              type="button"
              onClick={() => onWithdraw(r.eventId)}
              className="text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
              style={{
                border: '1px solid rgba(220,38,38,0.20)',
                color: '#dc2626',
                background: 'rgba(220,38,38,0.04)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.09)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.04)'; }}
            >
              <i className="fa-solid fa-xmark" /> Rút đăng ký
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Donations view ──────────────────────────────────────────────── */

function DonationsView({ donations, onReload }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () => [...donations]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((d) => filter === 'all' || d.status === filter),
    [donations, filter],
  );

  const totalConfirmed = useMemo(
    () => donations
      .filter((d) => d.status === 'Confirmed')
      .reduce((s, d) => s + (Number(d.amount) || 0), 0),
    [donations],
  );
  const totalPending = useMemo(
    () => donations
      .filter((d) => d.status === 'PendingConfirmation')
      .reduce((s, d) => s + (Number(d.amount) || 0), 0),
    [donations],
  );

  const cancel = async (donation) => {
    if (!confirm('Hủy khoản ủng hộ đang chờ xác nhận này?')) return;
    try { await supportCampaignApi.cancelDonation(donation.id); onReload(); }
    catch (err) { alert(err.response?.data?.message || 'Hủy thất bại.'); }
  };

  const filterOptions = [
    { key: 'all',                 label: 'Tất cả',       count: donations.length },
    { key: 'PendingConfirmation', label: 'Chờ xác nhận', count: donations.filter((d) => d.status === 'PendingConfirmation').length },
    { key: 'Confirmed',           label: 'Đã xác nhận',  count: donations.filter((d) => d.status === 'Confirmed').length },
    { key: 'Rejected',            label: 'Bị từ chối',   count: donations.filter((d) => d.status === 'Rejected').length },
    { key: 'Cancelled',           label: 'Đã hủy',       count: donations.filter((d) => d.status === 'Cancelled').length },
  ];

  if (donations.length === 0) {
    return (
      <EmptyState
        icon="fa-hand-holding-heart"
        title="Bạn chưa gửi khoản ủng hộ nào"
        description="Ủng hộ một sự kiện đang kêu gọi để hỗ trợ cộng đồng."
        cta="Tìm chiến dịch"
        ctaTo="/events"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div
        className="card px-5 py-4"
        style={{ border: '1px solid var(--c-border)' }}
      >
        <div className="flex items-baseline gap-4 sm:gap-6 flex-wrap">
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums" style={{ color: 'var(--c-ink)' }}>
              {money(totalConfirmed)}
            </span>
            <span className="text-sm" style={{ color: 'rgba(15,15,15,0.50)' }}>đã xác nhận</span>
          </span>
          <span style={{ color: 'rgba(15,15,15,0.20)' }}>·</span>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums" style={{ color: '#b45309' }}>
              {money(totalPending)}
            </span>
            <span className="text-sm" style={{ color: 'rgba(15,15,15,0.50)' }}>đang chờ</span>
          </span>
          <span style={{ color: 'rgba(15,15,15,0.20)' }}>·</span>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums" style={{ color: 'var(--c-ink)' }}>
              {donations.length}
            </span>
            <span className="text-sm" style={{ color: 'rgba(15,15,15,0.50)' }}>lần ủng hộ</span>
          </span>
        </div>
      </div>

      <FilterChips options={filterOptions} value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div
          className="card px-5 py-10 text-center text-sm"
          style={{ border: '1px solid var(--c-border)', color: 'rgba(15,15,15,0.45)' }}
        >
          Không có khoản ủng hộ nào ở trạng thái này.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => <DonationCard key={d.id} donation={d} onCancel={cancel} />)}
        </div>
      )}
    </div>
  );
}

/* ─── Donation card ───────────────────────────────────────────────── */

function DonationCard({ donation: d, onCancel }) {
  return (
    <div
      className="rounded-lg overflow-hidden bg-white"
      style={{ border: '1px solid var(--c-border)' }}
    >
      <div className="flex items-start gap-0 p-4">
        {/* Amount — prominent left column */}
        <div className="flex-shrink-0 w-24 pr-4">
          <p className="text-base font-semibold tabular-nums leading-tight" style={{ color: 'var(--c-ink)' }}>
            {money(d.amount)}
          </p>
        </div>

        {/* Vertical divider */}
        <div
          className="flex-shrink-0 w-px self-stretch mr-4"
          style={{ background: 'rgba(15,15,15,0.07)' }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/events/${d.eventId}`}
              className="text-[14px] font-medium leading-snug line-clamp-1 no-underline hover:underline"
              style={{ color: 'var(--c-ink)' }}
            >
              {d.eventTitle}
            </Link>
            <DonStatusPill status={d.status} />
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(15,15,15,0.50)' }}>
            {d.campaignTitle}
          </p>
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'rgba(15,15,15,0.38)' }}>
            <i className="fa-solid fa-clock text-[9px]" />
            {fmtDateTime(d.createdAt)}
          </p>
          {d.rejectedReason && (
            <p className="text-xs mt-1.5 flex items-start gap-1" style={{ color: '#dc2626' }}>
              <i className="fa-solid fa-circle-info mt-0.5 flex-shrink-0" />
              {d.rejectedReason}
            </p>
          )}
        </div>
      </div>

      {d.status === 'PendingConfirmation' && (
        <div
          className="px-4 py-2.5 flex justify-end"
          style={{ borderTop: '1px solid var(--c-border)' }}
        >
          <button
            onClick={() => onCancel(d)}
            className="text-xs font-medium transition-colors"
            style={{ color: 'rgba(15,15,15,0.40)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(15,15,15,0.40)'; }}
          >
            Hủy khoản ủng hộ
          </button>
        </div>
      )}
    </div>
  );
}
