import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventApi, profileApi, registrationApi, skillApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, ConfirmDialog, getErrorMessage, unwrap } from '../../components/common/CommonUI';
import { normalizeRole } from '../../utils/navigation';

const formatDateTime = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getUserId = (user) => Number(user?.id ?? user?.userId ?? user?.sub ?? 0);

const parseRequiredSkillIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const getEventImage = (event) => event?.bannerUrl || event?.imageUrl || event?.photoUrl || '';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [skills, setSkills] = useState([]);
  const [volunteerSkills, setVolunteerSkills] = useState([]);
  const [myRegistration, setMyRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const role = normalizeRole(user);
  const isVolunteer = role === 'Volunteer';
  const isOwnerOrganizer = role === 'Organizer' && Number(event?.organizerId) === getUserId(user);

  useEffect(() => {
    setLoading(true);
    setError('');
    setNotice('');

    Promise.all([
      eventApi.getById(id, { skipAuth: true, skipAuthRefresh: true }),
      skillApi.getAll().catch(() => ({ data: [] })),
      user ? registrationApi.getMyRegistration(id).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      isVolunteer ? profileApi.getMyProfile().catch(() => ({ data: { skills: [] } })) : Promise.resolve({ data: { skills: [] } }),
    ])
      .then(([eventRes, skillRes, registrationRes, profileRes]) => {
        setEvent(eventRes.data);
        setSkills(unwrap(skillRes, []));
        setMyRegistration(registrationRes.data?.registration || registrationRes.data || null);
        setVolunteerSkills(Array.isArray(profileRes.data?.skills) ? profileRes.data.skills : []);
      })
      .catch((err) => {
        setEvent(null);
        setError(getErrorMessage(err, 'Không thể tải chi tiết sự kiện. Vui lòng thử lại sau.'));
      })
      .finally(() => setLoading(false));
  }, [id, user, isVolunteer]);

  const requiredSkillIds = useMemo(() => parseRequiredSkillIds(event?.requiredSkillIds), [event]);

  const requiredSkills = useMemo(() => {
    const ids = requiredSkillIds;
    if (ids.length === 0) return [];

    return ids.map((skillId) => {
      const skill = skills.find((item) => Number(item.id) === skillId);
      return skill?.name || `Kỹ năng #${skillId}`;
    });
  }, [requiredSkillIds, skills]);

  const hasMatchingSkill = useMemo(() => {
    if (!isVolunteer || requiredSkillIds.length === 0) return false;
    const ownedIds = new Set(volunteerSkills.map((item) => Number(item?.skillId || item?.skill?.id || item?.id)).filter(Boolean));
    return requiredSkillIds.some((skillId) => ownedIds.has(Number(skillId)));
  }, [isVolunteer, requiredSkillIds, volunteerSkills]);

  const currentParticipants = Number(event?.currentParticipants ?? event?.registrationCount ?? 0);
  const maxParticipants = Number(event?.maxParticipants || 0);
  const minParticipants = Number(event?.minParticipants || 1);
  const progress = maxParticipants > 0 ? Math.min(100, Math.round((currentParticipants / maxParticipants) * 100)) : 0;
  const registrationStatus = myRegistration?.status;
  const hasActiveRegistration = ['Pending', 'Confirmed'].includes(registrationStatus);
  const canRegister = isVolunteer && event?.status === 'Approved' && !hasActiveRegistration;
  const imageUrl = getEventImage(event);

  const handleRegister = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await registrationApi.register(id, { note: note.trim() });
      setMyRegistration(res.data?.registration || res.data || { status: 'Pending' });
      setEvent((prev) => prev ? {
        ...prev,
        registrationCount: Number(prev.registrationCount || prev.currentParticipants || 0) + 1,
        currentParticipants: Number(prev.currentParticipants || prev.registrationCount || 0) + 1,
      } : prev);
      setNotice('Đăng ký tham gia thành công.');
      setNote('');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể đăng ký. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!event) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await eventApi.cancel(event.id, cancelReason);
      setEvent((prev) => ({ ...(prev || {}), ...(res.data || {}), status: 'Cancelled' }));
      setNotice('Đã hủy sự kiện.');
      setCancelOpen(false);
      setCancelReason('');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể hủy sự kiện. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice('Đã sao chép liên kết sự kiện.');
      }
    } catch {
      setError('Không thể chia sẻ liên kết lúc này.');
    }
  };

  if (loading) return <Loading />;

  if (!event) {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => navigate('/su-kien')} className="inline-flex items-center gap-2 text-primary font-semibold">
          <Icon name="arrow_back" size={20} />
          Quay lại danh sách
        </button>
        <Alert type="error">{error || 'Sự kiện không tồn tại hoặc chưa được công khai.'}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-medium">
        <Icon name="arrow_back" size={20} />
        Quay lại danh sách
      </button>

      {notice && <Alert type="success">{notice}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_292px] gap-6 items-start">
        <main className="space-y-5">
          <article className="overflow-hidden rounded-3xl bg-white border border-outline shadow-soft">
            <div className="h-56 md:h-72 bg-primary-container">
              {imageUrl ? (
                <img src={imageUrl} alt={event.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary-container to-surface-variant text-primary">
                  <Icon name="image" size={72} />
                </div>
              )}
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {event.categoryName && (
                  <span className="inline-flex items-center rounded-full bg-primary-container px-3 py-1 text-label-sm font-bold text-primary">
                    {event.categoryName}
                  </span>
                )}
                {isOwnerOrganizer && (
                  <span className="inline-flex items-center rounded-full bg-surface-variant px-3 py-1 text-label-sm font-bold text-on-surface-variant">
                    Bài đăng sự kiện
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-black text-on-surface">{event.title}</h1>
                <p className="mt-4 text-on-surface-variant leading-7 whitespace-pre-line">
                  {event.description || 'Chưa có mô tả.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleShare} className="btn-secondary inline-flex items-center gap-2 !py-2 !px-4">
                  <Icon name="share" size={18} />
                  Chia sẻ
                </button>
                {isOwnerOrganizer && (
                  <>
                    <button type="button" onClick={() => navigate(`/quan-ly-su-kien?edit=${event.id}`)} className="btn-secondary inline-flex items-center gap-2 !py-2 !px-4">
                      <Icon name="edit" size={18} />
                      Quản lý
                    </button>
                    {!['cancelled', 'completed'].includes(String(event.status).toLowerCase()) && (
                      <button type="button" onClick={() => setCancelOpen(true)} className="btn-danger inline-flex items-center gap-2 !py-2 !px-4">
                        <Icon name="event_busy" size={18} />
                        Hủy sự kiện
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>

          <section className="rounded-3xl bg-white border border-outline shadow-soft p-5 md:p-6">
            <h2 className="text-title-md font-bold text-on-surface mb-4">Thông tin chi tiết</h2>
            <div className="space-y-3 text-body-md text-on-surface-variant">
              {event.location && (
                <div className="flex items-start gap-3">
                  <Icon name="location_on" className="text-primary mt-0.5" size={20} />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Icon name="calendar_month" className="text-primary mt-0.5" size={20} />
                <span>Bắt đầu: {formatDateTime(event.startDate)}</span>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="event_available" className="text-primary mt-0.5" size={20} />
                <span>Kết thúc: {formatDateTime(event.endDate)}</span>
              </div>
              {event.organizerName && (
                <div className="flex items-start gap-3">
                  <Icon name="business" className="text-primary mt-0.5" size={20} />
                  <span>Nhà tổ chức: {event.organizerName}</span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-outline shadow-soft p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h2 className="text-title-md font-bold text-on-surface">Kỹ năng yêu cầu</h2>
              {isVolunteer && requiredSkills.length > 0 && (
                <span className={`rounded-full px-3 py-1 text-label-sm font-bold ${
                  hasMatchingSkill
                    ? 'bg-success-container text-on-success-container'
                    : 'bg-warning-container text-amber-800'
                }`}>
                  {hasMatchingSkill ? 'Bạn có kỹ năng phù hợp' : 'Chưa có kỹ năng phù hợp'}
                </span>
              )}
            </div>

            {requiredSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((skill) => (
                  <span key={skill} className="rounded-full border border-outline bg-surface-variant px-3 py-1 text-label-sm font-semibold text-on-surface-variant">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant">Không yêu cầu kỹ năng cụ thể.</p>
            )}
          </section>
        </main>

        <aside className="lg:sticky lg:top-24 space-y-4">
          <section className="rounded-3xl bg-white border border-outline shadow-soft p-5">
            <h2 className="font-bold text-on-surface mb-5">Tình nguyện viên</h2>
            <div className="text-center">
              <div className="text-4xl font-black text-primary">
                {currentParticipants}
                <span className="text-base font-medium text-on-surface-variant">/{maxParticipants || '∞'}</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-surface-variant overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${maxParticipants ? progress : 100}%` }} />
              </div>
              <p className="mt-3 text-label-sm text-on-surface-variant">{progress}% đã đăng ký</p>
              <p className="text-label-sm text-on-surface-variant">Tối thiểu cần {minParticipants} người</p>
            </div>
          </section>

          {isVolunteer && event.status === 'Approved' && (
            <section className="rounded-3xl bg-white border border-outline shadow-soft p-5 space-y-4">
              <textarea
                className="input-field min-h-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú khi đăng ký (tùy chọn)..."
                disabled={busy || hasActiveRegistration}
              />
              <button
                type="button"
                onClick={handleRegister}
                disabled={busy || !canRegister}
                className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name={hasActiveRegistration ? 'check_circle' : 'how_to_reg'} size={20} />
                {busy
                  ? 'Đang xử lý...'
                  : hasActiveRegistration
                    ? registrationStatus === 'Confirmed' ? 'Đã được xác nhận tham gia' : 'Đã đăng ký, chờ xác nhận'
                    : 'Đăng ký tham gia'}
              </button>
              {registrationStatus === 'Cancelled' && (
                <p className="text-center text-sm text-on-surface-variant">Bạn đã hủy đăng ký trước đó. Có thể đăng ký lại nếu sự kiện còn mở.</p>
              )}
            </section>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Hủy sự kiện"
        message={`Bạn chắc chắn muốn hủy sự kiện "${event.title}"? Người tham gia và các bên liên quan sẽ được thông báo.`}
        confirmText="Hủy sự kiện"
        danger
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelEvent}
        onClose={() => {
          if (!busy) {
            setCancelOpen(false);
            setCancelReason('');
          }
        }}
      />
    </div>
  );
}
