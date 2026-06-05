import React, { useState, useEffect } from 'react';
import { sponsorshipProposalApi, supportCampaignApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN');
};

function FinancialReportModal({ report, onClose }) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-soft border border-outline w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-outline px-6 py-4 rounded-t-3xl flex items-center justify-between gap-4">
          <div>
            <h3 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="fact_check" className="text-primary" size={24} />
              Báo cáo tài chính
            </h3>
            <p className="text-body-sm text-on-surface-variant">{report.title}</p>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl bg-success-container text-on-success-container p-4 flex items-start gap-3">
            <Icon name="verified" size={24} />
            <div>
              <p className="font-bold">Báo cáo tài chính dành cho nhà tài trợ/nhà quyên góp</p>
              <p className="text-body-sm">Thông tin sử dụng kinh phí đã được ban tổ chức công bố để đảm bảo minh bạch.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-outline bg-surface-variant/20 p-4">
              <p className="text-label-sm text-on-surface-variant font-bold">Số tiền đóng góp</p>
              <p className="text-title-md font-extrabold text-primary">{formatMoney(report.amount)}</p>
            </div>
            <div className="rounded-2xl border border-outline bg-surface-variant/20 p-4">
              <p className="text-label-sm text-on-surface-variant font-bold">Đã sử dụng</p>
              <p className="text-title-md font-extrabold text-primary">{formatMoney(report.usedAmount)}</p>
            </div>
            <div className="rounded-2xl border border-outline bg-surface-variant/20 p-4">
              <p className="text-label-sm text-on-surface-variant font-bold">Công bố lúc</p>
              <p className="text-body-md font-bold text-on-surface">{formatDateTime(report.reportedAt)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-outline p-4">
            <p className="font-bold text-on-surface mb-2">Tóm tắt báo cáo</p>
            <p className="text-on-surface-variant whitespace-pre-line">{report.summary || 'Chưa có tóm tắt.'}</p>
          </div>

          <div className="rounded-2xl border border-outline p-4">
            <p className="font-bold text-on-surface mb-2">Chi tiết chi phí</p>
            <p className="text-on-surface-variant whitespace-pre-line">{report.expenseDetails || 'Chưa có chi tiết chi phí.'}</p>
          </div>

          <div className="rounded-2xl border border-outline p-4">
            <p className="font-bold text-on-surface mb-2">Tệp chứng từ</p>
            {report.attachmentUrl ? (
              <a className="btn-primary inline-flex items-center gap-2" href={report.attachmentUrl} target="_blank" rel="noreferrer">
                <Icon name="download" size={18} />
                Tải / xem chứng từ
              </a>
            ) : (
              <p className="text-on-surface-variant">Ban tổ chức chưa đính kèm tệp chứng từ.</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-outline px-6 py-4 rounded-b-3xl flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

export default function SponsorshipDonation() {
  const [proposals, setProposals] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proposals');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    Promise.all([
      sponsorshipProposalApi.getMy().catch(() => ({ data: [] })),
      supportCampaignApi.getMyDonations().catch(() => ({ data: [] })),
    ]).then(([prRes, dnRes]) => {
      setProposals(Array.isArray(prRes.data) ? prRes.data : []);
      setDonations(Array.isArray(dnRes.data) ? dnRes.data : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const tabs = [
    { key: 'proposals', label: `Đề xuất tài trợ (${proposals.length})` },
    { key: 'donations', label: `Quyên góp (${donations.length})` },
  ];

  const openProposalReport = (proposal) => {
    setSelectedReport({
      title: proposal.title || proposal.eventTitle || 'Đề xuất tài trợ',
      amount: proposal.actualReceivedAmount || proposal.amount,
      usedAmount: proposal.usedAmount,
      summary: proposal.reportSummary,
      expenseDetails: proposal.expenseDetails,
      attachmentUrl: proposal.reportAttachmentUrl,
      reportedAt: proposal.reportedAt,
    });
  };

  const openDonationReport = (donation) => {
    setSelectedReport({
      title: donation.campaignTitle || 'Chiến dịch quyên góp',
      amount: donation.amount,
      usedAmount: donation.campaignUsedAmount,
      summary: donation.campaignReportSummary,
      expenseDetails: donation.campaignExpenseDetails,
      attachmentUrl: donation.campaignReportAttachmentUrl,
      reportedAt: donation.campaignReportedAt,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Tài trợ & Quyên góp</h2>
        <p className="text-on-surface-variant">Quản lý đề xuất tài trợ, lịch sử quyên góp và báo cáo sử dụng kinh phí.</p>
      </div>

      <div className="flex items-center gap-8 border-b border-outline">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 px-1 font-label text-label-md whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'proposals' && (
        proposals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-outline">
            <Icon name="handshake" size={48} className="text-outline mx-auto mb-4" />
            <p className="text-on-surface-variant">Chưa có đề xuất tài trợ nào.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map(p => {
              const canViewReport = p.status === 'Reported';
              return (
                <div key={p.id} className="bg-white rounded-2xl p-6 shadow-soft border border-outline flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                    <Icon name="description" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface">{p.eventTitle || 'Sự kiện'}</p>
                    <p className="text-label-sm text-on-surface-variant">{formatMoney(p.amount)} • {p.type === 'SponsorOffer' ? 'Bạn đề nghị' : 'Được mời'}</p>
                    {canViewReport && (
                      <p className="text-label-sm text-primary font-bold mt-1">Đã có báo cáo sử dụng tài trợ.</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${
                    p.status === 'Accepted' || p.status === 'Received' || p.status === 'Reported' ? 'bg-success-container text-on-success-container' :
                    p.status === 'Pending' ? 'bg-warning-container text-amber-700' :
                    'bg-error-container text-error'
                  }`}>
                    {p.status === 'Accepted'
                      ? 'Đã chấp nhận'
                      : p.status === 'Received'
                        ? 'Đã nhận tài trợ'
                        : p.status === 'Reported'
                          ? 'Đã báo cáo'
                          : p.status === 'Pending' ? 'Chờ xử lý' : p.status === 'Rejected' ? 'Bị từ chối' : p.status}
                  </span>
                  {canViewReport && (
                    <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => openProposalReport(p)}>
                      <Icon name="fact_check" size={18} />
                      Xem báo cáo
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {activeTab === 'donations' && (
        donations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-outline">
            <Icon name="volunteer_activism" size={48} className="text-outline mx-auto mb-4" />
            <p className="text-on-surface-variant">Chưa có quyên góp nào.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {donations.map(d => {
              const canViewReport = d.status === 'Confirmed' && d.campaignStatus === 'Reported';
              return (
                <div key={d.id} className="bg-white rounded-2xl p-6 shadow-soft border border-outline flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                    <Icon name="payments" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface">{d.campaignTitle || 'Chiến dịch'}</p>
                    <p className="text-label-sm text-on-surface-variant">{formatMoney(d.amount)} • {d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : ''}</p>
                    {canViewReport && (
                      <p className="text-label-sm text-primary font-bold mt-1">Đã có báo cáo tài chính chiến dịch.</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${
                    d.status === 'Confirmed' ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-amber-700'
                  }`}>
                    {d.status === 'Confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                  </span>
                  {canViewReport && (
                    <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => openDonationReport(d)}>
                      <Icon name="fact_check" size={18} />
                      Xem báo cáo
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      <FinancialReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}