import React, { useState } from 'react';
import { fmt, money } from '../../../utils/format';
import Modal from '../../../components/ui/Modal';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { VN_BANKS, buildVietQrUrl } from '../../../utils/vietqr';

export default function CampaignsTab({
  campaigns,
  campaignTarget,
  campaignConfirmed,
  campaignPending,
  campaignProgress,
  // Create campaign
  campaignModal,
  setCampaignModal,
  campaignForm,
  setCampaignForm,
  campaignSaving,
  onOpenCreateCampaign,
  canCreateCampaign = true,
  onSubmitCampaign,
  onChangeCampaignStatus,
  // Donations
  donationModal,
  setDonationModal,
  selectedCampaign,
  donations,
  donationsLoading,
  onOpenDonations,
  onUpdateDonationStatus,
  // Financial report
  onOpenFinancialReport,
}) {
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState('');

  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [reconciled, setReconciled] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const openConfirm = (donation) => {
    setConfirmTarget(donation);
    setReconciled(false);
    setConfirmError('');
    setConfirmModal(true);
  };

  const submitConfirm = async () => {
    if (!reconciled) { setConfirmError('Vui lòng tick xác nhận đã đối chiếu sao kê.'); return; }
    setConfirmSaving(true);
    setConfirmError('');
    try {
      await onUpdateDonationStatus(confirmTarget, 'confirm');
      setConfirmModal(false);
    } catch (err) {
      setConfirmError(err.response?.data?.message || 'Xác nhận thất bại. Vui lòng thử lại.');
    } finally {
      setConfirmSaving(false);
    }
  };

  const openReject = (donation) => {
    setRejectTarget(donation);
    setRejectReason('');
    setRejectError('');
    setRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) { return; }
    setRejectSaving(true);
    setRejectError('');
    try {
      await onUpdateDonationStatus(rejectTarget, 'reject', rejectReason.trim());
      setRejectModal(false);
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Từ chối thất bại. Vui lòng thử lại.');
    } finally {
      setRejectSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-warmink">Kêu gọi ủng hộ</h2>
          <p className="text-sm text-warmink-2">Quản lý đợt kêu gọi tiền cá nhân và xác nhận khoản đã nhận.</p>
        </div>
        <button onClick={onOpenCreateCampaign} disabled={!canCreateCampaign} className="btn-primary btn-sm flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed">
          <i className="fa-solid fa-plus" /> Tạo đợt
        </button>
      </div>

      <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-warmink-2">Tổng mục tiêu</p>
          <p className="text-xl font-bold text-warmink">{money(campaignTarget)}</p>
        </div>
        <div>
          <p className="text-xs text-warmink-2">Đã xác nhận</p>
          <p className="text-xl font-bold text-green-700">{money(campaignConfirmed)}</p>
        </div>
        <div>
          <p className="text-xs text-warmink-2">Đang chờ</p>
          <p className="text-xl font-bold text-yellow-600">{money(campaignPending)}</p>
        </div>
        <div>
          <p className="text-xs text-warmink-2">Tiến độ chung</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${campaignProgress}%` }} />
          </div>
          <p className="mt-1 text-xs text-warmink-2">{campaignProgress}%</p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon="fa-hand-holding-heart"
          title="Chưa có đợt kêu gọi ủng hộ nào"
          description={canCreateCampaign
            ? 'Tạo đợt kêu gọi để nhận và xác nhận các khoản ủng hộ cá nhân cho sự kiện.'
            : 'Chỉ tạo được đợt kêu gọi khi sự kiện còn hoạt động và chưa hết thời gian.'}
          cta={canCreateCampaign ? 'Tạo đợt đầu tiên' : undefined}
          onCta={canCreateCampaign ? onOpenCreateCampaign : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {campaigns.map((campaign) => {
            const confirmedAmount = Number(campaign.confirmedAmount) || 0;
            const pendingAmount = Number(campaign.pendingAmount) || 0;
            const targetAmount = Number(campaign.targetAmount) || 0;
            const pctDone = targetAmount > 0 ? Math.min(100, Math.round((confirmedAmount / targetAmount) * 100)) : 0;
            return (
              <div key={campaign.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-warmink">{campaign.title}</h3>
                      <span className="rounded-full border border-warmborder bg-surface-2 px-2 py-0.5 text-xs text-warmink-2">{campaign.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-warmink-2">{campaign.description}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-warmink-2">
                    <span>Đã xác nhận {money(confirmedAmount)}</span>
                    <span>Mục tiêu {money(targetAmount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${pctDone}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg p-3" style={{ background: 'rgba(21,128,61,0.06)' }}>
                    <p className="text-xs" style={{ color: '#15803d' }}>Đã xác nhận</p>
                    <p className="font-semibold" style={{ color: '#15803d' }}>{campaign.confirmedCount || 0} lượt</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(180,83,9,0.06)' }}>
                    <p className="text-xs" style={{ color: '#b45309' }}>Đang chờ</p>
                    <p className="font-semibold" style={{ color: '#b45309' }}>{campaign.pendingCount || 0} lượt · {money(pendingAmount)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => onOpenDonations(campaign)} className="btn-secondary btn-sm">
                    <i className="fa-solid fa-list mr-1" /> Donation
                  </button>
                  {(campaign.status === 'Closed' || campaign.status === 'Reported') && (
                    <button onClick={() => onOpenFinancialReport('campaign', campaign)} className="btn-secondary btn-sm">
                      Báo cáo
                    </button>
                  )}
                  {campaign.status !== 'Open' && campaign.status !== 'Cancelled' && (
                    <button onClick={() => onChangeCampaignStatus(campaign, 'open')} className="btn-primary btn-sm">Mở</button>
                  )}
                  {campaign.status === 'Open' && (
                    <button onClick={() => onChangeCampaignStatus(campaign, 'close')} className="btn-secondary btn-sm">Đóng</button>
                  )}
                  {campaign.status !== 'Cancelled' && (
                    <button onClick={() => onChangeCampaignStatus(campaign, 'cancel')} className="btn-danger btn-sm">Hủy</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={campaignModal} onClose={() => setCampaignModal(false)} title="Tạo đợt kêu gọi" size="lg">
        <form onSubmit={onSubmitCampaign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Tiêu đề *</label>
            <input value={campaignForm.title} onChange={(e) => setCampaignForm((f) => ({ ...f, title: e.target.value }))} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Mô tả *</label>
            <textarea rows={3} value={campaignForm.description} onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))} required className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Mục tiêu *</label>
              <input type="number" min="1" value={campaignForm.targetAmount} onChange={(e) => setCampaignForm((f) => ({ ...f, targetAmount: e.target.value }))} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Tối thiểu mong muốn</label>
              <input type="number" min="0" value={campaignForm.minimumAmount} onChange={(e) => setCampaignForm((f) => ({ ...f, minimumAmount: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Bắt đầu *</label>
              <input type="datetime-local" value={campaignForm.startDate} onChange={(e) => setCampaignForm((f) => ({ ...f, startDate: e.target.value }))} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Kết thúc *</label>
              <input type="datetime-local" value={campaignForm.endDate} onChange={(e) => setCampaignForm((f) => ({ ...f, endDate: e.target.value }))} required className="input-field" />
            </div>
          </div>
          <div className="rounded-lg p-3 space-y-3" style={{ border: '1px solid rgba(15,15,15,0.08)', background: 'rgba(15,15,15,0.015)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>
              <i className="fa-solid fa-qrcode mr-1.5" style={{ color: '#1b61c9' }} />Tài khoản nhận tiền (sinh mã VietQR)
            </p>
            <p className="text-xs" style={{ color: 'rgba(15,15,15,0.50)' }}>
              Nhập tài khoản để hệ thống tạo mã QR cho người ủng hộ quét bằng app ngân hàng. Tiền chuyển trực tiếp vào tài khoản của bạn (ngoài hệ thống).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(15,15,15,0.65)' }}>Ngân hàng</label>
                <select value={campaignForm.bankBin} onChange={(e) => setCampaignForm((f) => ({ ...f, bankBin: e.target.value }))} className="input-field">
                  <option value="">-- Chọn ngân hàng --</option>
                  {VN_BANKS.map((b) => <option key={b.bin} value={b.bin}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(15,15,15,0.65)' }}>Số tài khoản</label>
                <input value={campaignForm.bankAccountNo} onChange={(e) => setCampaignForm((f) => ({ ...f, bankAccountNo: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field" placeholder="VD: 52968011042005" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(15,15,15,0.65)' }}>Tên chủ tài khoản</label>
              <input value={campaignForm.bankAccountName} onChange={(e) => setCampaignForm((f) => ({ ...f, bankAccountName: e.target.value }))} className="input-field" placeholder="VD: NGUYEN VAN A" />
            </div>
            {campaignForm.bankBin && campaignForm.bankAccountNo && (
              <div className="flex items-center gap-3">
                <img
                  src={buildVietQrUrl({ bin: campaignForm.bankBin, accountNo: campaignForm.bankAccountNo, accountName: campaignForm.bankAccountName, template: 'qr_only' })}
                  alt="VietQR preview"
                  style={{ width: 96, height: 96, borderRadius: 8, border: '1px solid rgba(15,15,15,0.10)' }}
                />
                <p className="text-xs" style={{ color: 'rgba(15,15,15,0.50)' }}>Xem trước mã QR. Người ủng hộ sẽ thấy mã có sẵn số tiền + nội dung đối soát.</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Ghi chú thêm về nhận tiền (tùy chọn)</label>
            <textarea rows={2} value={campaignForm.receiveInfo} onChange={(e) => setCampaignForm((f) => ({ ...f, receiveInfo: e.target.value }))} className="input-field resize-none" placeholder="Hướng dẫn thêm nếu cần (vd: ghi rõ họ tên khi chuyển khoản)..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Ghi chú minh bạch</label>
            <textarea rows={2} value={campaignForm.transparencyNote} onChange={(e) => setCampaignForm((f) => ({ ...f, transparencyNote: e.target.value }))} className="input-field resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-warmink-2">
            <input type="checkbox" checked={campaignForm.status === 'Open'} onChange={(e) => setCampaignForm((f) => ({ ...f, status: e.target.checked ? 'Open' : 'Draft' }))} />
            Mở nhận ủng hộ ngay sau khi tạo
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCampaignModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={campaignSaving} className="btn-primary flex items-center gap-2">
              {campaignSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Tạo đợt
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={donationModal} onClose={() => setDonationModal(false)} title="Danh sách ủng hộ" size="xl">
        {donationsLoading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {donations.length === 0 ? (
              <p className="text-sm text-warmink-2 text-center py-8">Chưa có khoản ủng hộ nào.</p>
            ) : donations.map((donation) => (
              <div key={donation.id} className="rounded-lg border border-warmborder p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-warmink">{donation.isAnonymous ? 'Ẩn danh' : donation.displayName || donation.userName} · {money(donation.amount)}</p>
                    <p className="text-xs text-warmink-2">{donation.status} · {fmt(donation.createdAt)}</p>
                    {donation.status === 'Confirmed' && donation.confirmedAt && (
                      <p className="text-xs" style={{ color: '#15803d' }}>
                        <i className="fa-solid fa-circle-check mr-1" />Đã xác nhận lúc {fmt(donation.confirmedAt)}
                      </p>
                    )}
                    {(donation.phone || donation.email) && <p className="text-xs text-warmink-2">{donation.phone} {donation.email}</p>}
                    {donation.note && <p className="text-sm text-warmink-2 mt-1">{donation.note}</p>}
                    {donation.proofImageUrl && <a href={donation.proofImageUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600">Xem minh chứng</a>}
                  </div>
                  {donation.status === 'PendingConfirmation' && (
                    <div className="flex gap-2">
                      <button onClick={() => openConfirm(donation)} className="btn-primary btn-sm">Xác nhận</button>
                      <button onClick={() => openReject(donation)} className="btn-danger btn-sm">Từ chối</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Từ chối khoản ủng hộ" size="md">
        <div className="space-y-4">
          {rejectTarget && (
            <div className="rounded-lg border border-warmborder bg-surface-2 p-3 text-sm text-warmink-2">
              <span className="font-medium">{rejectTarget.isAnonymous ? 'Ẩn danh' : rejectTarget.displayName || rejectTarget.userName}</span>
              {' · '}{money(rejectTarget.amount)}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Lý do từ chối *</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input-field resize-none"
              placeholder="Ví dụ: không tìm thấy thông tin chuyển khoản phù hợp, số tiền không khớp..."
            />
            {rejectReason.trim().length === 0 && (
              <p className="mt-1 text-xs text-red-500">Vui lòng nhập lý do từ chối.</p>
            )}
          </div>
          {rejectError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {rejectError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setRejectModal(false)} className="btn-secondary">Hủy</button>
            <button
              type="button"
              onClick={submitReject}
              disabled={rejectSaving || !rejectReason.trim()}
              className="btn-danger flex items-center gap-2 disabled:opacity-60"
            >
              {rejectSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Xác nhận từ chối
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Xác nhận khoản ủng hộ" size="md">
        <div className="space-y-4">
          {confirmTarget && (
            <div className="rounded-lg border border-warmborder bg-surface-2 p-3 text-sm text-warmink-2">
              <span className="font-medium">{confirmTarget.isAnonymous ? 'Ẩn danh' : confirmTarget.displayName || confirmTarget.userName}</span>
              {' · '}{money(confirmTarget.amount)}
              {confirmTarget.proofImageUrl && (
                <a href={confirmTarget.proofImageUrl} target="_blank" rel="noreferrer" className="ml-2 text-xs text-primary-600">Xem minh chứng</a>
              )}
            </div>
          )}
          <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.20)', color: '#b45309' }}>
            <i className="fa-solid fa-triangle-exclamation mr-1.5" />
            Ảnh minh chứng do người ủng hộ tự cung cấp, không phải bằng chứng giao dịch ngân hàng. Hãy đối chiếu với sao kê tài khoản của bạn trước khi xác nhận.
          </div>
          <label className="flex items-start gap-2 text-sm" style={{ color: 'rgba(15,15,15,0.75)' }}>
            <input type="checkbox" className="mt-0.5" checked={reconciled} onChange={(e) => setReconciled(e.target.checked)} />
            <span>Tôi đã đối chiếu khoản tiền này với sao kê ngân hàng và xác nhận đã nhận được.</span>
          </label>
          {confirmError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{confirmError}</div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setConfirmModal(false)} className="btn-secondary">Hủy</button>
            <button type="button" onClick={submitConfirm} disabled={confirmSaving || !reconciled} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {confirmSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Xác nhận đã nhận
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
