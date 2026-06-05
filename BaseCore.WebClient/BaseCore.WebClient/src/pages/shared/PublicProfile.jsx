import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { profileApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

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
      <i className="fa-solid fa-user-slash text-4xl text-gray-300 mb-3 block" />
      <p className="text-gray-500">{error}</p>
      <Link to="/" className="text-primary-600 hover:underline text-sm mt-3 inline-block">Quay lại</Link>
    </div>
  );

  const { profile, skills } = data || {};

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary-100" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <i className="fa-solid fa-user text-primary-500 text-2xl" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Hồ sơ tình nguyện viên</h1>
            {profile?.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
              {profile?.bloodType && <span><i className="fa-solid fa-droplet mr-1 text-red-400" />{profile.bloodType}</span>}
              {profile?.languages && <span><i className="fa-solid fa-language mr-1" />{profile.languages}</span>}
              {profile?.interests && <span><i className="fa-solid fa-heart mr-1 text-pink-400" />{profile.interests}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            {profile?.kycStatus === 'Verified' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700">
                <i className="fa-solid fa-shield-check" /> KYC Verified
              </span>
            )}
            {profile?.kycStatus === 'PendingVerification' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-200 px-2.5 py-1 text-xs font-medium text-yellow-700">
                <i className="fa-solid fa-clock" /> KYC Pending
              </span>
            )}
            {(!profile?.kycStatus || profile?.kycStatus === 'Unverified') && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500">
                <i className="fa-solid fa-user" /> Chưa KYC
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-700">{profile?.totalVolunteerHours || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Giờ tình nguyện</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-700">{skills?.length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Kỹ năng</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-700">
            {profile?.kycStatus === 'Verified' ? '✓' : '-'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Xác minh</p>
        </div>
      </div>

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Kỹ năng</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-100 px-3 py-1 text-sm text-primary-700">
                {s.skill?.name || s.skillName || `Skill #${s.skillId}`}
                {s.verificationStatus === 'Verified' && <i className="fa-solid fa-circle-check text-green-500 text-xs" />}
                {s.level && <span className="text-xs text-primary-500">· {s.level}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
