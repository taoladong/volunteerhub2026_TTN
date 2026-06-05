import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { profileApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function fmtDate(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}
function fmtMoney(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));
}

const KYC_STYLE = {
  Verified:            { color: '#15803d', bg: 'rgba(21,128,61,0.08)',  border: 'rgba(21,128,61,0.20)',  icon: 'fa-shield-check',  label: 'KYC đã xác minh' },
  PendingVerification: { color: '#b45309', bg: 'rgba(180,83,9,0.08)',   border: 'rgba(180,83,9,0.20)',   icon: 'fa-hourglass-half', label: 'KYC chờ duyệt' },
  ChangesRequested:    { color: '#b45309', bg: 'rgba(180,83,9,0.08)',   border: 'rgba(180,83,9,0.20)',   icon: 'fa-pen',            label: 'Cần bổ sung' },
  Rejected:            { color: '#b91c1c', bg: 'rgba(185,28,28,0.07)',  border: 'rgba(185,28,28,0.18)',  icon: 'fa-circle-xmark',   label: 'Bị từ chối' },
  Unverified:          { color: 'rgba(15,15,15,0.55)', bg: 'rgba(15,15,15,0.05)', border: 'rgba(15,15,15,0.12)', icon: 'fa-user', label: 'Chưa xác minh' },
};

export default function PublicProfile() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    profileApi.getUserProfile(userId)
      .then((r) => setData(r.data))
      .catch(() => setError('Không tìm thấy hồ sơ người dùng.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <i className="fa-solid fa-user-slash text-4xl mb-3 block" style={{ color: 'rgba(15,15,15,0.25)' }} />
      <p style={{ color: 'rgba(15,15,15,0.55)' }}>{error}</p>
      <Link to="/" className="text-sm mt-3 inline-block hover:underline" style={{ color: '#1b61c9' }}>Quay lại</Link>
    </div>
  );

  const { profile, skills, totalEvents, totalHours, certificates, registrations, user } = data || {};
  const kyc = KYC_STYLE[profile?.kycStatus] || KYC_STYLE.Unverified;

  const stats = [
    { label: 'Giờ tình nguyện', value: `${totalHours ?? profile?.totalVolunteerHours ?? 0}h`, icon: 'fa-clock', color: '#1b61c9' },
    { label: 'Sự kiện', value: totalEvents ?? 0, icon: 'fa-calendar-check', color: 'var(--c-ink)' },
    { label: 'Chứng chỉ', value: certificates?.length ?? 0, icon: 'fa-certificate', color: '#b45309' },
  ];
  if ((profile?.donationCount ?? 0) > 0) {
    stats.push({ label: 'Lần ủng hộ', value: profile.donationCount, icon: 'fa-hand-holding-heart', color: '#15803d' });
  }

  const displayName = user?.name || user?.userName || 'Tình nguyện viên';
  const attended = (registrations || []).filter((r) => r.isAttended);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Hero */}
      <div className="rounded-lg overflow-hidden bg-white" style={{ border: '1px solid rgba(15,15,15,0.08)' }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #4d84e8 0%, #1b61c9 100%)' }} />
        <div className="p-5">
          <div className="flex items-start gap-4">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover"
                style={{ border: '1px solid rgba(15,15,15,0.10)' }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold"
                style={{ background: '#1b61c9' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[18px] font-semibold truncate" style={{ color: 'var(--c-ink)' }}>
                {displayName}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(15,15,15,0.50)' }}>Hồ sơ tình nguyện viên</p>
              {profile?.bio && (
                <p className="text-sm mt-2" style={{ color: 'rgba(15,15,15,0.65)' }}>{profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-3 text-xs" style={{ color: 'rgba(15,15,15,0.55)' }}>
                {profile?.bloodType && <span><i className="fa-solid fa-droplet mr-1" style={{ color: '#b91c1c' }} />{profile.bloodType}</span>}
                {profile?.interests && <span><i className="fa-solid fa-heart mr-1" style={{ color: '#1b61c9' }} />{profile.interests}</span>}
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0"
              style={{ background: kyc.bg, border: `1px solid ${kyc.border}`, color: kyc.color }}
            >
              <i className={`fa-solid ${kyc.icon}`} /> {kyc.label}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="grid divide-x"
          style={{
            gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
            borderTop: '1px solid rgba(15,15,15,0.06)',
          }}
        >
          {stats.map((s) => (
            <div key={s.label} className="py-4 text-center" style={{ borderRight: '1px solid rgba(15,15,15,0.06)' }}>
              <i className={`fa-solid ${s.icon} text-[13px] mb-1.5 block`} style={{ color: s.color }} />
              <p className="text-[20px] font-bold leading-none" style={{ color: 'var(--c-ink)' }}>{s.value}</p>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(15,15,15,0.40)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="rounded-lg bg-white p-5" style={{ border: '1px solid rgba(15,15,15,0.08)' }}>
          <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--c-ink)' }}>Kỹ năng</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                style={{ background: 'rgba(27,97,201,0.06)', border: '1px solid rgba(27,97,201,0.18)', color: '#1b61c9' }}
              >
                {s.skill?.name || s.skillName || `Skill #${s.skillId}`}
                {s.verificationStatus === 'Verified' && <i className="fa-solid fa-circle-check text-xs" style={{ color: '#15803d' }} />}
                {s.level && <span className="text-xs" style={{ color: 'rgba(15,15,15,0.45)' }}>· {s.level}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certificates (nếu API trả về) */}
      {certificates && certificates.length > 0 && (
        <div className="rounded-lg bg-white p-5" style={{ border: '1px solid rgba(15,15,15,0.08)' }}>
          <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--c-ink)' }}>Chứng chỉ ({certificates.length})</h2>
          <div className="space-y-2">
            {certificates.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(15,15,15,0.03)' }}>
                <i className="fa-solid fa-certificate" style={{ color: '#b45309' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--c-ink)' }}>{c.event?.title || `Sự kiện #${c.eventId}`}</p>
                  <p className="text-xs" style={{ color: 'rgba(15,15,15,0.50)' }}>
                    {fmtDate(c.issuedAt)} · {c.volunteerHours || 0}h
                  </p>
                </div>
                {c.certificateCode && (
                  <Link to={`/verify/${c.certificateCode}`} className="text-xs font-medium hover:underline" style={{ color: '#1b61c9' }}>
                    Xác thực
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline sự kiện đã tham gia (nếu API trả về) */}
      {attended.length > 0 && (
        <div className="rounded-lg bg-white p-5" style={{ border: '1px solid rgba(15,15,15,0.08)' }}>
          <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--c-ink)' }}>Hành trình tình nguyện ({attended.length})</h2>
          <div className="space-y-3">
            {attended.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#1b61c9', boxShadow: '0 0 0 3px rgba(27,97,201,0.15)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--c-ink)' }}>{r.event?.title || `Sự kiện #${r.eventId}`}</p>
                  <p className="text-xs" style={{ color: 'rgba(15,15,15,0.50)' }}>
                    {fmtDate(r.event?.startDate)} · {r.volunteerHours || 0}h
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
