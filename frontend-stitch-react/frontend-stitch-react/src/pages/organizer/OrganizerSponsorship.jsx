import React, { useEffect, useState } from 'react';
import { eventApi, sponsorshipProposalApi } from '../../services/api';
import { Alert, EmptyState, PageHeader, StatusBadge, formatMoney, getErrorMessage, unwrap } from '../../components/common/CommonUI';

const emptyForm = { eventId: '', sponsorUserId: '', title: '', message: '', proposedAmount: '' };

export default function OrganizerSponsorship() {
  const [events, setEvents] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [reportForm, setReportForm] = useState({ proposalId: '', actualReceivedAmount: '', usedAmount: '', reportSummary: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsRes, sponsorsRes, mineRes] = await Promise.all([
        eventApi.getMyEvents?.({ pageSize: 100 }),
        sponsorshipProposalApi.getSponsorUsers?.(),
        sponsorshipProposalApi.getMy?.(),
      ]);
      const eventList = unwrap(eventsRes, []);
      setEvents(Array.isArray(eventList) ? eventList : []);
      setSponsors(unwrap(sponsorsRes, []));
      setProposals(unwrap(mineRes, []));
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được dữ liệu tài trợ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadByEvent = async (eventId) => {
    setSelectedEventId(eventId);
    if (!eventId) return load();
    setLoading(true);
    try {
      const res = await sponsorshipProposalApi.getByEvent(eventId);
      setProposals(unwrap(res, []));
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được đề xuất theo sự kiện'));
    } finally {
      setLoading(false);
    }
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await sponsorshipProposalApi.organizerRequest(form.eventId, {
        sponsorUserId: form.sponsorUserId,
        title: form.title,
        message: form.message,
        proposedAmount: Number(form.proposedAmount || 0),
      });
      setForm(emptyForm);
      await loadByEvent(selectedEventId || form.eventId);
    } catch (err) {
      setError(getErrorMessage(err, 'Không gửi được lời mời tài trợ'));
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await loadByEvent(selectedEventId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitReceived = async () => {
    if (!reportForm.proposalId) return;
    await runAction(() => sponsorshipProposalApi.received(reportForm.proposalId, { actualReceivedAmount: Number(reportForm.actualReceivedAmount || 0) }));
  };

  const submitReport = async () => {
    if (!reportForm.proposalId) return;
    await runAction(() => sponsorshipProposalApi.report(reportForm.proposalId, {
      usedAmount: Number(reportForm.usedAmount || 0),
      reportSummary: reportForm.reportSummary,
    }));
    setReportForm({ proposalId: '', actualReceivedAmount: '', usedAmount: '', reportSummary: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="handshake"
        title="Quản lý tài trợ"
        subtitle="Mời nhà tài trợ, xử lý đề nghị tài trợ và báo cáo sử dụng tài trợ cho sự kiện."
      />

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={submitInvite} className="bg-white rounded-3xl shadow-soft border border-outline p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <h2 className="md:col-span-2 text-title-lg font-bold text-on-surface">Mời nhà tài trợ</h2>
        <select className="input-field" value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} required>
          <option value="">Chọn sự kiện</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title || event.name}</option>)}
        </select>
        <select className="input-field" value={form.sponsorUserId} onChange={(e) => setForm({ ...form, sponsorUserId: e.target.value })} required>
          <option value="">Chọn nhà tài trợ</option>
          {sponsors.map((sponsor) => <option key={sponsor.id} value={sponsor.id}>{sponsor.name || sponsor.email || sponsor.organizationName}</option>)}
        </select>
        <input className="input-field" placeholder="Tiêu đề đề nghị" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input-field" type="number" placeholder="Số tiền đề xuất" value={form.proposedAmount} onChange={(e) => setForm({ ...form, proposedAmount: e.target.value })} />
        <textarea className="input-field md:col-span-2" placeholder="Thông điệp / quyền lợi tài trợ" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button className="btn-primary md:col-span-2" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi lời mời tài trợ'}</button>
      </form>

      <div className="bg-white rounded-3xl shadow-soft border border-outline p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-title-lg font-bold text-on-surface">Đề xuất tài trợ</h2>
          <select className="input-field md:max-w-sm" value={selectedEventId} onChange={(e) => loadByEvent(e.target.value)}>
            <option value="">Tất cả sự kiện</option>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title || event.name}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-on-surface-variant">Đang tải...</p>
        ) : proposals.length === 0 ? (
          <EmptyState icon="handshake" title="Chưa có đề xuất tài trợ" />
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="border border-outline rounded-2xl p-4 hover:bg-primary-container/10 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-on-surface">{proposal.title || proposal.eventTitle || 'Đề xuất tài trợ'}</h3>
                    <p className="text-on-surface-variant text-body-sm mt-1">{proposal.message || proposal.note || '—'}</p>
                    <p className="font-bold text-primary mt-2">{formatMoney(proposal.proposedAmount || proposal.amount || proposal.actualReceivedAmount)}</p>
                    <div className="mt-2"><StatusBadge status={proposal.status} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary !py-2 !px-3" onClick={() => runAction(() => sponsorshipProposalApi.accept(proposal.id))}>Chấp nhận</button>
                    <button className="btn-danger !py-2 !px-3" onClick={() => runAction(() => sponsorshipProposalApi.reject(proposal.id, { reason: 'Không phù hợp với nhu cầu sự kiện' }))}>Từ chối</button>
                    <button className="btn-secondary !py-2 !px-3" onClick={() => runAction(() => sponsorshipProposalApi.cancel(proposal.id))}>Hủy</button>
                    <button className="btn-secondary !py-2 !px-3" onClick={() => setReportForm({ ...reportForm, proposalId: proposal.id })}>Báo cáo</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reportForm.proposalId && (
        <div className="bg-white rounded-3xl shadow-soft border border-outline p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 text-title-lg font-bold text-on-surface">Xác nhận nhận tiền và báo cáo</h2>
          <input className="input-field" type="number" placeholder="Số tiền thực nhận" value={reportForm.actualReceivedAmount} onChange={(e) => setReportForm({ ...reportForm, actualReceivedAmount: e.target.value })} />
          <button className="btn-secondary" onClick={submitReceived}>Xác nhận đã nhận tiền</button>
          <input className="input-field" type="number" placeholder="Số tiền đã sử dụng" value={reportForm.usedAmount} onChange={(e) => setReportForm({ ...reportForm, usedAmount: e.target.value })} />
          <textarea className="input-field" placeholder="Tóm tắt sử dụng tài trợ" value={reportForm.reportSummary} onChange={(e) => setReportForm({ ...reportForm, reportSummary: e.target.value })} />
          <button className="btn-primary md:col-span-2" onClick={submitReport}>Gửi báo cáo tài trợ</button>
        </div>
      )}
    </div>
  );
}
