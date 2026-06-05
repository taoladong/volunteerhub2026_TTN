import React, { useState, useEffect } from 'react';
import { sponsorProfileApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

export default function SponsorProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sponsorProfileApi.get()
      .then(res => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <h2 className="text-headline-lg font-bold text-on-surface">Hồ sơ Nhà tài trợ</h2>

      <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center overflow-hidden">
            {profile?.logo ? (
              <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Icon name="business" className="text-primary" size={40} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-on-surface">{profile?.companyName || user?.fullName || 'Chưa cập nhật'}</h3>
            <p className="text-on-surface-variant">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-outline">
          <h4 className="text-label-md font-bold text-on-surface mb-4 flex items-center gap-2">
            <Icon name="business" className="text-primary" size={20} />
            Thông tin tổ chức
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Tên công ty</span>
              <span className="text-on-surface font-medium text-sm">{profile?.companyName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Lĩnh vực</span>
              <span className="text-on-surface font-medium text-sm">{profile?.industry || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Website</span>
              <span className="text-on-surface font-medium text-sm">{profile?.website || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Liên hệ</span>
              <span className="text-on-surface font-medium text-sm">{profile?.contactPhone || '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-soft border border-outline">
          <h4 className="text-label-md font-bold text-on-surface mb-4 flex items-center gap-2">
            <Icon name="description" className="text-primary" size={20} />
            Mô tả
          </h4>
          <p className="text-on-surface-variant leading-relaxed text-sm">
            {profile?.description || 'Chưa có mô tả. Hãy cập nhật hồ sơ nhà tài trợ để các nhà tổ chức hiểu thêm về bạn.'}
          </p>
        </div>
      </div>
    </div>
  );
}