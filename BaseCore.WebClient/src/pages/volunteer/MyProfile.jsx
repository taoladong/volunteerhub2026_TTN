import React, { useEffect, useState } from 'react';
import { profileApi, profileSkillApi, skillApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import ImageUploadField from '../../components/ui/ImageUploadField';
import AvatarUploadField from '../../components/ui/AvatarUploadField';

/* ─── Ink-system lookup tables ─────────────────────────────────────── */

const LEVEL_PILL = {
  Beginner:     { bg: 'rgba(245,158,11,0.09)',  color: '#b45309' },
  Intermediate: { bg: 'rgba(27,97,201,0.09)',   color: '#1b61c9' },
  Expert:       { bg: 'rgba(15,15,15,0.08)',    color: 'var(--c-ink)' },
};

const VERIFY_STATUS = {
  SelfDeclared:        { label: 'Tự khai',        bg: 'rgba(15,15,15,0.06)',   color: 'rgba(15,15,15,0.55)' },
  PendingVerification: { label: 'Chờ xác minh',   bg: 'rgba(245,158,11,0.09)', color: '#b45309' },
  ChangesRequested:    { label: 'Cần bổ sung',    bg: 'rgba(234,88,12,0.09)',  color: '#c2410c' },
  Verified:            { label: 'Đã xác minh',    bg: 'rgba(22,163,74,0.09)',  color: '#15803d' },
  Rejected:            { label: 'Bị từ chối',     bg: 'rgba(220,38,38,0.09)',  color: '#b91c1c' },
  Unverified:          { label: 'Chưa xác minh',  bg: 'rgba(15,15,15,0.06)',   color: 'rgba(15,15,15,0.55)' },
};

const KYC_STATUS_PILL = {
  Unverified:          { label: 'Chưa xác minh',  bg: 'rgba(15,15,15,0.06)',   color: 'rgba(15,15,15,0.55)' },
  PendingVerification: { label: 'Chờ xét duyệt',  bg: 'rgba(245,158,11,0.09)', color: '#b45309' },
  Verified:            { label: 'Đã xác minh',    bg: 'rgba(22,163,74,0.09)',  color: '#15803d' },
  Rejected:            { label: 'Bị từ chối',     bg: 'rgba(220,38,38,0.09)',  color: '#b91c1c' },
  ChangesRequested:    { label: 'Cần bổ sung',    bg: 'rgba(234,88,12,0.09)',  color: '#c2410c' },
};

const emptyKyc = {
  identityFrontImageUrl: '',
  identityBackImageUrl: '',
  portraitImageUrl: '',
};

/* ─── Accordion section ─────────────────────────────────────────────── */

function AccordionSection({ title, icon, open, onToggle, badge, children }) {
  return (
    <div
      className="card overflow-hidden"
      style={{ border: '1px solid var(--c-border)' }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        style={{ background: open ? 'rgba(15,15,15,0.015)' : 'transparent' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(15,15,15,0.04)',
            border: '1px solid rgba(15,15,15,0.07)',
          }}
        >
          <i
            className={`fa-solid ${icon} text-[13px]`}
            style={{ color: 'rgba(15,15,15,0.50)' }}
          />
        </div>

        <span
          className="flex-1 text-[14px] font-medium"
          style={{ color: 'var(--c-ink)' }}
        >
          {title}
        </span>

        {badge != null && (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full mr-1"
            style={{
              background: 'rgba(15,15,15,0.05)',
              color: 'rgba(15,15,15,0.50)',
            }}
          >
            {badge}
          </span>
        )}

        <i
          className={`fa-solid fa-chevron-down text-[11px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'rgba(15,15,15,0.35)' }}
        />
      </button>

      {/* Body */}
      {open && (
        <div
          className="px-5 pb-5"
          style={{ borderTop: '1px solid rgba(15,15,15,0.06)' }}
        >
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Inline pill ───────────────────────────────────────────────────── */

function Pill({ label, bg, color }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */

export default function MyProfile({ embedded = false }) {
  const [profile, setProfile]                 = useState(null);
  const [skills, setSkills]                   = useState([]);
  const [allSkills, setAllSkills]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [kycSaving, setKycSaving]             = useState(false);
  const [showSkillModal, setShowSkillModal]   = useState(false);
  const [verificationModal, setVerificationModal] = useState(null);
  const { updateUser }                        = useAuth();
  const [form, setForm]                       = useState({ name: '', phone: '', bloodType: '', interests: '', bio: '', avatarUrl: '' });
  const [kycForm, setKycForm]                 = useState(emptyKyc);
  const [skillForm, setSkillForm]             = useState({ skillId: '', level: 'Beginner', evidenceUrl: '', verificationNote: '' });
  const [verificationForm, setVerificationForm] = useState({ evidenceUrl: '', verificationNote: '' });
  const [msg, setMsg]                         = useState('');
  const [open, setOpen]                       = useState({ personal: true, bio: false, skills: false, kyc: false });

  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const loadProfile = async () => {
    const res = await profileApi.getMyProfile();
    const p   = res.data.profile;
    setProfile(p);
    setSkills(res.data.skills || []);
    if (p) {
      setForm({
        name: p.user?.name || '',
        phone: p.user?.phone || '',
        bloodType: p.bloodType || '',
        interests: p.interests || '',
        bio:       p.bio       || '',
        avatarUrl: p.avatarUrl || '',
      });
      setKycForm({
        identityFrontImageUrl: p.identityFrontImageUrl || '',
        identityBackImageUrl:  p.identityBackImageUrl  || '',
        portraitImageUrl:      p.portraitImageUrl      || '',
      });
    }
  };

  useEffect(() => {
    Promise.all([loadProfile(), skillApi.getAll().then((r) => setAllSkills(r.data || []))])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Handlers (unchanged logic) ── */

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await profileApi.updateProfile(form);
      setProfile(res.data);
      // Đồng bộ tên/SĐT hiển thị ở topbar/sidebar (AuthContext + localStorage).
      updateUser({ name: form.name.trim(), phone: form.phone.trim() });
      window.dispatchEvent(new CustomEvent('volunteerhub:profile-updated', { detail: res.data }));
      setMsg('Đã lưu hồ sơ thành công.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Lưu hồ sơ thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const submitKyc = async () => {
    setKycSaving(true);
    try {
      const res = await profileApi.submitKyc(kycForm);
      setProfile(res.data);
      setMsg('Đã gửi hồ sơ KYC. Admin sẽ kiểm tra trước khi xác minh.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi KYC thất bại.');
    } finally {
      setKycSaving(false);
    }
  };

  const addSkill = async () => {
    if (!skillForm.skillId) return;
    try {
      await profileSkillApi.add({
        skillId: Number(skillForm.skillId),
        level:   skillForm.level,
        evidenceUrl:      skillForm.evidenceUrl,
        verificationNote: skillForm.verificationNote,
      });
      await loadProfile();
      setShowSkillModal(false);
      setSkillForm({ skillId: '', level: 'Beginner', evidenceUrl: '', verificationNote: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Thêm kỹ năng thất bại.');
    }
  };

  const removeSkill = async (skillId) => {
    if (!confirm('Xóa kỹ năng này?')) return;
    await profileSkillApi.remove(skillId).catch(() => {});
    setSkills((prev) => prev.filter((s) => s.skillId !== skillId));
  };

  const openSkillVerification = (skill) => {
    setVerificationModal(skill);
    setVerificationForm({
      evidenceUrl:      skill.evidenceUrl      || '',
      verificationNote: skill.verificationNote || '',
    });
  };

  const submitSkillVerification = async () => {
    if (!verificationModal || !verificationForm.evidenceUrl) {
      alert('Vui lòng upload minh chứng trước khi gửi xác minh.');
      return;
    }
    try {
      await profileSkillApi.submitVerification(verificationModal.skillId, verificationForm);
      await loadProfile();
      setVerificationModal(null);
      setVerificationForm({ evidenceUrl: '', verificationNote: '' });
      setMsg('Đã gửi minh chứng kỹ năng. Admin sẽ kiểm tra và duyệt sau.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi minh chứng thất bại.');
    }
  };

  if (loading) return <LoadingSpinner />;

  const availableSkills = allSkills.filter((s) => !skills.find((vs) => vs.skillId === s.id));
  const kycStatus       = KYC_STATUS_PILL[profile?.kycStatus || 'Unverified'] || KYC_STATUS_PILL.Unverified;

  /* ── Profile completion meter ── */
  const completionItems = [
    { label: 'Ảnh đại diện',  done: !!form.avatarUrl },
    { label: 'Nhóm máu',      done: !!form.bloodType },
    { label: 'Sở thích',      done: !!form.interests },
    { label: 'Giới thiệu',    done: !!form.bio },
    { label: 'Kỹ năng',       done: skills.length > 0 },
    { label: 'KYC',           done: ['PendingVerification', 'Verified'].includes(profile?.kycStatus) },
  ];
  const doneCount       = completionItems.filter((i) => i.done).length;
  const completionPct   = Math.round((doneCount / completionItems.length) * 100);

  return (
    <div className={embedded ? 'space-y-3' : 'max-w-2xl mx-auto space-y-3'}>

      {/* ── Toast ── */}
      {msg && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: msg.includes('thất bại') ? 'rgba(220,38,38,0.07)' : 'rgba(22,163,74,0.07)',
            border: `1px solid ${msg.includes('thất bại') ? 'rgba(220,38,38,0.15)' : 'rgba(22,163,74,0.15)'}`,
            color: msg.includes('thất bại') ? '#b91c1c' : '#15803d',
          }}
        >
          <i className={`fa-solid ${msg.includes('thất bại') ? 'fa-circle-xmark' : 'fa-circle-check'} mr-2`} />
          {msg}
        </div>
      )}

      {/* ── Profile hero ── */}
      <div className="card overflow-hidden">
        <div style={{ height: 4, background: 'linear-gradient(90deg, #4d84e8 0%, #1b61c9 100%)' }} />
        <div className="px-5 py-5 flex items-center gap-4 flex-wrap">
          <AvatarUploadField
            variant="avatar"
            size={80}
            value={form.avatarUrl}
            onChange={(url) => setForm({ ...form, avatarUrl: url })}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] font-semibold truncate" style={{ color: 'var(--c-ink)', letterSpacing: '-0.01em' }}>
              {form.name || profile?.user?.name || 'Tình nguyện viên'}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="badge" style={{ background: kycStatus.bg, color: kycStatus.color }}>
                <i className={`fa-solid ${profile?.kycStatus === 'Verified' ? 'fa-shield-check' : 'fa-id-card'} text-[10px]`} />
                {kycStatus.label}
              </span>
              {profile?.totalVolunteerHours > 0 && (
                <span className="text-[13px]" style={{ color: 'var(--c-ink-2)' }}>
                  <i className="fa-solid fa-clock mr-1.5 text-[11px]" style={{ color: 'var(--c-ink-3)' }} />
                  {profile.totalVolunteerHours} giờ
                </span>
              )}
              {skills.length > 0 && (
                <span className="text-[13px]" style={{ color: 'var(--c-ink-2)' }}>
                  <i className="fa-solid fa-star mr-1.5 text-[11px]" style={{ color: 'var(--c-ink-3)' }} />
                  {skills.length} kỹ năng
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Completion meter ── */}
      <div
        className="card px-5 py-4"
        style={{ border: '1px solid var(--c-border)' }}
      >
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>
            Hoàn thiện hồ sơ{' '}
            <span className="font-semibold" style={{ color: '#1b61c9' }}>{completionPct}%</span>
          </span>
          <span className="text-[11px]" style={{ color: 'rgba(15,15,15,0.40)' }}>
            {doneCount}/{completionItems.length} mục
          </span>
        </div>
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{ background: 'var(--c-surface-2)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completionPct}%`,
              background: completionPct === 100
                ? 'linear-gradient(90deg, #34d399 0%, #16a34a 100%)'
                : 'linear-gradient(90deg, #4d84e8 0%, #1b61c9 100%)',
            }}
          />
        </div>
        {/* Missing items hint */}
        {doneCount < completionItems.length && (
          <p className="text-[11px] mt-2" style={{ color: 'rgba(15,15,15,0.40)' }}>
            Chưa có:{' '}
            {completionItems
              .filter((i) => !i.done)
              .map((i) => i.label)
              .join(', ')}
          </p>
        )}
      </div>

      {/* ── Thông tin cá nhân (form liền mạch) ── */}
      <form onSubmit={saveProfile} className="card p-5">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--c-ink)' }}>Thông tin cá nhân</h3>
        <p className="text-[12.5px] mt-0.5 mb-4" style={{ color: 'var(--c-ink-2)' }}>
          Thông tin này giúp ban tổ chức hiểu và gợi ý sự kiện phù hợp hơn cho bạn.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--c-ink-2)' }}>
              Họ và tên *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nguyễn Văn A"
              required
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--c-ink-2)' }}>
                Số điện thoại
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0901234567"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--c-ink-2)' }}>
                Nhóm máu
              </label>
              <select
                value={form.bloodType}
                onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                className="input-field"
              >
                <option value="">Không rõ</option>
                {['A', 'B', 'AB', 'O'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--c-ink-2)' }}>
              Sở thích
            </label>
            <input
              value={form.interests}
              onChange={(e) => setForm({ ...form, interests: e.target.value })}
              placeholder="Cắm trại, nhiếp ảnh, âm nhạc..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--c-ink-2)' }}>
              Giới thiệu bản thân
            </label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Viết vài dòng về bạn..."
              className="input-field resize-none"
            />
          </div>
        </div>

        {/* Footer save */}
        <div className="flex justify-end mt-5 pt-4" style={{ borderTop: '1px solid var(--c-border)' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <i className="fa-solid fa-floppy-disk" />
            Lưu hồ sơ
          </button>
        </div>
      </form>

      {/* ── Section 3: Kỹ năng ── */}
      <AccordionSection
        title="Kỹ năng"
        icon="fa-star"
        open={open.skills}
        onToggle={() => toggle('skills')}
        badge={skills.length > 0 ? skills.length : null}
      >
        <div className="space-y-3">
          {skills.length === 0 ? (
            <p className="text-[13px] text-center py-2" style={{ color: 'rgba(15,15,15,0.40)' }}>
              Chưa có kỹ năng nào
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((vs) => {
                const vst        = VERIFY_STATUS[vs.verificationStatus || 'SelfDeclared'] || VERIFY_STATUS.SelfDeclared;
                const lvl        = LEVEL_PILL[vs.level] || LEVEL_PILL.Beginner;
                const canEvidence = ['SelfDeclared', 'Rejected', 'ChangesRequested'].includes(vs.verificationStatus || 'SelfDeclared');
                return (
                  <div
                    key={vs.id}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(15,15,15,0.03)',
                      border: '1px solid rgba(15,15,15,0.09)',
                    }}
                  >
                    <span className="text-[13px] font-medium" style={{ color: 'var(--c-ink)' }}>
                      {vs.skill?.name}
                    </span>
                    <Pill label={vs.level} bg={lvl.bg} color={lvl.color} />
                    <Pill label={vst.label} bg={vst.bg} color={vst.color} />
                    {canEvidence && (
                      <button
                        type="button"
                        onClick={() => openSkillVerification(vs)}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors"
                        style={{ background: 'rgba(27,97,201,0.08)', color: '#1b61c9' }}
                      >
                        Gửi minh chứng
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSkill(vs.skillId)}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'rgba(15,15,15,0.35)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#b91c1c')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(15,15,15,0.35)')}
                    >
                      <i className="fa-solid fa-xmark text-[10px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSkillModal(true)}
            className="flex items-center gap-1.5 text-[13px] font-medium transition-colors"
            style={{ color: '#1b61c9' }}
          >
            <i className="fa-solid fa-plus text-[11px]" />
            Thêm kỹ năng
          </button>
        </div>
      </AccordionSection>

      {/* ── Section 4: KYC ── */}
      <AccordionSection
        title="Xác thực danh tính KYC"
        icon="fa-id-card"
        open={open.kyc}
        onToggle={() => toggle('kyc')}
        badge={kycStatus.label}
      >
        <div className="space-y-4">
          <p className="text-[13px]" style={{ color: 'rgba(15,15,15,0.55)' }}>
            Tùy chọn. Một số sự kiện yêu cầu volunteer đã xác thực KYC mới được đăng ký.
          </p>

          {profile?.kycAdminNote && (profile?.kycStatus === 'ChangesRequested' || profile?.kycStatus === 'Rejected') && (
            <div
              className="flex gap-3 rounded-lg px-4 py-3 text-[13px]"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.18)',
                color: '#b45309',
              }}
            >
              <i className="fa-solid fa-circle-info mt-0.5 flex-shrink-0" />
              <span>{profile.kycAdminNote}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ImageUploadField
              label="CCCD mặt trước"
              value={kycForm.identityFrontImageUrl}
              onChange={(url) => setKycForm((f) => ({ ...f, identityFrontImageUrl: url }))}
              variant="card"
            />
            <ImageUploadField
              label="CCCD mặt sau"
              value={kycForm.identityBackImageUrl}
              onChange={(url) => setKycForm((f) => ({ ...f, identityBackImageUrl: url }))}
              variant="card"
            />
            <ImageUploadField
              label="Ảnh chân dung"
              value={kycForm.portraitImageUrl}
              onChange={(url) => setKycForm((f) => ({ ...f, portraitImageUrl: url }))}
              variant="card"
            />
          </div>

          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg px-4 py-3"
            style={{ background: 'rgba(15,15,15,0.03)', border: '1px solid rgba(15,15,15,0.07)' }}
          >
            <p className="text-[13px]" style={{ color: 'rgba(15,15,15,0.55)' }}>
              Hồ sơ chuyển sang chờ xác minh sau khi gửi. Có thể gửi lại để cập nhật.
            </p>
            <button
              type="button"
              onClick={submitKyc}
              disabled={kycSaving}
              className="btn-primary flex shrink-0 items-center gap-2"
            >
              {kycSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <i className="fa-solid fa-paper-plane" />
              Gửi KYC
            </button>
          </div>
        </div>
      </AccordionSection>

      {/* ── Add skill modal ── */}
      <Modal
        open={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        title="Thêm kỹ năng"
        footer={(
          <>
            <button onClick={() => setShowSkillModal(false)} className="btn-secondary">Hủy</button>
            <button onClick={addSkill} className="btn-primary">Thêm</button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(15,15,15,0.70)' }}>
              Kỹ năng
            </label>
            <select
              value={skillForm.skillId}
              onChange={(e) => setSkillForm({ ...skillForm, skillId: e.target.value })}
              className="input-field"
            >
              <option value="">-- Chọn kỹ năng --</option>
              {availableSkills.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(15,15,15,0.70)' }}>
              Minh chứng kỹ năng
            </label>
            <ImageUploadField
              label="Upload minh chứng"
              value={skillForm.evidenceUrl}
              onChange={(url) => setSkillForm({ ...skillForm, evidenceUrl: url })}
              helper="Có minh chứng thì kỹ năng chuyển sang chờ xác minh; bỏ trống thì lưu là tự khai."
              compact
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(15,15,15,0.70)' }}>
              Ghi chú minh chứng
            </label>
            <textarea
              rows={2}
              value={skillForm.verificationNote}
              onChange={(e) => setSkillForm({ ...skillForm, verificationNote: e.target.value })}
              className="input-field resize-none"
              placeholder="VD: TOEIC 750, chứng chỉ sơ cứu..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(15,15,15,0.70)' }}>
              Mức độ
            </label>
            <div className="flex gap-2">
              {['Beginner', 'Intermediate', 'Expert'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSkillForm({ ...skillForm, level })}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium transition-colors"
                  style={
                    skillForm.level === level
                      ? { background: 'var(--c-ink)', color: '#fff', borderColor: 'var(--c-ink)' }
                      : { background: 'transparent', color: 'rgba(15,15,15,0.60)', borderColor: 'rgba(15,15,15,0.15)' }
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Skill verification modal ── */}
      <Modal
        open={Boolean(verificationModal)}
        onClose={() => setVerificationModal(null)}
        title="Gửi minh chứng kỹ năng"
        footer={(
          <>
            <button onClick={() => setVerificationModal(null)} className="btn-secondary">Hủy</button>
            <button onClick={submitSkillVerification} className="btn-primary">Gửi admin duyệt</button>
          </>
        )}
      >
        <div className="space-y-3">
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.18)',
              color: '#b45309',
            }}
          >
            Kỹ năng không có minh chứng sẽ chỉ là "Tự khai". Upload chứng chỉ/ảnh minh chứng để chuyển sang trạng thái "Chờ xác minh".
          </div>
          <ImageUploadField
            label="Minh chứng kỹ năng"
            value={verificationForm.evidenceUrl}
            onChange={(url) => setVerificationForm({ ...verificationForm, evidenceUrl: url })}
            helper="Ví dụ: chứng chỉ, ảnh bằng cấp, xác nhận tham gia khóa học hoặc tài liệu tương đương."
            compact
          />
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(15,15,15,0.70)' }}>
              Ghi chú gửi admin
            </label>
            <textarea
              rows={3}
              value={verificationForm.verificationNote}
              onChange={(e) => setVerificationForm({ ...verificationForm, verificationNote: e.target.value })}
              className="input-field resize-none"
              placeholder="Mô tả ngắn về minh chứng này..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
