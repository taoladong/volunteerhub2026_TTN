import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventApi, sponsorshipProposalApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import ImageUploadField from '../../components/ui/ImageUploadField';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

function fmtFull(dt) {
  return dt ? new Date(dt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
}

function money(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ';
}

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ phản hồi' },
  { key: 'accepted', label: 'Đã chấp nhận' },
  { key: 'received', label: 'Đã nhận' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export default function MySponsorships() {
  const [proposals, setProposals] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerModal, setOfferModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    eventId: '',
    title: '',
    message: '',
    offeredAmount: '',
    purpose: '',
    publicSponsorName: '',
    publicMessage: '',
    logoUrl: '',
    attachmentUrl: '',
  });

  const load = async () => {
    const [proposalRes, approvedEventRes, completedEventRes] = await Promise.all([
      sponsorshipProposalApi.getMy(),
      eventApi.getAll({ status: 'Approved', pageSize: 100 }),
      eventApi.getAll({ status: 'Completed', pageSize: 100 }),
    ]);
    setProposals(proposalRes.data || []);
    setEvents([...(approvedEventRes.data?.items || []), ...(completedEventRes.data?.items || [])]);
  };

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openOffer = () => {
    setForm({
      eventId: '',
      title: '',
      message: '',
      offeredAmount: '',
      purpose: '',
      publicSponsorName: '',
      publicMessage: '',
      logoUrl: '',
      attachmentUrl: '',
    });
    setOfferModal(true);
  };

  const submitOffer = async (e) => {
    e.preventDefault();
    const offeredAmount = Number(form.offeredAmount);
    if (!form.eventId || !form.title.trim() || !form.message.trim()) {
      alert('Vui lòng chọn sự kiện, nhập tiêu đề và nội dung đề nghị.');
      return;
    }
    if (!Number.isFinite(offeredAmount) || offeredAmount <= 0) {
      alert('Số tiền tài trợ phải lớn hơn 0.');
      return;
    }

    setSaving(true);
    try {
      await sponsorshipProposalApi.sponsorOffer(form.eventId, {
        ...form,
        offeredAmount,
      });
      await load();
      setOfferModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi đề nghị tài trợ thất bại');
    } finally {
      setSaving(false);
    }
  };

  const respond = async (proposal, action) => {
    try {
      if (action === 'accept') await sponsorshipProposalApi.accept(proposal.id, { responseMessage: 'Sponsor accepted' });
      if (action === 'cancel') await sponsorshipProposalApi.cancel(proposal.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Cập nhật đề nghị thất bại');
    }
  };

  const openRejectModal = (proposal) => {
    setRejectTarget(proposal);
    setRejectReason('');
    setRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 10) {
      alert('Lý do từ chối phải có ít nhất 10 ký tự.');
      return;
    }
    try {
      await sponsorshipProposalApi.reject(rejectTarget.id, { responseMessage: rejectReason.trim() });
      setRejectModal(false);
      setRejectTarget(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Từ chối thất bại');
    }
  };

  if (loading) return <LoadingSpinner />;

  const received = proposals.filter((p) => p.status === 'Received' || p.status === 'Reported');
  const pending = proposals.filter((p) => p.status === 'Pending');
  const accepted = proposals.filter((p) => p.status === 'Accepted');
  const totalReceived = received.reduce((sum, p) => sum + (Number(p.actualReceivedAmount ?? p.amount) || 0), 0);

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return p.status === 'Pending';
    if (filter === 'accepted') return p.status === 'Accepted';
    if (filter === 'received') return p.status === 'Received' || p.status === 'Reported';
    if (filter === 'cancelled') return p.status === 'Cancelled';
    return true;
  });

  const selectedEvent = events.find((ev) => String(ev.id) === String(form.eventId));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tài trợ của tôi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý lời mời, đề nghị và tài trợ đã được xác nhận nhận tiền.</p>
        </div>
        <button onClick={openOffer} className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-circle-plus" /> Đề nghị tài trợ
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-primary-50 to-green-50 border-primary-200">
          <p className="text-sm text-gray-500 mb-1">Đã nhận chính thức</p>
          <p className="text-2xl font-bold text-primary-700">{money(totalReceived)}</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <p className="text-sm text-gray-500 mb-1">Đang chờ phản hồi</p>
          <p className="text-2xl font-bold text-yellow-700">{pending.length}</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <p className="text-sm text-gray-500 mb-1">Đã chấp nhận, chờ nhận</p>
          <p className="text-2xl font-bold text-blue-700">{accepted.length}</p>
        </div>
      </div>

      {/* Bug 17: Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === tab.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredProposals.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-handshake text-5xl text-gray-300 mb-4 block" />
          <p className="text-gray-500 font-medium">
            {filter === 'all' ? 'Chưa có đề nghị tài trợ nào' : 'Không có đề nghị nào trong mục này'}
          </p>
          {filter === 'all' && (
            <button onClick={openOffer} className="btn-primary mt-4 inline-flex items-center gap-2">
              <i className="fa-solid fa-plus" /> Gửi đề nghị đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onAccept={() => respond(proposal, 'accept')}
              onReject={() => openRejectModal(proposal)}
              onCancel={() => respond(proposal, 'cancel')}
            />
          ))}
        </div>
      )}

      {/* Offer Modal */}
      <Modal isOpen={offerModal} onClose={() => setOfferModal(false)} title="Đề nghị tài trợ" size="lg">
        <form onSubmit={submitOffer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sự kiện *</label>
            <select value={form.eventId} onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))} required className="input-field">
              <option value="">-- Chọn sự kiện đã duyệt --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}{ev.status === 'Approved' ? ' (Đang cần tài trợ)' : ''}
                </option>
              ))}
            </select>
          </div>
          {/* Bug 9: Show event context */}
          {selectedEvent && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              <div className="flex flex-wrap gap-3">
                {selectedEvent.startDate && <span><i className="fa-solid fa-calendar mr-1" />{fmtFull(selectedEvent.startDate)}</span>}
                {selectedEvent.location && <span><i className="fa-solid fa-location-dot mr-1" />{selectedEvent.location}</span>}
                {selectedEvent.organizerName && <span><i className="fa-solid fa-user mr-1" />{selectedEvent.organizerName}</span>}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung đề nghị *</label>
            <textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền *</label>
              <input type="number" min="1" value={form.offeredAmount} onChange={(e) => setForm((f) => ({ ...f, offeredAmount: e.target.value }))} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên public</label>
              <input value={form.publicSponsorName} onChange={(e) => setForm((f) => ({ ...f, publicSponsorName: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích tài trợ</label>
            <textarea rows={2} value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thông điệp public</label>
            <textarea rows={2} value={form.publicMessage} onChange={(e) => setForm((f) => ({ ...f, publicMessage: e.target.value }))} className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageUploadField
              label="Logo tài trợ"
              value={form.logoUrl}
              onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
              helper="Upload logo hoặc ảnh đại diện nhà tài trợ."
              compact
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đính kèm URL</label>
              <input value={form.attachmentUrl} onChange={(e) => setForm((f) => ({ ...f, attachmentUrl: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setOfferModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={saving || events.length === 0} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Gửi đề nghị
            </button>
          </div>
        </form>
      </Modal>

      {/* Bug 12: Reject reason modal */}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Từ chối đề nghị" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Vui lòng nhập lý do từ chối (ít nhất 10 ký tự):</p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="input-field resize-none"
            placeholder="Nhập lý do từ chối..."
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setRejectModal(false)} className="btn-secondary">Hủy</button>
            <button
              type="button"
              onClick={submitReject}
              disabled={rejectReason.trim().length < 10}
              className="btn-danger flex items-center gap-2"
            >
              Từ chối
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProposalCard({ proposal, onAccept, onReject, onCancel }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/events/${proposal.eventId}`} className="font-semibold text-gray-900 hover:text-primary-600">
              {proposal.eventTitle || `Sự kiện #${proposal.eventId}`}
            </Link>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">{proposal.type}</span>
            <span className="rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-xs text-primary-700">{proposal.status}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900">{proposal.title}</p>
          <p className="mt-1 text-sm text-gray-600">{proposal.message}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
            {proposal.eventStartDate && <span><i className="fa-solid fa-calendar mr-1" />{fmt(proposal.eventStartDate)}</span>}
            {proposal.eventLocation && <span><i className="fa-solid fa-location-dot mr-1" />{proposal.eventLocation}</span>}
            <span>Organizer: {proposal.organizerName}</span>
            {proposal.organizerEmail && <span>Email: {proposal.organizerEmail}</span>}
            {proposal.organizerPhone && <span>Điện thoại: {proposal.organizerPhone}</span>}
            <span>Số tiền: {money(proposal.amount)}</span>
            {proposal.actualReceivedAmount != null && <span>Thực nhận: {money(proposal.actualReceivedAmount)}</span>}
          </div>
          {/* Bug 18: Show dates */}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
            {proposal.createdAt && <span>Tạo: {fmtFull(proposal.createdAt)}</span>}
            {proposal.respondedAt && <span>Phản hồi: {fmtFull(proposal.respondedAt)}</span>}
          </div>
          {proposal.responseMessage && <p className="mt-2 text-xs text-gray-500">Phản hồi: {proposal.responseMessage}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {proposal.eventStatus && <StatusBadge status={proposal.eventStatus} />}
          {proposal.type === 'OrganizerRequest' && proposal.status === 'Pending' && (
            <>
              <button onClick={onAccept} className="btn-primary btn-sm">Chấp nhận</button>
              <button onClick={onReject} className="btn-danger btn-sm">Từ chối</button>
            </>
          )}
          {proposal.type === 'SponsorOffer' && proposal.status === 'Pending' && (
            <button onClick={onCancel} className="btn-secondary btn-sm">Hủy đề nghị</button>
          )}
          {proposal.status === 'Received' && (
            <span className="text-xs rounded-full bg-green-50 text-green-700 border border-green-100 px-2 py-1">
              Đã ghi nhận chính thức
            </span>
          )}
        </div>
      </div>

      {/* Bug 5: Timeline/progress for Received/Reported */}
      {(proposal.status === 'Received' || proposal.status === 'Reported') && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Đã chấp nhận</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Đã nhận tiền {proposal.actualReceivedAmount != null ? `(${money(proposal.actualReceivedAmount)})` : ''}</span>
            </div>
            {proposal.eventStartDate && (
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${proposal.eventStatus === 'Completed' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                <span>Sự kiện {proposal.eventStatus === 'Completed' ? 'đã hoàn thành' : `bắt đầu ${fmt(proposal.eventStartDate)}`}</span>
              </div>
            )}
            {proposal.status === 'Reported' && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Đã có báo cáo {proposal.reportedAt ? fmt(proposal.reportedAt) : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bug 4: Render report data when status is Reported */}
      {proposal.status === 'Reported' && (proposal.reportSummary || proposal.expenseDetails || proposal.reportAttachmentUrl) && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-[10px]`} />
            {expanded ? 'Ẩn báo cáo' : 'Xem báo cáo sử dụng'}
          </button>
          {expanded && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm space-y-2">
              {proposal.reportSummary && (
                <div>
                  <p className="text-xs font-medium text-blue-700">Tóm tắt báo cáo:</p>
                  <p className="text-blue-900">{proposal.reportSummary}</p>
                </div>
              )}
              {proposal.expenseDetails && (
                <div>
                  <p className="text-xs font-medium text-blue-700">Chi tiết chi phí:</p>
                  <p className="text-blue-900 whitespace-pre-wrap">{proposal.expenseDetails}</p>
                </div>
              )}
              {proposal.reportAttachmentUrl && (
                <div>
                  <a href={proposal.reportAttachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <i className="fa-solid fa-paperclip" /> Xem tệp đính kèm
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
