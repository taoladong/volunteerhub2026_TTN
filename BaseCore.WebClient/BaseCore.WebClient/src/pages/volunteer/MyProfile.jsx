import React, { useEffect, useState } from 'react';
import { profileApi, profileSkillApi, skillApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import ImageUploadField from '../../components/ui/ImageUploadField';
import AvatarUploadField from '../../components/ui/AvatarUploadField';

const LEVEL_COLOR = {
  Beginner: 'bg-yellow-100 text-yellow-700',
  Intermediate: 'bg-blue-100 text-blue-700',
  Expert: 'bg-primary-100 text-primary-700',
};

const VERIFY_STATUS = {
  SelfDeclared: { label: 'Tự khai', className: 'bg-gray-100 text-gray-600' },
  PendingVerification: { label: 'Chờ xác minh', className: 'bg-amber-100 text-amber-700' },
  Verified: { label: 'Đã xác minh', className: 'bg-emerald-100 text-emerald-700' },
  Rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700' },
  Unverified: { label: 'Chưa xác minh', className: 'bg-gray-100 text-gray-600' },
};

const emptyKyc = {
  identityFrontImageUrl: '',
  identityBackImageUrl: '',
  portraitImageUrl: '',
};

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kycSaving, setKycSaving] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [verificationModal, setVerificationModal] = useState(null);
  const [form, setForm] = useState({ bloodType: '', languages: '', interests: '', bio: '', avatarUrl: '' });
  const [kycForm, setKycForm] = useState(emptyKyc);
  const [skillForm, setSkillForm] = useState({ skillId: '', level: 'Beginner', evidenceUrl: '', verificationNote: '' });
  const [verificationForm, setVerificationForm] = useState({ evidenceUrl: '', verificationNote: '' });
  const [msg, setMsg] = useState('');

  const loadProfile = async () => {
    const res = await profileApi.getMyProfile();
    const p = res.data.profile;
    setProfile(p);
    setSkills(res.data.skills || []);

    if (p) {
      setForm({
        bloodType: p.bloodType || '',
        languages: p.languages || '',
        interests: p.interests || '',
        bio: p.bio || '',
        avatarUrl: p.avatarUrl || '',
      });
      setKycForm({
        identityFrontImageUrl: p.identityFrontImageUrl || '',
        identityBackImageUrl: p.identityBackImageUrl || '',
        portraitImageUrl: p.portraitImageUrl || '',
      });
    }
  };

  useEffect(() => {
    Promise.all([loadProfile(), skillApi.getAll().then((r) => setAllSkills(r.data || []))])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await profileApi.updateProfile(form);
      setProfile(res.data);
      window.dispatchEvent(new CustomEvent('volunteerhub:profile-updated', { detail: res.data }));
      setMsg('Đã lưu hồ sơ thành công.');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Lưu hồ sơ thất bại.');
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
        level: skillForm.level,
        evidenceUrl: skillForm.evidenceUrl,
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
      evidenceUrl: skill.evidenceUrl || '',
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
  const kycStatus = VERIFY_STATUS[profile?.kycStatus || 'Unverified'] || VERIFY_STATUS.Unverified;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Hồ sơ của tôi</h1>
        {profile?.totalVolunteerHours > 0 && (
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-full">
            <i className="fa-solid fa-clock text-primary-600 text-sm" />
            <span className="text-sm font-semibold text-primary-700">{profile.totalVolunteerHours}h tình nguyện</span>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="mb-5 max-w-xl">
          <div className="w-full">
            <AvatarUploadField
              label="Ảnh đại diện"
              value={form.avatarUrl}
              onChange={(url) => setForm({ ...form, avatarUrl: url })}
              helper="Chọn ảnh từ máy, căn khuôn mặt vào vòng tròn rồi lưu hồ sơ."
            />
          </div>
        </div>

        {msg && <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">{msg}</div>}

        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm máu</label>
              <select value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} className="input-field">
                <option value="">Không rõ</option>
                {['A', 'B', 'AB', 'O'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngôn ngữ</label>
              <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Tiếng Việt, English..." className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sở thích</label>
            <input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="Cắm trại, nhiếp ảnh, âm nhạc..." className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu bản thân</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Viết vài dòng về bạn..." className="input-field resize-none" />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <i className="fa-solid fa-floppy-disk" /> Lưu hồ sơ
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-50 via-white to-emerald-50 px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
                <i className="fa-solid fa-id-card" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Xác thực danh tính KYC</h2>
                <p className="text-sm text-gray-500 mt-1">Tùy chọn. Một số sự kiện có thể yêu cầu volunteer đã xác thực KYC mới được đăng ký.</p>
              </div>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${kycStatus.className}`}>{kycStatus.label}</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {profile?.kycAdminNote && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <i className="fa-solid fa-circle-info mt-0.5 text-amber-500" />
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

          <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              <p className="font-medium text-gray-800">Hồ sơ sẽ chuyển sang trạng thái chờ xác minh sau khi gửi.</p>
              <p className="mt-1">Bạn có thể thay ảnh và gửi lại khi cần cập nhật thông tin.</p>
            </div>
            <button onClick={submitKyc} disabled={kycSaving} className="btn-primary flex shrink-0 items-center justify-center gap-2 px-5">
              {kycSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <i className="fa-solid fa-paper-plane" /> Gửi KYC
            </button>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Kỹ năng</h2>
          <button onClick={() => setShowSkillModal(true)} className="btn-primary btn-sm flex items-center gap-1">
            <i className="fa-solid fa-plus" /> Thêm kỹ năng
          </button>
        </div>

        {skills.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Chưa có kỹ năng nào</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((vs) => {
              const verifyStatus = VERIFY_STATUS[vs.verificationStatus || 'SelfDeclared'] || VERIFY_STATUS.SelfDeclared;
              const canSubmitEvidence = ['SelfDeclared', 'Rejected'].includes(vs.verificationStatus || 'SelfDeclared');
              return (
                <div key={vs.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full group">
                  <span className="text-sm font-medium text-gray-700">{vs.skill?.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${LEVEL_COLOR[vs.level]}`}>{vs.level}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${verifyStatus.className}`}>{verifyStatus.label}</span>
                  {canSubmitEvidence && (
                    <button
                      type="button"
                      onClick={() => openSkillVerification(vs)}
                      className="ml-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                    >
                      Gửi minh chứng
                    </button>
                  )}
                  <button onClick={() => removeSkill(vs.skillId)} className="ml-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Kỹ năng</label>
            <select value={skillForm.skillId} onChange={(e) => setSkillForm({ ...skillForm, skillId: e.target.value })} className="input-field">
              <option value="">-- Chọn kỹ năng --</option>
              {availableSkills.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minh chứng kỹ năng/ngôn ngữ</label>
            <ImageUploadField
              label="Upload minh chứng"
              value={skillForm.evidenceUrl}
              onChange={(url) => setSkillForm({ ...skillForm, evidenceUrl: url })}
              helper="Có minh chứng thì kỹ năng sẽ chuyển sang trạng thái chờ xác minh; bỏ trống thì được lưu là tự khai."
              compact
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú minh chứng</label>
            <textarea rows={2} value={skillForm.verificationNote} onChange={(e) => setSkillForm({ ...skillForm, verificationNote: e.target.value })} className="input-field resize-none" placeholder="VD: TOEIC 750, chứng chỉ sơ cứu, kinh nghiệm dự án..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
            <div className="flex gap-2">
              {['Beginner', 'Intermediate', 'Expert'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSkillForm({ ...skillForm, level })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${skillForm.level === level ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

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
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Kỹ năng không có minh chứng sẽ chỉ là “Tự khai”. Upload chứng chỉ/ảnh minh chứng để chuyển sang trạng thái “Chờ xác minh”.
          </div>
          <ImageUploadField
            label="Minh chứng kỹ năng"
            value={verificationForm.evidenceUrl}
            onChange={(url) => setVerificationForm({ ...verificationForm, evidenceUrl: url })}
            helper="Ví dụ: chứng chỉ, ảnh bằng cấp, xác nhận tham gia khóa học hoặc tài liệu tương đương."
            compact
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú gửi admin</label>
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
