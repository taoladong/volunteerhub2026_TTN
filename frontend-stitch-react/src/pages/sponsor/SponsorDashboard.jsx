import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sponsorApi, sponsorshipProposalApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

export default function SponsorDashboard() {
  const [sponsorships, setSponsorships] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sponsorApi.getMySponsorships().catch(() => ({ data: [] })),
      sponsorshipProposalApi.getMy().catch(() => ({ data: [] })),
    ]).then(([spRes, prRes]) => {
      setSponsorships(Array.isArray(spRes.data) ? spRes.data : []);
      setProposals(Array.isArray(prRes.data) ? prRes.data : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Bảng điều khiển Nhà tài trợ</h2>
        <p className="text-on-surface-variant">Quản lý tài trợ và theo dõi đóng góp của bạn.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline">
          <Icon name="handshake" className="text-primary mb-3" size={28} />
          <div className="text-2xl font-extrabold text-on-surface">{sponsorships.length}</div>
          <div className="text-label-sm text-on-surface-variant">Sự kiện đã tài trợ</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline">
          <Icon name="pending_actions" className="text-warning mb-3" size={28} />
          <div className="text-2xl font-extrabold text-on-surface">{proposals.filter(p => p.status === 'Pending').length}</div>
          <div className="text-label-sm text-on-surface-variant">Đề xuất chờ xử lý</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline">
          <Icon name="check_circle" className="text-success mb-3" size={28} />
          <div className="text-2xl font-extrabold text-on-surface">{proposals.filter(p => p.status === 'Accepted').length}</div>
          <div className="text-label-sm text-on-surface-variant">Đề xuất đã chấp nhận</div>
        </div>
      </div>

      {/* Recent Sponsorships */}
      <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-on-surface">Tài trợ gần đây</h3>
          <Link to="/tai-tro-quyen-gop" className="text-primary font-bold text-sm hover:underline">Xem tất cả</Link>
        </div>
        {sponsorships.length > 0 ? (
          <div className="space-y-4">
            {sponsorships.slice(0, 5).map(sp => (
              <div key={sp.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-variant transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                  <Icon name="event" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface truncate">{sp.eventTitle || 'Sự kiện'}</p>
                  <p className="text-label-sm text-on-surface-variant">{sp.amount?.toLocaleString('vi-VN') || 0}đ • {sp.status || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-center py-8">Chưa có tài trợ nào. Hãy khám phá sự kiện để tài trợ!</p>
        )}
      </div>
    </div>
  );
}