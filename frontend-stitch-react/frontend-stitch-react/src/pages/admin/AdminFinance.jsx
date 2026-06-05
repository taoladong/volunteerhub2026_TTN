import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { formatMoney } from '../../components/common/CommonUI';

const safeNumber = (value) => Number(value || 0);

export default function AdminFinance() {
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getFinanceOverview()
      .then((res) => setFinance(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const totalDonations = safeNumber(finance?.totalDonations);
    const totalSponsorships = safeNumber(finance?.totalSponsorships);
    const pendingDonations = safeNumber(finance?.pendingDonationAmount ?? finance?.pendingDonations);
    const confirmedDonations = Math.max(totalDonations - pendingDonations, 0);
    const maxValue = Math.max(totalDonations, totalSponsorships, pendingDonations, 1);

    return [
      { label: 'Quyên góp đã xác nhận', value: confirmedDonations, color: 'bg-primary', icon: 'volunteer_activism' },
      { label: 'Tài trợ đã ghi nhận', value: totalSponsorships, color: 'bg-tertiary', icon: 'handshake' },
      { label: 'Quyên góp chờ xác nhận', value: pendingDonations, color: 'bg-warning', icon: 'pending_actions' },
    ].map((item) => ({
      ...item,
      percent: Math.max(6, Math.round((item.value / maxValue) * 100)),
    }));
  }, [finance]);

  const totalFlow = safeNumber(finance?.totalDonations) + safeNumber(finance?.totalSponsorships);
  const pendingRate = totalFlow > 0 ? Math.round((safeNumber(finance?.pendingDonationAmount ?? finance?.pendingDonations) / totalFlow) * 100) : 0;
  const completedRate = Math.max(0, 100 - pendingRate);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Giám sát tài chính</h2>
          <p className="text-on-surface-variant">Theo dõi quyên góp, tài trợ và dòng tiền trong hệ thống.</p>
        </div>
        <button onClick={() => adminApi.exportFinance('csv')} className="btn-secondary flex items-center gap-2 w-fit">
          <Icon name="download" size={20} />
          Xuất CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Tổng quyên góp" value={formatMoney(finance?.totalDonations)} icon="volunteer_activism" />
        <MetricCard label="Tổng tài trợ" value={formatMoney(finance?.totalSponsorships)} icon="handshake" />
        <MetricCard label="Chiến dịch đang mở" value={finance?.openCampaigns || 0} icon="campaign" highlight="text-primary" />
        <MetricCard label="Chờ xác nhận" value={finance?.pendingDonations || 0} icon="pending_actions" highlight="text-warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
            <div>
              <h3 className="text-xl font-bold text-on-surface">Tổng quan dòng tiền</h3>
              <p className="text-on-surface-variant text-body-sm">Biểu đồ thanh thể hiện quy mô các nguồn tiền chính.</p>
            </div>
            <div className="rounded-2xl bg-primary-container text-primary px-4 py-2 font-bold">
              Tổng: {formatMoney(totalFlow)}
            </div>
          </div>

          <div className="space-y-6">
            {chartData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-surface-variant flex items-center justify-center text-on-surface-variant">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="font-bold text-on-surface">{item.label}</span>
                  </div>
                  <span className="font-extrabold text-on-surface">{formatMoney(item.value)}</span>
                </div>
                <div className="h-4 rounded-full bg-surface-variant overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all`}
                    style={{ width: `${item.percent}%` }}
                    title={`${item.percent}%`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Insight label="Tỷ lệ đã xử lý" value={`${completedRate}%`} tone="success" />
            <Insight label="Tỷ lệ chờ xử lý" value={`${pendingRate}%`} tone="warning" />
            <Insight label="Chiến dịch mở" value={finance?.openCampaigns || 0} tone="primary" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
          <h3 className="text-xl font-bold text-on-surface mb-6">Phân bổ trạng thái</h3>
          <div className="relative w-56 h-56 mx-auto rounded-full bg-[conic-gradient(var(--tw-gradient-stops))] from-primary from-0% via-primary to-warning flex items-center justify-center">
            <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#3b82f6 0 ${completedRate}%, #f59e0b ${completedRate}% 100%)` }} />
            <div className="relative w-36 h-36 rounded-full bg-white shadow-soft flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-on-surface">{completedRate}%</span>
              <span className="text-label-sm text-on-surface-variant text-center">đã xử lý</span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Legend color="bg-primary" label="Đã xác nhận/ghi nhận" value={`${completedRate}%`} />
            <Legend color="bg-warning" label="Đang chờ xác nhận" value={`${pendingRate}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, highlight = 'text-on-surface' }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-label-sm text-on-surface-variant">{label}</div>
        <Icon name={icon} size={22} className="text-primary" />
      </div>
      <div className={`text-2xl font-extrabold ${highlight}`}>{value || 0}</div>
    </div>
  );
}

function Insight({ label, value, tone }) {
  const classes = {
    success: 'bg-success-container text-on-success-container',
    warning: 'bg-warning-container text-amber-700',
    primary: 'bg-primary-container text-primary',
  };

  return (
    <div className={`${classes[tone]} rounded-2xl p-4`}>
      <div className="text-label-sm opacity-80">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Legend({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-body-sm text-on-surface-variant">{label}</span>
      </div>
      <span className="text-label-md font-bold text-on-surface">{value}</span>
    </div>
  );
}