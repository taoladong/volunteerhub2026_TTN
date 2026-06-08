import React, { useState } from 'react';
import { money } from '../../../utils/format';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';

const PROPOSAL_STATUS_STYLE = {
  Pending: { color: '#b45309', bg: 'rgba(180,83,9,0.08)', border: 'rgba(180,83,9,0.20)' },
  Accepted: { color: '#1b61c9', bg: 'rgba(27,97,201,0.08)', border: 'rgba(27,97,201,0.20)' },
  Received: { color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.20)' },
  Reported: { color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.20)' },
  Rejected: { color: '#b91c1c', bg: 'rgba(185,28,28,0.07)', border: 'rgba(185,28,28,0.18)' },
  Cancelled: { color: 'rgba(15,15,15,0.55)', bg: 'rgba(15,15,15,0.05)', border: 'rgba(15,15,15,0.12)' },
};

export default function CorporateTab({
  proposals,
  proposalPendingCount,
  proposalAcceptedCount,
  proposalReceived,
  proposalReceivedAmount,
  sponsorUsers,
  // Invite modal
  proposalModal,
  setProposalModal,
  proposalForm,
  setProposalForm,
  proposalSaving,
  onOpenInviteSponsor,
  onSubmitSponsorInvite,
  onUpdateProposalStatus,
  // Received confirmation
  receivedProposal,
  setReceivedProposal,
  receivedAmount,
  setReceivedAmount,
  receivedSaving,
  receivedError,
  onSubmitReceivedProposal,
  // Financial report
  onOpenFinancialReport,
}) {
  const [responseModal, setResponseModal] = useState(null); // { proposal, action: 'accept'|'reject' }
  const [responseMessage, setResponseMessage] = useState('');
  const [responseSaving, setResponseSaving] = useState(false);
  const [responseError, setResponseError] = useState('');

  const openResponseModal = (proposal, action) => {
    setResponseModal({ proposal, action });
    setResponseMessage('');
    setResponseError('');
  };

  const submitResponse = async () => {
    if (!responseModal) return;
    if (responseModal.action === 'reject' && !responseMessage.trim()) return;
    setResponseSaving(true);
    setResponseError('');
    try {
      await onUpdateProposalStatus(responseModal.proposal, responseModal.action, responseMessage.trim());
      setResponseModal(null);
    } catch (err) {
      setResponseError(err.response?.data?.message || 'Thao tác thất bại. Vui lòng thử lại.');
    } finally {
      setResponseSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-warmink">Tài trợ doanh nghiệp</h2>
          <p className="text-sm text-warmink-2">Mời sponsor hoặc xử lý đề nghị tài trợ từ sponsor.</p>
        </div>
        <button onClick={onOpenInviteSponsor} className="btn-primary btn-sm flex items-center gap-1">
          <i className="fa-solid fa-paper-plane" /> Mời tài trợ
        </button>
      </div>

      <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-warmink-2">Đang chờ</p>
          <p className="text-xl font-bold text-yellow-600">{proposalPendingCount}</p>
        </div>
        <div>
          <p className="text-xs text-warmink-2">Đã đồng ý</p>
          <p className="text-xl font-bold text-blue-600">{proposalAcceptedCount}</p>
        </div>
        <div>
          <p className="text-xs text-warmink-2">Đã nhận</p>
          <p className="text-xl font-bold text-green-700">{proposalReceived.length}</p>
        </div>
        <div>
          <p className="text-xs text-warmink-2">Tổng đã nhận</p>
          <p className="text-xl font-bold text-green-700">{money(proposalReceivedAmount)}</p>
        </div>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          icon="fa-handshake"
          title="Chưa có lời mời hoặc đề nghị tài trợ nào"
          description="Mời sponsor tài trợ cho sự kiện hoặc chờ đề nghị tài trợ gửi đến từ doanh nghiệp."
        />
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-warmink">{proposal.title}</h3>
                    <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(15,15,15,0.05)', border: '1px solid rgba(15,15,15,0.12)', color: 'rgba(15,15,15,0.60)' }}>{proposal.type}</span>
                    {(() => {
                      const ps = PROPOSAL_STATUS_STYLE[proposal.status] || PROPOSAL_STATUS_STYLE.Cancelled;
                      return <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: ps.bg, border: `1px solid ${ps.border}`, color: ps.color }}>{proposal.status}</span>;
                    })()}
                  </div>
                  <p className="mt-1 text-sm text-warmink-2">{proposal.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-warmink-2">
                    <span>Sponsor: {proposal.sponsorName}</span>
                    {proposal.sponsorEmail && <span><i className="fa-solid fa-envelope mr-0.5" />{proposal.sponsorEmail}</span>}
                    <span>Số tiền: {money(proposal.amount)}</span>
                    {proposal.purpose && <span>Mục đích: {proposal.purpose}</span>}
                  </div>
                  {proposal.responseMessage && <p className="mt-2 text-xs text-warmink-2">Phản hồi: {proposal.responseMessage}</p>}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {proposal.type === 'SponsorOffer' && proposal.status === 'Pending' && (
                    <>
                      <button onClick={() => openResponseModal(proposal, 'accept')} className="btn-primary btn-sm">Chấp nhận</button>
                      <button onClick={() => openResponseModal(proposal, 'reject')} className="btn-danger btn-sm">Từ chối</button>
                    </>
                  )}
                  {proposal.type === 'OrganizerRequest' && proposal.status === 'Pending' && (
                    <button onClick={() => onUpdateProposalStatus(proposal, 'cancel').catch((err) => alert(err.response?.data?.message || 'Hủy thất bại'))} className="btn-secondary btn-sm">Hủy lời mời</button>
                  )}
                  {proposal.status === 'Accepted' && (
                    <button onClick={() => onUpdateProposalStatus(proposal, 'received')} className="btn-primary btn-sm">Xác nhận đã nhận</button>
                  )}
                  {(proposal.status === 'Received' || proposal.status === 'Reported') && (
                    <button onClick={() => onOpenFinancialReport('proposal', proposal)} className="btn-secondary btn-sm">Báo cáo</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={proposalModal} onClose={() => setProposalModal(false)} title="Mời sponsor tài trợ" size="lg">
        <form onSubmit={onSubmitSponsorInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Sponsor *</label>
            <select value={proposalForm.sponsorId} onChange={(e) => setProposalForm((f) => ({ ...f, sponsorId: e.target.value }))} required className="input-field">
              <option value="">-- Chọn sponsor --</option>
              {sponsorUsers.map((sponsor) => (
                <option key={sponsor.id} value={sponsor.id}>{sponsor.name || sponsor.userName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Tiêu đề *</label>
            <input value={proposalForm.title} onChange={(e) => setProposalForm((f) => ({ ...f, title: e.target.value }))} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Nội dung kêu gọi *</label>
            <textarea rows={4} value={proposalForm.message} onChange={(e) => setProposalForm((f) => ({ ...f, message: e.target.value }))} required className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Số tiền mong muốn *</label>
              <input type="number" min="1" value={proposalForm.requestedAmount} onChange={(e) => setProposalForm((f) => ({ ...f, requestedAmount: e.target.value }))} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">File/ảnh đính kèm URL</label>
              <input value={proposalForm.attachmentUrl} onChange={(e) => setProposalForm((f) => ({ ...f, attachmentUrl: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Mục đích sử dụng</label>
            <textarea rows={2} value={proposalForm.purpose} onChange={(e) => setProposalForm((f) => ({ ...f, purpose: e.target.value }))} className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Quyền lợi/ghi nhận sponsor</label>
            <textarea rows={2} value={proposalForm.sponsorBenefits} onChange={(e) => setProposalForm((f) => ({ ...f, sponsorBenefits: e.target.value }))} className="input-field resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setProposalModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={proposalSaving || sponsorUsers.length === 0} className="btn-primary flex items-center gap-2">
              {proposalSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Gửi lời mời
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!responseModal}
        onClose={() => setResponseModal(null)}
        title={responseModal?.action === 'accept' ? 'Chấp nhận đề nghị tài trợ' : 'Từ chối đề nghị tài trợ'}
        size="md"
      >
        <div className="space-y-4">
          {responseModal && (
            <div className="rounded-lg border border-warmborder bg-surface-2 p-3 text-sm text-warmink-2">
              <p className="font-medium">{responseModal.proposal.title}</p>
              <p className="mt-0.5 text-xs text-warmink-2">Sponsor: {responseModal.proposal.sponsorName} · {money(responseModal.proposal.amount)}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">
              {responseModal?.action === 'reject' ? 'Lý do từ chối *' : 'Lời nhắn (tùy chọn)'}
            </label>
            <textarea
              rows={3}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              className="input-field resize-none"
              placeholder={responseModal?.action === 'reject'
                ? 'Ví dụ: không phù hợp với định hướng sự kiện, ngân sách đã đủ...'
                : 'Ví dụ: rất vui được hợp tác, sẽ liên hệ sớm...'}
            />
            {responseModal?.action === 'reject' && !responseMessage.trim() && (
              <p className="mt-1 text-xs text-red-500">Vui lòng nhập lý do từ chối.</p>
            )}
          </div>
          {responseError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {responseError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setResponseModal(null)} className="btn-secondary">Hủy</button>
            <button
              type="button"
              onClick={submitResponse}
              disabled={responseSaving || (responseModal?.action === 'reject' && !responseMessage.trim())}
              className={`${responseModal?.action === 'accept' ? 'btn-primary' : 'btn-danger'} flex items-center gap-2 disabled:opacity-60`}
            >
              {responseSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {responseModal?.action === 'accept' ? 'Xác nhận chấp nhận' : 'Xác nhận từ chối'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!receivedProposal} onClose={() => setReceivedProposal(null)} title="Xác nhận tiền tài trợ đã nhận" size="md">
        <form onSubmit={onSubmitReceivedProposal} className="space-y-4">
          <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-800">
            <p className="font-semibold">{receivedProposal?.title}</p>
            <p className="mt-1">Sponsor: {receivedProposal?.sponsorName || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Số tiền thực nhận *</label>
            <input
              type="number"
              min="1"
              step="1000"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="input-field"
              required
            />
            <p className="mt-1 text-xs text-warmink-2">Nhập đúng số tiền đã nhận thực tế từ sponsor. Số này sẽ dùng trong báo cáo tài chính.</p>
          </div>
          {receivedError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {receivedError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setReceivedProposal(null)} className="btn-secondary" disabled={receivedSaving}>Hủy</button>
            <button type="button" onClick={onSubmitReceivedProposal} className="btn-primary flex items-center gap-2" disabled={receivedSaving}>
              {receivedSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Xác nhận đã nhận
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
