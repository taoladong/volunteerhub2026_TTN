import React, { useState, useEffect } from 'react';
import { profileApi, badgeApi, certificateApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

export default function VolunteerPassport() {
  const [passport, setPassport] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      profileApi.getPassport().catch(() => ({ data: null })),
      badgeApi.getMyBadges().catch(() => ({ data: [] })),
    ]).then(([passRes, badgeRes]) => {
      setPassport(passRes.data);
      setBadges(Array.isArray(badgeRes.data) ? badgeRes.data : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <h2 className="text-headline-lg font-bold text-on-surface">Hộ chiếu Tình nguyện</h2>
      <p className="text-body-lg text-on-surface-variant">Tổng hợp thành tích và đóng góp của bạn cho cộng đồng.</p>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline text-center">
          <Icon name="timer" className="text-primary mx-auto mb-2" size={28} />
          <div className="text-2xl font-extrabold text-on-surface">{passport?.totalHours || 0}</div>
          <div className="text-label-sm text-on-surface-variant">Tổng giờ</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline text-center">
          <Icon name="event" className="text-primary mx-auto mb-2" size={28} />
          <div className="text-2xl font-extrabold text-on-surface">{passport?.totalEvents || 0}</div>
          <div className="text-label-sm text-on-surface-variant">Sự kiện</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline text-center">
          <Icon name="military_tech" className="text-primary mx-auto mb-2" size={28} />
          <div className="text-2xl font-extrabold text-on-surface">{badges.length}</div>
          <div className="text-label-sm text-on-surface-variant">Huy hiệu</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline text-center">
          <Icon name="card_membership" className="text-primary mx-auto mb-2" size={28} />
          <div className="text-2xl font-extrabold text-on-surface">{passport?.totalCertificates || 0}</div>
          <div className="text-label-sm text-on-surface-variant">Chứng nhận</div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <Icon name="workspace_premium" className="text-primary" />
          Huy hiệu đạt được
        </h3>
        {badges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {badges.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center text-center p-4 rounded-2xl hover:bg-primary-container/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-primary mb-3">
                  <Icon name="star" size={32} filled />
                </div>
                <span className="text-label-sm font-bold text-on-surface">{badge.name}</span>
                <span className="text-[10px] text-on-surface-variant mt-1">{badge.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-center py-8">Chưa có huy hiệu nào. Hãy tham gia thêm sự kiện!</p>
        )}
      </div>

      {/* Activity History */}
      <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <Icon name="history" className="text-primary" />
          Lịch sử hoạt động gần đây
        </h3>
        {passport?.recentActivities?.length > 0 ? (
          <div className="space-y-4">
            {passport.recentActivities.map((activity, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-variant transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                  <Icon name="check_circle" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-on-surface">{activity.eventTitle}</p>
                  <p className="text-label-sm text-on-surface-variant">{activity.hours} giờ • {new Date(activity.date).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-center py-8">Chưa có hoạt động nào được ghi nhận.</p>
        )}
      </div>
    </div>
  );
}