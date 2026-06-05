import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { badgeApi, certificateApi, profileApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, EmptyState, StatusBadge, formatDate, getErrorMessage } from '../../components/common/CommonUI';

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.certificates)) return payload.certificates;
  if (Array.isArray(payload?.badges)) return payload.badges;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const certCodeOf = (certificate) => certificate?.code || certificate?.certificateCode || certificate?.verifyCode || '';
const certEventTitleOf = (certificate) => certificate?.eventTitle || certificate?.eventName || certificate?.event?.title || 'Sự kiện';
const certHoursOf = (certificate) => certificate?.hours || certificate?.totalHours || certificate?.participationHours || 0;

export default function VolunteerPassport() {
  const [passport, setPassport] = useState(null);
  const [badges, setBadges] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      profileApi.getPassport().catch(() => ({ data: null })),
      badgeApi.getMyBadges().catch(() => ({ data: [] })),
      certificateApi.getMyCertificates().catch(() => ({ data: [] })),
    ])
      .then(([passRes, badgeRes, certRes]) => {
        setPassport(passRes.data);
        setBadges(normalizeArray(badgeRes.data));
        setCertificates(normalizeArray(certRes.data));
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Không thể tải hộ chiếu tình nguyện.'));
      })
      .finally(() => setLoading(false));
  }, []);

  const recentActivities = useMemo(() => {
    if (Array.isArray(passport?.recentActivities)) return passport.recentActivities;
    if (Array.isArray(passport?.activities)) return passport.activities;
    return [];
  }, [passport]);

  const totalHours = Number(passport?.totalHours || certificates.reduce((sum, item) => sum + Number(certHoursOf(item) || 0), 0));
  const totalEvents = Number(passport?.totalEvents || recentActivities.length || certificates.length);
  const totalCertificates = Number(passport?.totalCertificates || certificates.length);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Hộ chiếu tình nguyện</h2>
          <p className="text-body-lg text-on-surface-variant mt-2">Tổng hợp giờ tham gia, huy hiệu và chứng nhận của bạn.</p>
        </div>
        <Link to="/xac-thuc-chung-nhan" className="btn-secondary inline-flex items-center gap-2 w-fit">
          <Icon name="verified" size={20} />
          Xác thực chứng nhận
        </Link>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="timer" value={totalHours} label="Tổng giờ" />
        <StatCard icon="event" value={totalEvents} label="Sự kiện" />
        <StatCard icon="military_tech" value={badges.length} label="Huy hiệu" />
        <StatCard icon="card_membership" value={totalCertificates} label="Chứng nhận" />
      </section>

      <section className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Icon name="workspace_premium" className="text-primary" />
            Huy hiệu đạt được
          </h3>
          <span className="text-label-md font-bold text-on-surface-variant">{badges.length} huy hiệu</span>
        </div>

        {badges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {badges.map((badge) => (
              <div key={badge.id || badge.name} className="flex flex-col items-center text-center p-4 rounded-2xl hover:bg-primary-container/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-primary mb-3">
                  <Icon name={badge.icon || 'star'} size={32} filled />
                </div>
                <span className="text-label-sm font-bold text-on-surface">{badge.name || badge.title}</span>
                <span className="text-[11px] text-on-surface-variant mt-1 leading-4">{badge.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="workspace_premium" title="Chưa có huy hiệu" description="Hãy tiếp tục tham gia sự kiện để mở khóa huy hiệu đầu tiên." />
        )}
      </section>

      <section className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Icon name="card_membership" className="text-primary" />
            Chứng nhận của tôi
          </h3>
          <span className="text-label-md font-bold text-on-surface-variant">{certificates.length} chứng nhận</span>
        </div>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {certificates.map((certificate) => {
              const code = certCodeOf(certificate);
              return (
                <article key={certificate.id || code} className="rounded-3xl border border-outline bg-surface/40 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-label-sm font-bold uppercase tracking-wider text-primary">VolunteerHub Certificate</p>
                      <h4 className="text-title-md font-bold text-on-surface mt-1 break-words">{certEventTitleOf(certificate)}</h4>
                    </div>
                    <StatusBadge status={certificate.status || 'Verified'}>{certificate.status === 'Revoked' ? 'Đã thu hồi' : 'Hợp lệ'}</StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-body-sm">
                    <Info label="Mã" value={code || '—'} />
                    <Info label="Số giờ" value={`${certHoursOf(certificate)} giờ`} />
                    <Info label="Ngày cấp" value={formatDate(certificate.issuedAt || certificate.createdAt)} />
                    <Info label="Người ký" value={certificate.issuerName || certificate.organizerName || 'VolunteerHub'} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {code && (
                      <Link className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2" to={`/xac-thuc-chung-nhan?code=${encodeURIComponent(code)}`}>
                        <Icon name="verified" size={18} />
                        Xem chi tiết
                      </Link>
                    )}
                    {code && (
                      <a className="btn-primary !py-2 !px-4 inline-flex items-center gap-2" href={certificateApi.getPdfUrl(code)} target="_blank" rel="noreferrer">
                        <Icon name="download" size={18} />
                        Tải PDF
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="card_membership" title="Chưa có chứng nhận" description="Chứng nhận sẽ xuất hiện sau khi sự kiện hoàn tất và ban tổ chức ghi nhận giờ tham gia." />
        )}
      </section>

      <section className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <Icon name="history" className="text-primary" />
          Lịch sử hoạt động gần đây
        </h3>

        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={activity.id || index} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-variant transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                  <Icon name="check_circle" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface break-words">{activity.eventTitle || activity.title}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {activity.hours || activity.attendedHours || 0} giờ • {formatDate(activity.date || activity.completedAt || activity.startDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="history" title="Chưa có hoạt động" description="Các sự kiện đã hoàn thành sẽ được ghi nhận tại đây." />
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline text-center">
      <Icon name={icon} className="text-primary mx-auto mb-2" size={28} />
      <div className="text-2xl font-extrabold text-on-surface">{value || 0}</div>
      <div className="text-label-sm text-on-surface-variant">{label}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-outline px-4 py-3 min-w-0">
      <div className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">{label}</div>
      <div className="font-bold text-on-surface mt-1 break-words">{value}</div>
    </div>
  );
}
