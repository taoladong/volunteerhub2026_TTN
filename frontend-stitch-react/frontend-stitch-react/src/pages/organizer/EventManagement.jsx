import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { eventApi, eventCategoryApi, organizerVerificationApi, skillApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, ConfirmDialog, EmptyState, getErrorMessage, unwrap } from '../../components/common/CommonUI';

const DEFAULT_FORM = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  maxParticipants: 30,
  minParticipants: 1,
  categoryId: '',
  requiredSkillIds: [],
  requiresKyc: false,
  latitude: '10.762622',
  longitude: '106.660172',
  checkInRadiusKm: 0.5,
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const normalizeRequiredSkillIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const getVerificationCreateMessage = (verification) => {
  if (!verification || verification.canCreateEvents) return '';

  const statusLabel = {
    Unverified: 'chưa gửi hồ sơ xác minh',
    PendingVerification: 'đang chờ admin duyệt hồ sơ xác minh',
    ChangesRequested: 'cần bổ sung hồ sơ xác minh',
    Rejected: 'hồ sơ xác minh bị từ chối',
  }[verification.status] || verification.status || 'chưa được xác minh';

  return `Tài khoản tổ chức ${statusLabel}. Bạn cần được admin duyệt xác minh trước khi tạo sự kiện.`;
};

const buildFormFromEvent = (event) => ({
  title: event?.title || '',
  description: event?.description || '',
  startDate: toDateTimeLocal(event?.startDate),
  endDate: toDateTimeLocal(event?.endDate),
  location: event?.location || '',
  maxParticipants: event?.maxParticipants || 30,
  minParticipants: event?.minParticipants || 1,
  categoryId: event?.categoryId || '',
  requiredSkillIds: normalizeRequiredSkillIds(event?.requiredSkillIds),
  requiresKyc: Boolean(event?.requiresKyc),
  latitude: String(event?.latitude ?? '10.762622'),
  longitude: String(event?.longitude ?? '106.660172'),
  checkInRadiusKm: event?.checkInRadiusKm ?? 0.5,
});

function EventFormModal({ open, mode, form, categories, skills, saving, error, onChange, onSubmit, onClose }) {
  const isEdit = mode === 'edit';

  if (!open) return null;

  const toggleSkill = (skillId) => {
    const id = String(skillId);
    const current = form.requiredSkillIds || [];
    onChange({
      requiredSkillIds: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-3xl shadow-soft border border-outline w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-outline px-6 py-4 rounded-t-3xl flex items-center justify-between gap-4">
          <div>
            <h3 className="text-title-lg font-bold text-on-surface">{isEdit ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h3>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && <Alert type="error">{error}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Tiêu đề *</span>
              <input
                className="input-field"
                value={form.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="VD: Ngày hội trồng cây xanh"
                required
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Mô tả</span>
              <textarea
                className="input-field min-h-28"
                value={form.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Mô tả mục tiêu, hoạt động và quyền lợi của tình nguyện viên"
              />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Ngày bắt đầu *</span>
              <input
                className="input-field"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
                required
              />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Ngày kết thúc *</span>
              <input
                className="input-field"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
                required
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Địa điểm *</span>
              <input
                className="input-field"
                value={form.location}
                onChange={(e) => onChange({ location: e.target.value })}
                placeholder="VD: Công viên Gia Định, TP.HCM"
                required
              />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Tối thiểu</span>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.minParticipants}
                onChange={(e) => onChange({ minParticipants: e.target.value })}
              />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Số lượng tuyển *</span>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.maxParticipants}
                onChange={(e) => onChange({ maxParticipants: e.target.value })}
                required
              />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Danh mục *</span>
              <select
                className="input-field"
                value={form.categoryId}
                onChange={(e) => onChange({ categoryId: e.target.value })}
                required
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Bán kính check-in (km)</span>
              <input
                className="input-field"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={form.checkInRadiusKm}
                onChange={(e) => onChange({ checkInRadiusKm: e.target.value })}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 p-4 rounded-2xl border border-outline bg-surface-variant/30">
            <input
              type="checkbox"
              checked={form.requiresKyc}
              onChange={(e) => onChange({ requiresKyc: e.target.checked })}
              className="w-5 h-5 accent-primary"
            />
            <span>
              <span className="block text-label-md font-bold text-on-surface">Yêu cầu Volunteer đã KYC</span>
              <span className="block text-body-sm text-on-surface-variant">Chỉ tình nguyện viên đã xác minh danh tính mới được đăng ký.</span>
            </span>
          </label>

          <div>
            <div className="text-label-sm font-medium text-on-surface-variant mb-2">Yêu cầu kỹ năng</div>
            {skills.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant bg-surface-variant/40 rounded-2xl p-4">Chưa có danh sách kỹ năng từ hệ thống.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const selected = form.requiredSkillIds?.includes(String(skill.id));
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`px-3 py-2 rounded-full text-label-sm font-bold border transition-all ${
                        selected ? 'bg-primary text-on-primary border-primary' : 'bg-white text-on-surface-variant border-outline hover:border-primary'
                      }`}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-outline px-6 py-4 rounded-b-3xl flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            {saving && <Icon name="progress_activity" size={18} className="animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo mới'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EventManagement() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [openedEditId, setOpenedEditId] = useState('');

  const loadEvents = useCallback(async () => {
    const res = await eventApi.getMine();
    setEvents(unwrap(res, []).filter((event) => String(event.status).toLowerCase() !== 'cancelled'));
  }, []);

  useEffect(() => {
    Promise.all([
      loadEvents().catch(() => setEvents([])),
      eventCategoryApi.getAll().then((res) => setCategories(unwrap(res, []))).catch(() => setCategories([])),
      skillApi.getAll().then((res) => setSkills(unwrap(res, []))).catch(() => setSkills([])),
      organizerVerificationApi.getMine().then((res) => setVerification(unwrap(res, null))).catch(() => setVerification({ status: 'Unverified', canCreateEvents: false })),
    ]).finally(() => setLoading(false));
  }, [loadEvents]);

  const defaultCategoryId = useMemo(() => categories[0]?.id || '', [categories]);

  const openCreate = () => {
    const verificationMessage = getVerificationCreateMessage(verification);
    if (verificationMessage) {
      setError(verificationMessage);
      setNotice('');
      setFormOpen(false);
      return;
    }

    setEditingEvent(null);
    setForm({ ...DEFAULT_FORM, categoryId: defaultCategoryId });
    setError('');
    setNotice('');
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm(buildFormFromEvent(event));
    setError('');
    setNotice('');
    setFormOpen(true);
  };

  useEffect(() => {
    if (loading || events.length === 0) return;

    const editId = new URLSearchParams(location.search).get('edit');
    if (!editId || openedEditId === editId) return;

    const target = events.find((event) => String(event.id) === String(editId));
    if (target) {
      openEdit(target);
      setOpenedEditId(editId);
    }
  }, [events, loading, location.search, openedEditId]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const buildPayload = () => {
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      location: form.location.trim(),
      minParticipants: Number(form.minParticipants),
      maxParticipants: Number(form.maxParticipants),
      categoryId: Number(form.categoryId),
      requiredSkillIds: JSON.stringify((form.requiredSkillIds || []).map(Number).filter(Boolean)),
      requiresKyc: Boolean(form.requiresKyc),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      checkInRadiusKm: Number(form.checkInRadiusKm),
    };
  };

  const validateForm = () => {
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    const minParticipants = Number(form.minParticipants);
    const maxParticipants = Number(form.maxParticipants);
    const categoryId = Number(form.categoryId);
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const checkInRadiusKm = Number(form.checkInRadiusKm);

    if (!editingEvent) {
      const verificationMessage = getVerificationCreateMessage(verification);
      if (verificationMessage) return verificationMessage;
    }
    if (!form.title.trim()) return 'Vui lòng nhập tiêu đề sự kiện.';
    if (!form.location.trim()) return 'Vui lòng nhập địa điểm.';
    if (!form.startDate || !form.endDate) return 'Vui lòng chọn ngày bắt đầu và kết thúc.';
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Thời gian sự kiện không hợp lệ.';
    if (endDate <= startDate) return 'Ngày kết thúc phải sau ngày bắt đầu.';
    if (!editingEvent && startDate < new Date(Date.now() - 5 * 60 * 1000)) return 'Ngày bắt đầu phải ở hiện tại hoặc tương lai.';
    if (!form.categoryId) return 'Vui lòng chọn danh mục.';
    if (!Number.isInteger(categoryId) || categoryId < 1) return 'Danh mục sự kiện không hợp lệ.';
    if (!Number.isInteger(minParticipants) || minParticipants < 1) return 'Số lượng tối thiểu phải lớn hơn 0.';
    if (!Number.isInteger(maxParticipants) || maxParticipants < 1) return 'Số lượng tuyển phải lớn hơn 0.';
    if (minParticipants > maxParticipants) return 'Số lượng tối thiểu không được lớn hơn số lượng tuyển.';
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return 'Vui lòng nhập latitude hợp lệ.';
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return 'Vui lòng nhập longitude hợp lệ.';
    if (!Number.isFinite(checkInRadiusKm) || checkInRadiusKm <= 0 || checkInRadiusKm > 10) return 'Bán kính check-in phải lớn hơn 0 và không vượt quá 10 km.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (editingEvent) {
        const res = await eventApi.update(editingEvent.id, payload);
        const updated = unwrap(res, null);
        setEvents((prev) => prev.map((item) => (item.id === editingEvent.id ? { ...item, ...updated } : item)));
        setNotice('Đã cập nhật sự kiện thành công.');
      } else {
        const res = await eventApi.create(payload);
        const created = unwrap(res, null);
        if (created?.id) {
          setEvents((prev) => [created, ...prev]);
        }
        setNotice('Đã tạo sự kiện mới thành công.');
      }
      await loadEvents().catch(() => {});
      setFormOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể lưu sự kiện. Vui lòng kiểm tra lại dữ liệu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!cancelTarget) return;

    setSaving(true);
    setError('');
    try {
      const res = await eventApi.cancel(cancelTarget.id, cancelReason);
      const cancelled = unwrap(res, null);
      setEvents((prev) => prev.filter((item) => item.id !== cancelTarget.id));
      setNotice('Đã hủy sự kiện.');
      setCancelTarget(null);
      setCancelReason('');
      await loadEvents().catch(() => {});
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể hủy sự kiện. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Quản lý sự kiện</h2>
          <p className="text-on-surface-variant">Tạo, chỉnh sửa và quản lý bài đăng sự kiện của bạn.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2 w-fit">
          <Icon name="add" size={20} />
          Tạo mới
        </button>
      </div>

      {notice && <Alert type="success">{notice}</Alert>}

      {!formOpen && error && <Alert type="error">{error}</Alert>}

      {events.length === 0 ? (
        <EmptyState
          icon="event"
          title="Chưa có sự kiện nào"
          description="Bắt đầu tạo sự kiện đầu tiên của bạn!"
          action={(
            <button type="button" className="btn-primary flex items-center gap-2 mx-auto" onClick={openCreate}>
              <Icon name="add" size={20} />
              Tạo mới
            </button>
          )}
        />
      ) : (
        <div className="bg-white rounded-3xl shadow-soft border border-outline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-variant/50">
                <tr>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Tên sự kiện</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Ngày bắt đầu</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Đăng ký</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-primary-container/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-on-surface">{event.title}</div>
                      <div className="text-body-sm text-on-surface-variant line-clamp-1">{event.location || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">
                      {event.startDate ? new Date(event.startDate).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">{event.registrationCount || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => openEdit(event)} className="text-primary font-label text-label-md hover:underline">
                          Sửa
                        </button>
                        <Link to={`/su-kien/${event.id}`} className="text-primary font-label text-label-md hover:underline">
                          Chi tiết
                        </Link>
                        {!['cancelled', 'completed'].includes(String(event.status).toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelTarget(event);
                              setCancelReason('');
                              setError('');
                              setNotice('');
                            }}
                            className="text-error font-label text-label-md hover:underline"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EventFormModal
        open={formOpen}
        mode={editingEvent ? 'edit' : 'create'}
        form={form}
        categories={categories}
        skills={skills}
        saving={saving}
        error={error}
        onChange={updateForm}
        onSubmit={handleSubmit}
        onClose={() => !saving && setFormOpen(false)}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Hủy sự kiện"
        message={`Bạn chắc chắn muốn hủy sự kiện "${cancelTarget?.title || ''}"? Người tham gia và các bên liên quan sẽ được thông báo.`}
        confirmText="Hủy sự kiện"
        danger
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelEvent}
        onClose={() => {
          if (!saving) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
      />
    </div>
  );
}
