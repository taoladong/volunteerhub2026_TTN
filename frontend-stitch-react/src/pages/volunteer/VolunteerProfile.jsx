import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { profileApi, profileSkillApi, skillApi, uploadApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, getErrorMessage, unwrap } from '../../components/common/CommonUI';

const BLOOD_TYPES = ['', 'A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SKILL_LEVELS = [
  { value: 'Beginner', label: 'Cơ bản' },
  { value: 'Intermediate', label: 'Khá' },
  { value: 'Expert', label: 'Chuyên gia' },
];

const INITIAL_FORM = {
  bloodType: '',
  languages: '',
  interests: '',
  bio: '',
  avatarUrl: '',
  identityFrontImageUrl: '',
  identityBackImageUrl: '',
  portraitImageUrl: '',
  confirmReverify: false,
};

const INITIAL_SKILL_FORM = {
  skillId: '',
  level: 'Beginner',
  evidenceUrl: '',
  verificationNote: '',
};

const INITIAL_VERIFICATION_FORM = {
  evidenceUrl: '',
  verificationNote: '',
};

const KYC_STATUS = {
  Verified: {
    label: 'Đã xác minh',
    icon: 'verified',
    className: 'bg-success-container text-on-success-container',
    description: 'Tài khoản của bạn đã được xác minh danh tính.',
  },
  PendingVerification: {
    label: 'Đang chờ duyệt',
    icon: 'hourglass_top',
    className: 'bg-warning-container text-amber-700',
    description: 'Hồ sơ xác minh đã được gửi và đang chờ quản trị viên xét duyệt.',
  },
  Rejected: {
    label: 'Bị từ chối',
    icon: 'cancel',
    className: 'bg-error-container text-error',
    description: 'Hồ sơ xác minh chưa đạt yêu cầu. Vui lòng kiểm tra ghi chú và gửi lại.',
  },
  Unverified: {
    label: 'Chưa xác minh',
    icon: 'pending',
    className: 'bg-warning-container text-amber-700',
    description: 'Xác minh tài khoản giúp bạn đăng ký các sự kiện yêu cầu KYC.',
  },
};

const SKILL_STATUS = {
  Verified: {
    label: 'Đã xác minh',
    className: 'bg-success-container text-on-success-container',
  },
  PendingVerification: {
    label: 'Chờ duyệt',
    className: 'bg-warning-container text-amber-700',
  },
  Rejected: {
    label: 'Bị từ chối',
    className: 'bg-error-container text-error',
  },
  SelfDeclared: {
    label: 'Tự khai báo',
    className: 'bg-surface-variant text-on-surface-variant',
  },
};

const normalizeProfileResponse = (data) => {
  if (data?.profile || data?.skills) {
    return {
      profile: data.profile || {},
      skills: Array.isArray(data.skills) ? data.skills : [],
    };
  }
  return {
    profile: data || {},
    skills: Array.isArray(data?.skills) ? data.skills : [],
  };
};

const skillName = (item) => item?.skill?.name || item?.name || item?.skillName || `Kỹ năng #${item?.skillId || item?.id || ''}`;
const skillIdOf = (item) => item?.skillId || item?.skill?.id || item?.id;
const extractUploadUrl = (data) => data?.url || data?.fileUrl || data?.path || data?.imageUrl || data?.data?.url || data?.data?.path || '';

export default function VolunteerProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileSkills, setProfileSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [skillForm, setSkillForm] = useState(INITIAL_SKILL_FORM);
  const [verificationModal, setVerificationModal] = useState(null);
  const [verificationForm, setVerificationForm] = useState(INITIAL_VERIFICATION_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillSaving, setSkillSaving] = useState(false);
  const [kycSaving, setKycSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const syncForm = useCallback((nextProfile, nextSkills = []) => {
    setForm({
      bloodType: nextProfile?.bloodType || '',
      languages: nextProfile?.languages || '',
      interests: nextProfile?.interests || '',
      bio: nextProfile?.bio || '',
      avatarUrl: nextProfile?.avatarUrl || '',
      identityFrontImageUrl: nextProfile?.identityFrontImageUrl || '',
      identityBackImageUrl: nextProfile?.identityBackImageUrl || '',
      portraitImageUrl: nextProfile?.portraitImageUrl || '',
      confirmReverify: false,
    });
    setProfileSkills(nextSkills);
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await profileApi.getMyProfile();
    const normalized = normalizeProfileResponse(res.data);
    setProfile(normalized.profile);
    syncForm(normalized.profile, normalized.skills);
  }, [syncForm]);

  useEffect(() => {
    Promise.all([
      loadProfile().catch(() => {}),
      skillApi.getAll().then((res) => setAllSkills(unwrap(res, []))).catch(() => setAllSkills([])),
    ]).finally(() => setLoading(false));
  }, [loadProfile]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updateSkillForm = (patch) => setSkillForm((prev) => ({ ...prev, ...patch }));
  const updateVerificationForm = (patch) => setVerificationForm((prev) => ({ ...prev, ...patch }));

  const availableSkills = useMemo(() => {
    const usedIds = new Set(profileSkills.map((item) => String(skillIdOf(item))).filter(Boolean));
    return allSkills.filter((item) => !usedIds.has(String(item.id)));
  }, [allSkills, profileSkills]);

  const validate = () => {
    if (form.bio.trim().length > 1000) return 'Bio không được vượt quá 1000 ký tự.';
    if (form.languages.trim().length > 300) return 'Ngôn ngữ không được vượt quá 300 ký tự.';
    if (form.interests.trim().length > 300) return 'Sở thích/lĩnh vực quan tâm không được vượt quá 300 ký tự.';
    if (skillForm.verificationNote.trim().length > 500) return 'Ghi chú minh chứng kỹ năng không được vượt quá 500 ký tự.';
    if (verificationForm.verificationNote.trim().length > 500) return 'Mô tả minh chứng gửi admin không được vượt quá 500 ký tự.';
    return '';
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        bloodType: form.bloodType || '',
        languages: form.languages.trim(),
        interests: form.interests.trim(),
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl || '',
      };
      const res = await profileApi.updateProfile(payload);
      const updated = { ...profile, ...res.data, ...payload };
      setProfile(updated);
      syncForm(updated, profileSkills);
      updateUser({
        avatar: updated.avatarUrl,
        avatarUrl: updated.avatarUrl,
      });
      setNotice('Đã cập nhật hồ sơ thành công.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể cập nhật hồ sơ.'));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (file) => {
    if (!file) return;
    setUploadingField('avatarUrl');
    setError('');
    setNotice('');
    try {
      const res = await uploadApi.uploadImage(file);
      const url = extractUploadUrl(res.data);
      if (!url) throw new Error('Không nhận được đường dẫn ảnh đại diện.');
      updateForm({ avatarUrl: url });
      setNotice('Đã upload ảnh đại diện. Nhấn "Lưu thông tin cơ bản" để lưu thay đổi.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể upload ảnh đại diện.'));
    } finally {
      setUploadingField('');
    }
  };

  const handleSkillEvidenceUpload = async (file, mode = 'add') => {
    if (!file) return;
    setUploadingField(mode === 'verification' ? 'skillVerificationEvidence' : 'skillEvidence');
    setError('');
    setNotice('');
    try {
      const res = await uploadApi.uploadFile(file);
      const url = extractUploadUrl(res.data);
      if (!url) throw new Error('Không nhận được đường dẫn minh chứng kỹ năng.');
      if (mode === 'verification') {
        updateVerificationForm({ evidenceUrl: url });
        setNotice('Đã upload minh chứng kỹ năng. Bạn có thể gửi admin xác minh.');
      } else {
        updateSkillForm({ evidenceUrl: url });
        setNotice('Đã upload minh chứng kỹ năng cho kỹ năng mới.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể upload minh chứng kỹ năng.'));
    } finally {
      setUploadingField('');
    }
  };

  const handleAddSkill = async () => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    if (!skillForm.skillId) {
      setError('Vui lòng chọn kỹ năng cần thêm.');
      return;
    }
    if (!skillForm.evidenceUrl) {
      setError('Vui lòng upload ảnh hoặc tệp minh chứng kỹ năng để admin xác minh.');
      return;
    }

    setSkillSaving(true);
    setError('');
    setNotice('');
    try {
      await profileSkillApi.add({
        skillId: Number(skillForm.skillId),
        level: skillForm.level,
        evidenceUrl: skillForm.evidenceUrl,
        verificationNote: skillForm.verificationNote.trim(),
      });
      await loadProfile();
      setSkillForm(INITIAL_SKILL_FORM);
      setNotice('Đã thêm kỹ năng và gửi minh chứng cho admin xác minh.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể thêm kỹ năng.'));
    } finally {
      setSkillSaving(false);
    }
  };

  const handleRemoveSkill = async (skillId) => {
    setSkillSaving(true);
    setError('');
    setNotice('');
    try {
      await profileSkillApi.remove(skillId);
      setProfileSkills((prev) => prev.filter((item) => String(skillIdOf(item)) !== String(skillId)));
      setNotice('Đã xóa kỹ năng khỏi hồ sơ.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể xóa kỹ năng.'));
    } finally {
      setSkillSaving(false);
    }
  };

  const openSkillVerification = (skill) => {
    setVerificationModal(skill);
    setVerificationForm({
      evidenceUrl: skill?.evidenceUrl || '',
      verificationNote: skill?.verificationNote || '',
    });
  };

  const closeSkillVerification = () => {
    setVerificationModal(null);
    setVerificationForm(INITIAL_VERIFICATION_FORM);
  };

  const handleSubmitSkillVerification = async () => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    if (!verificationModal) return;
    if (!verificationForm.evidenceUrl) {
      setError('Vui lòng upload minh chứng kỹ năng trước khi gửi admin duyệt.');
      return;
    }

    setSkillSaving(true);
    setError('');
    setNotice('');
    try {
      await profileSkillApi.submitVerification(skillIdOf(verificationModal), {
        evidenceUrl: verificationForm.evidenceUrl,
        verificationNote: verificationForm.verificationNote.trim(),
      });
      await loadProfile();
      closeSkillVerification();
      setNotice('Đã gửi minh chứng kỹ năng cho admin xét duyệt.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi minh chứng kỹ năng.'));
    } finally {
      setSkillSaving(false);
    }
  };

  const handleKycFileUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    setError('');
    setNotice('');
    try {
      const res = await uploadApi.uploadImage(file);
      const url = extractUploadUrl(res.data);
      if (!url) throw new Error('Không nhận được đường dẫn file sau khi upload.');
      updateForm({ [field]: url });
      setNotice('Upload ảnh thành công. Vui lòng kiểm tra đủ 3 ảnh rồi gửi xác minh.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể upload ảnh xác minh.'));
    } finally {
      setUploadingField('');
    }
  };

  const handleSubmitKyc = async (event) => {
    event.preventDefault();
    if (!form.identityFrontImageUrl || !form.identityBackImageUrl || !form.portraitImageUrl) {
      setError('Vui lòng upload đủ mặt trước CCCD, mặt sau CCCD và ảnh chân dung.');
      return;
    }

    setKycSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await profileApi.submitKyc({
        identityFrontImageUrl: form.identityFrontImageUrl,
        identityBackImageUrl: form.identityBackImageUrl,
        portraitImageUrl: form.portraitImageUrl,
        confirmReverify: form.confirmReverify,
      });
      const updated = { ...profile, ...res.data };
      setProfile(updated);
      syncForm(updated, profileSkills);
      setNotice('Đã gửi hồ sơ xác minh tài khoản. Vui lòng chờ quản trị viên xét duyệt.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi hồ sơ xác minh.'));
    } finally {
      setKycSaving(false);
    }
  };

  if (loading) return <Loading />;

  const displayProfile = profile || {};
  const displaySkills = profileSkills.length > 0 ? profileSkills : (Array.isArray(displayProfile.skills) ? displayProfile.skills : []);
  const rawKycStatus = displayProfile.isKycVerified || displayProfile.kycStatus === 'Verified' ? 'Verified' : (displayProfile.kycStatus || 'Unverified');
  const kycStatus = KYC_STATUS[rawKycStatus] || KYC_STATUS.Unverified;
  const canSubmitKyc = rawKycStatus !== 'PendingVerification';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Hồ sơ cá nhân</h2>
          <p className="text-on-surface-variant">Cập nhật thông tin cơ bản, giới thiệu bản thân, kỹ năng và xác minh tài khoản.</p>
        </div>
      </div>

      {notice && <Alert type="success">{notice}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-3xl bg-primary-container flex items-center justify-center overflow-hidden">
            {form.avatarUrl || displayProfile.avatar || displayProfile.avatarUrl ? (
              <img src={form.avatarUrl || displayProfile.avatar || displayProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Icon name="person" className="text-primary" size={48} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-on-surface">{user?.fullName || user?.name || displayProfile.fullName || 'Chưa cập nhật'}</h3>
            <p className="text-on-surface-variant">{user?.email || user?.userName}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`${kycStatus.className} px-3 py-1 rounded-full text-label-sm font-bold flex items-center gap-1`}>
                <Icon name={kycStatus.icon} size={14} /> {kycStatus.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-8 shadow-soft border border-outline space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="edit" className="text-primary" size={22} />
              Thông tin cơ bản & giới thiệu
            </h3>
            <p className="text-on-surface-variant mt-1">Bổ sung thông tin hồ sơ để nhà tổ chức hiểu rõ hơn về bạn.</p>
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving || !!uploadingField}>
            {saving && <Icon name="progress_activity" size={18} className="animate-spin" />}
            Lưu thông tin cơ bản
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-4 rounded-3xl border border-outline bg-surface/40 p-5">
            <div>
              <label className="text-label-sm font-medium text-on-surface-variant mb-2 block">Ảnh đại diện</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-on-surface-variant file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-on-primary file:font-bold"
                  onChange={(e) => handleUploadAvatar(e.target.files?.[0])}
                  disabled={!!uploadingField}
                />
                {uploadingField === 'avatarUrl' ? (
                  <span className="text-primary font-medium flex items-center gap-2 text-sm">
                    <Icon name="progress_activity" size={16} className="animate-spin" />
                    Đang upload ảnh đại diện...
                  </span>
                ) : form.avatarUrl ? (
                  <a href={form.avatarUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline break-all text-sm">
                    Đã upload ảnh đại diện - xem ảnh
                  </a>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <InfoField label="Họ tên" value={user?.fullName || user?.name || displayProfile.fullName || '—'} />
              <InfoField label="Email" value={user?.email || user?.userName || '—'} />
              <InfoField label="Vai trò" value={user?.role || user?.userType || 'Tình nguyện viên'} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Nhóm máu</span>
              <select className="input-field" value={form.bloodType} onChange={(e) => updateForm({ bloodType: e.target.value })}>
                {BLOOD_TYPES.map((type) => (
                  <option key={type || 'empty'} value={type}>{type || 'Chưa chọn'}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Ngôn ngữ</span>
              <input className="input-field" value={form.languages} onChange={(e) => updateForm({ languages: e.target.value })} placeholder="Tiếng Việt, Tiếng Anh..." />
            </label>

            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Lĩnh vực quan tâm</span>
              <input className="input-field" value={form.interests} onChange={(e) => updateForm({ interests: e.target.value })} placeholder="Môi trường, Giáo dục, Y tế..." />
            </label>

            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Giới thiệu bản thân</span>
              <textarea className="input-field min-h-40" value={form.bio} onChange={(e) => updateForm({ bio: e.target.value })} placeholder="Giới thiệu ngắn về kinh nghiệm, định hướng và thế mạnh của bạn..." />
            </label>
          </div>
        </div>
      </form>

      <section className="bg-white rounded-3xl p-8 shadow-soft border border-outline space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h3 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="psychology" className="text-primary" size={22} />
              Kỹ năng & minh chứng
            </h3>
            <p className="text-on-surface-variant mt-2">Thêm kỹ năng và upload ảnh/tệp minh chứng.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <label>
            <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Kỹ năng</span>
            <select className="input-field" value={skillForm.skillId} onChange={(e) => updateSkillForm({ skillId: e.target.value })}>
              <option value="">Chọn kỹ năng</option>
              {availableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Mức độ</span>
            <select className="input-field" value={skillForm.level} onChange={(e) => updateSkillForm({ level: e.target.value })}>
              {SKILL_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </label>

          <div className="xl:col-span-2">
            <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Ảnh/tệp minh chứng kỹ năng</span>
            <div className="border border-outline rounded-2xl p-4 bg-surface-variant/40 space-y-3">
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="block w-full text-sm text-on-surface-variant file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-on-primary file:font-bold"
                onChange={(e) => handleSkillEvidenceUpload(e.target.files?.[0], 'add')}
                disabled={!!uploadingField}
              />
              {uploadingField === 'skillEvidence' ? (
                <span className="text-primary font-medium flex items-center gap-2 text-sm">
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Đang upload minh chứng...
                </span>
              ) : skillForm.evidenceUrl ? (
                <a href={skillForm.evidenceUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline break-all text-sm">
                  Đã upload minh chứng - xem tệp
                </a>
              ) : null}
            </div>
          </div>

          <label className="md:col-span-2 xl:col-span-3">
            <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Ghi chú minh chứng</span>
            <input
              className="input-field"
              value={skillForm.verificationNote}
              onChange={(e) => updateSkillForm({ verificationNote: e.target.value })}
              placeholder="Ví dụ: ảnh chứng chỉ, ảnh tham gia hoạt động, portfolio..."
            />
          </label>

          <div className="flex items-end">
            <button type="button" className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleAddSkill} disabled={skillSaving || !!uploadingField}>
              {skillSaving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="add" size={18} />}
              Thêm kỹ năng
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {displaySkills.length > 0 ? displaySkills.map((item, index) => {
            const id = skillIdOf(item);
            const status = SKILL_STATUS[item?.verificationStatus] || SKILL_STATUS.SelfDeclared;
            return (
              <div key={`${id || index}`} className="rounded-2xl border border-outline p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-on-surface font-bold">{skillName(item)}</span>
                    {item?.level && <span className="bg-primary-container text-primary px-2.5 py-1 rounded-full text-xs font-bold">{item.level}</span>}
                    <span className={`${status.className} px-2.5 py-1 rounded-full text-xs font-bold`}>{status.label}</span>
                  </div>
                  {item?.verificationNote ? (
                    <p className="text-sm text-on-surface-variant">Ghi chú: {item.verificationNote}</p>
                  ) : null}
                  {item?.evidenceUrl ? (
                    <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary font-bold hover:underline break-all">
                      Xem minh chứng đã tải lên
                    </a>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Chưa có minh chứng đính kèm</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => openSkillVerification(item)} disabled={skillSaving || !!uploadingField}>
                    {item?.verificationStatus === 'PendingVerification' ? 'Cập nhật minh chứng' : 'Gửi admin xác minh'}
                  </button>
                  {id ? (
                    <button type="button" className="btn-secondary text-error border-error/30" onClick={() => handleRemoveSkill(id)} disabled={skillSaving}>
                      Xóa kỹ năng
                    </button>
                  ) : null}
                </div>
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-outline p-6 text-on-surface-variant text-sm">
              Chưa có kỹ năng nào. Hãy thêm kỹ năng và upload minh chứng để admin xác minh.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-3xl p-8 shadow-soft border border-outline space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h3 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="badge" className="text-primary" size={22} />
              Xác minh tài khoản
            </h3>
            <p className="text-on-surface-variant mt-2">{kycStatus.description}</p>
            {displayProfile.kycAdminNote && (
              <p className="text-error text-body-sm mt-2 font-medium">Ghi chú quản trị viên: {displayProfile.kycAdminNote}</p>
            )}
          </div>
          <span className={`${kycStatus.className} px-4 py-2 rounded-2xl text-label-md font-bold flex items-center gap-2 w-fit`}>
            <Icon name={kycStatus.icon} size={18} />
            {kycStatus.label}
          </span>
        </div>

        {canSubmitKyc ? (
          <form onSubmit={handleSubmitKyc} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KycUploadField
                label="Mặt trước CCCD/CMND"
                field="identityFrontImageUrl"
                value={form.identityFrontImageUrl}
                uploadingField={uploadingField}
                onUpload={handleKycFileUpload}
              />
              <KycUploadField
                label="Mặt sau CCCD/CMND"
                field="identityBackImageUrl"
                value={form.identityBackImageUrl}
                uploadingField={uploadingField}
                onUpload={handleKycFileUpload}
              />
              <KycUploadField
                label="Ảnh chân dung"
                field="portraitImageUrl"
                value={form.portraitImageUrl}
                uploadingField={uploadingField}
                onUpload={handleKycFileUpload}
              />
            </div>

            {rawKycStatus === 'Verified' && (
              <label className="flex items-start gap-3 text-body-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.confirmReverify}
                  onChange={(e) => updateForm({ confirmReverify: e.target.checked })}
                />
                <span>Tôi xác nhận muốn gửi lại hồ sơ và thay thế ảnh xác minh hiện tại.</span>
              </label>
            )}

            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={kycSaving || !!uploadingField || (rawKycStatus === 'Verified' && !form.confirmReverify)}
            >
              {kycSaving ? <Icon name="progress_activity" size={20} className="animate-spin" /> : <Icon name="upload" size={20} />}
              {rawKycStatus === 'Verified' ? 'Gửi xác minh lại' : 'Gửi hồ sơ xác minh'}
            </button>
          </form>
        ) : (
          <div className="bg-warning-container text-amber-800 rounded-2xl p-4 text-body-sm">
            Hồ sơ xác minh của bạn đang được xét duyệt. Bạn sẽ nhận được thông báo sau khi quản trị viên xử lý.
          </div>
        )}
      </section>

      {verificationModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface">Xác minh kỹ năng</h3>
                <p className="text-on-surface-variant mt-1">{skillName(verificationModal)}</p>
              </div>
              <button type="button" className="text-on-surface-variant hover:text-on-surface" onClick={closeSkillVerification}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Upload ảnh/tệp minh chứng</span>
                <div className="border border-outline rounded-2xl p-4 bg-surface-variant/40 space-y-3">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="block w-full text-sm text-on-surface-variant file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-on-primary file:font-bold"
                    onChange={(e) => handleSkillEvidenceUpload(e.target.files?.[0], 'verification')}
                    disabled={!!uploadingField}
                  />
                  {uploadingField === 'skillVerificationEvidence' ? (
                    <span className="text-primary font-medium flex items-center gap-2 text-sm">
                      <Icon name="progress_activity" size={16} className="animate-spin" />
                      Đang upload minh chứng...
                    </span>
                  ) : verificationForm.evidenceUrl ? (
                    <a href={verificationForm.evidenceUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline break-all text-sm">
                      Đã upload minh chứng - xem tệp
                    </a>
                  ) : null}
                </div>
              </div>

              <label>
                <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Mô tả minh chứng</span>
                <textarea
                  className="input-field min-h-32"
                  placeholder="Mô tả ngắn về kinh nghiệm, chứng chỉ hoặc bối cảnh của minh chứng"
                  value={verificationForm.verificationNote}
                  onChange={(e) => updateVerificationForm({ verificationNote: e.target.value })}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeSkillVerification}>
                Hủy
              </button>
              <button type="button" className="btn-primary flex items-center gap-2" onClick={handleSubmitSkillVerification} disabled={skillSaving || !!uploadingField}>
                {skillSaving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="upload" size={18} />}
                Gửi admin duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KycUploadField({ label, field, value, uploadingField, onUpload }) {
  const isUploading = uploadingField === field;
  return (
    <label className="block">
      <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">{label}</span>
      <div className="border border-outline rounded-2xl p-4 bg-surface-variant/40 space-y-3">
        <input
          type="file"
          accept="image/*"
          className="block w-full text-sm text-on-surface-variant file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-on-primary file:font-bold"
          onChange={(e) => onUpload(field, e.target.files?.[0])}
          disabled={!!uploadingField}
        />
        <div className="min-h-10 text-body-sm">
          {isUploading ? (
            <span className="text-primary font-medium flex items-center gap-2">
              <Icon name="progress_activity" size={16} className="animate-spin" />
              Đang upload...
            </span>
          ) : value ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline break-all">
              Đã upload - xem ảnh
            </a>
          ) : null}
        </div>
      </div>
    </label>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="rounded-2xl border border-outline bg-white px-4 py-3">
      <span className="text-on-surface-variant text-xs uppercase tracking-wide">{label}</span>
      <div className="text-on-surface font-medium mt-1 break-words">{value || '—'}</div>
    </div>
  );
}
