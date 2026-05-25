import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supportCampaignApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, EmptyState, getErrorMessage } from '../../components/common/CommonUI';

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN');
};

function FinancialReportModal({ donation, onClose }) {
  if (!donation) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-soft border border-outline w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-outline px-6 py-4 rounded-t-3xl flex items-center justify-between gap-4">
          <div>
            <h3 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="fact_check" className="text-primary" size={24} />
              Báo cáo tài chính
            </h3>
            <p className="text-body-sm text-on-surface-variant">{donation.campaignTitle || 'Chiến dịch quyên góp'}</p>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl bg-success-container text-on-success-container p-4 flex items-start gap-3">
            <Icon name="verified" size={24} />
            <div>
              <p className="font-bold">Báo cáo tài chính dành cho nhà quyên góp</p>
              <p className="text-body-sm">
                Khoản quyên góp của bạn đã được xác nhận, vì vậy bạn có thể xem báo cáo sử dụng kinh phí do ban tổ chức công bố.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-outline bg-surface-variant/20 p-4">
              <p className="text-label-sm text-on-surface-variant font-bold">Bạn đã quyên góp</p>
              <p className="text-title-md font-extrabold text-primary">{formatMoney(donation.amount)}</p>
            </div>
            <div className="rounded-2xl border border-outline bg-surface-variant/20 p-4">
              <p className="text-label-sm text-on-surface-variant font-bold">Đã sử dụng</p>
              <p className="text-title-md font-extrabold text-primary">{formatMoney(donation.campaignUsedAmount)}</p>
            </div>
            <div className="rounded-2xl border border-outline bg-surface-variant/20 p-4">
              <p className="text-label-sm text-on-surface-variant font-bold">Công bố lúc</p>
              <p className="text-body-md font-bold text-on-surface">{formatDateTime(donation.campaignReportedAt)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-outline p-4">
            <p className="font-bold text-on-surface mb-2">Tóm tắt báo cáo</p>
            <p className="text-on-surface-variant whitespace-pre-line">{donation.campaignReportSummary || 'Chưa có tóm tắt.'}</p>
          </div>

          <div className="rounded-2xl border border-outline p-4">
            <p className="font-bold text-on-surface mb-2">Chi tiết chi phí</p>
            <p className="text-on-surface-variant whitespace-pre-line">{donation.campaignExpenseDetails || 'Chưa có chi tiết chi phí.'}</p>
          </div>

          <div className="rounded-2xl border border-outline p-4">
            <p className="font-bold text-on-surface mb-2">Tệp chứng từ</p>
            {donation.campaignReportAttachmentUrl ? (
              <a
                className="btn-primary inline-flex items-center gap-2"
                href={donation.campaignReportAttachmentUrl}
                target="_blank"
                rel="noreferrer"
              >
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

export default function MyDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supportCampaignApi.getMyDonations();
      setDonations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách quyên góp.'));
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => ({
    confirmedAmount: donations
      .filter((donation) => donation.status === 'Confirmed')
      .reduce((sum, donation) => sum + Number(donation.amount || 0), 0),
    confirmedCount: donations.filter((donation) => donation.status === 'Confirmed').length,
    reportedCount: donations.filter((donation) => donation.status === 'Confirmed' && donation.campaignStatus === 'Reported').length,
  }), [donations]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Ủng hộ của tôi</h2>
          <p className="text-on-surface-variant">Theo dõi các khoản quyên góp và xem báo cáo tài chính minh bạch từ ban tổ chức.</p>
        </div>
        <Link to="/su-kien" className="btn-primary inline-flex items-center gap-2 w-fit">
          <Icon name="search" size={20} />
          Tìm chiến dịch
        </Link>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-outline">
          <p className="text-label-sm text-on-surface-variant font-bold">Đã xác nhận</p>
          <p className="text-2xl font-extrabold text-primary">{formatMoney(totals.confirmedAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-outline">
          <p className="text-label-sm text-on-surface-variant font-bold">Số khoản đã xác nhận</p>
          <p className="text-2xl font-extrabold text-primary">{totals.confirmedCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-outline">
          <p className="text-label-sm text-on-surface-variant font-bold">Báo cáo có thể xem</p>
          <p className="text-2xl font-extrabold text-primary">{totals.reportedCount}</p>
        </div>
      </div>

      {donations.length === 0 ? (
        <EmptyState
          icon="volunteer_activism"
          title="Chưa có khoản ủng hộ nào"
          description="Khi bạn quyên góp cho chiến dịch, lịch sử và báo cáo tài chính sẽ hiển thị tại đây."
        />
      ) : (
        <div className="bg-white rounded-3xl shadow-soft border border-outline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-variant/50">
                <tr>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Chiến dịch</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Số tiền</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Ngày tạo</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Báo cáo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {donations.map((donation) => {
                  const canViewReport = donation.status === 'Confirmed' && donation.campaignStatus === 'Reported';
                  return (
                    <tr key={donation.id} className="hover:bg-primary-container/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-on-surface">{donation.campaignTitle || 'Chiến dịch'}</div>
                        <Link to={`/su-kien/${donation.eventId}`} className="text-label-sm text-primary font-bold hover:underline">
                          {donation.eventTitle || 'Xem sự kiện'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-bold text-on-surface">{formatMoney(donation.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${
                          donation.status === 'Confirmed'
                            ? 'bg-success-container text-on-success-container'
                            : donation.status === 'Rejected'
                              ? 'bg-error-container text-error'
                              : 'bg-warning-container text-amber-700'
                        }`}>
                          {donation.status === 'Confirmed' ? 'Đã xác nhận' : donation.status === 'Rejected' ? 'Bị từ chối' : 'Chờ xác nhận'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant text-sm">{formatDateTime(donation.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        {canViewReport ? (
                          <button
                            type="button"
                            className="btn-secondary inline-flex items-center gap-2"
                            onClick={() => setSelectedReport(donation)}
                          >
                            <Icon name="fact_check" size={18} />
                            Xem báo cáo tài chính
                          </button>
                        ) : (
                          <span className="text-label-sm text-on-surface-variant">
                            {donation.status !== 'Confirmed' ? 'Chờ xác nhận quyên góp' : 'Chưa có báo cáo'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FinancialReportModal donation={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
