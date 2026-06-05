import React, { useEffect, useState } from 'react';
import { eventApi, supportCampaignApi } from '../../services/api';
import {
  EmptyState,
  ImageUploader,
  PageHeader,
  StatusBadge,
  Alert,
  formatDate,
  formatMoney,
  formatDateTime,
  getErrorMessage,
  unwrap,
} from '../../components/common/CommonUI';

const defaultForm = {
  eventId: '',
  title: '',
  description: '',
  targetAmount: '',
  minimumAmount: '',
  startDate: '',
  endDate: '',
  receiveInfo: '',
  transparencyNote: '',
};

export default function OrganizerCampaigns() {
  const [events, setEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [report, setReport] = useState({ usedAmount: '', reportSummary: '', expenseDetails: '', proofImageUrl: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsRes, campaignsRes] = await Promise.all([
        eventApi.getMine?.(),
        supportCampaignApi.getMine(),
      ]);
      const eventList = unwrap(eventsRes, []);
      setEvents(Array.isArray(eventList) ? eventList : []);
      const campaignList = unwrap(campaignsRes, []);
      setCampaigns(Array.isArray(campaignList) ? campaignList : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được chiến dịch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        targetAmount: Number(form.targetAmount || 0),
        minimumAmount: Number(form.minimumAmount || 0),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        receiveInfo: form.receiveInfo,
        transparencyNote: form.transparencyNote,
      };
      if (form.eventId) payload.eventId = Number(form.eventId);
      if (editingId) await supportCampaignApi.update(editingId, payload);
      else await supportCampaignApi.create(payload);
      resetForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Không lưu được chiến dịch'));
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
      if (selectedCampaign?.id) await loadDonations(selectedCampaign);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const loadDonations = async (campaign) => {
    setSelectedCampaign(campaign);
    try {
      const res = await supportCampaignApi.getDonations(campaign.id);
      setDonations(unwrap(res, []));
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được quyên góp'));
    }
  };

  const startEdit = (campaign) => {
    setEditingId(campaign.id);
    setForm({
      eventId: campaign.eventId || '',
      title: campaign.title || '',
      description: campaign.description || '',
      targetAmount: campaign.targetAmount || '',
      minimumAmount: campaign.minimumAmount || '',
      startDate: campaign.startDate?.slice?.(0, 10) || '',
      endDate: campaign.endDate?.slice?.(0, 10) || '',
      receiveInfo: campaign.receiveInfo || '',
      transparencyNote: campaign.transparencyNote || '',
    });
  };

  const submitReport = async () => {
    if (!selectedCampaign?.id) return;
    await runAction(() => supportCampaignApi.report(selectedCampaign.id, {
      usedAmount: Number(report.usedAmount || 0),
      summary: report.reportSummary,
      expenseDetails: report.expenseDetails,
      attachmentUrl: report.proofImageUrl,
    }));
    setReport({ usedAmount: '', reportSummary: '', expenseDetails: '', proofImageUrl: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="volunteer_activism"
        title="Chiến dịch quyên góp"
        subtitle="Tạo chiến dịch quyên góp độc lập trước; khi đã có kế hoạch triển khai, có thể liên kết chiến dịch với sự kiện sau."
      />

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={submit} className="bg-white rounded-3xl shadow-soft border border-outline p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <h2 className="md:col-span-2 text-title-lg font-bold text-on-surface">{editingId ? 'Sửa chiến dịch' : 'Tạo chiến dịch'}</h2>
        <select className="input-field" value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} disabled={!!editingId}>
          <option value="">Chưa liên kết sự kiện</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title || event.name}</option>)}
        </select>
        <input className="input-field" placeholder="Tên chiến dịch" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input-field" type="number" placeholder="Mục tiêu quyên góp" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
        <input className="input-field" type="number" placeholder="Số tiền tối thiểu" value={form.minimumAmount} onChange={(e) => setForm({ ...form, minimumAmount: e.target.value })} />
        <input className="input-field" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <input className="input-field" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <textarea className="input-field md:col-span-2" placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea className="input-field md:col-span-2" placeholder="Thông tin nhận tiền" value={form.receiveInfo} onChange={(e) => setForm({ ...form, receiveInfo: e.target.value })} />
        <textarea className="input-field md:col-span-2" placeholder="Cam kết minh bạch" value={form.transparencyNote} onChange={(e) => setForm({ ...form, transparencyNote: e.target.value })} />
        <p className="md:col-span-2 text-body-sm text-on-surface-variant">
          Chiến dịch quyên góp là nghiệp vụ tài chính độc lập và có thể được tạo trước. Sự kiện tình nguyện chỉ được liên kết sau nếu chiến dịch cần tổ chức hoạt động triển khai thực địa.
        </p>
        <div className="md:col-span-2 flex gap-3">
          <button className="btn-primary" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu chiến dịch'}</button>
          {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Hủy sửa</button>}
        </div>
      </form>

      {loading ? (
        <div className="bg-white rounded-3xl p-8 text-on-surface-variant">Đang tải...</div>
      ) : campaigns.length === 0 ? (
        <EmptyState icon="volunteer_activism" title="Chưa có chiến dịch" description="Tạo chiến dịch quyên góp độc lập trước, sau đó liên kết sự kiện nếu cần triển khai hoạt động." />
      ) : (
        <div className="bg-white rounded-3xl shadow-soft border border-outline overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-variant/50 text-label-sm uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="p-4">Chiến dịch</th>
                <th className="p-4">Sự kiện</th>
                <th className="p-4">Mục tiêu</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-outline hover:bg-primary-container/10">
                  <td className="p-4 font-bold text-on-surface">{campaign.title}</td>
                  <td className="p-4 text-on-surface-variant">{campaign.eventTitle || campaign.event?.title || 'Chưa liên kết'}</td>
                  <td className="p-4">{formatMoney(campaign.raisedAmount || campaign.currentAmount || 0)} / {formatMoney(campaign.targetAmount)}</td>
                  <td className="p-4">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</td>
                  <td className="p-4"><StatusBadge status={campaign.status} /></td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary !py-2 !px-3" onClick={() => startEdit(campaign)}>Sửa</button>
                      <button className="btn-secondary !py-2 !px-3" onClick={() => loadDonations(campaign)}>Donations</button>
                      <button className="btn-secondary !py-2 !px-3" onClick={() => runAction(() => supportCampaignApi.open(campaign.id))}>Mở</button>
                      <button className="btn-secondary !py-2 !px-3" onClick={() => runAction(() => supportCampaignApi.close(campaign.id))}>Đóng</button>
                      <button className="btn-danger !py-2 !px-3" onClick={() => runAction(() => supportCampaignApi.cancel(campaign.id))}>Hủy</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCampaign && (
        <div className="bg-white rounded-3xl shadow-soft border border-outline p-6 space-y-4">
          <h2 className="text-title-lg font-bold text-on-surface">Quyên góp cho: {selectedCampaign.title}</h2>
          {donations.length === 0 ? <EmptyState icon="payments" title="Chưa có quyên góp" /> : donations.map((donation) => (
            <div key={donation.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-outline rounded-2xl p-4">
              <div>
                <p className="font-bold text-on-surface">{donation.displayName || donation.userName || 'Ẩn danh'} • {formatMoney(donation.amount)}</p>
                <p className="text-body-sm text-on-surface-variant">{formatDateTime(donation.createdAt)} • <StatusBadge status={donation.status} /></p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary !py-2" onClick={() => runAction(() => supportCampaignApi.confirmDonation(donation.id))}>Xác nhận</button>
                <button className="btn-danger !py-2" onClick={() => runAction(() => supportCampaignApi.rejectDonation(donation.id))}>Từ chối</button>
              </div>
            </div>
          ))}

          <div className="border-t border-outline pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input-field" type="number" placeholder="Số tiền đã sử dụng" value={report.usedAmount} onChange={(e) => setReport({ ...report, usedAmount: e.target.value })} />
            <ImageUploader label="Ảnh minh chứng báo cáo" value={report.proofImageUrl} onUpload={(url) => setReport({ ...report, proofImageUrl: url })} />
            <textarea className="input-field md:col-span-2" placeholder="Tóm tắt báo cáo" value={report.reportSummary} onChange={(e) => setReport({ ...report, reportSummary: e.target.value })} />
            <textarea className="input-field md:col-span-2" placeholder="Chi tiết chi phí" value={report.expenseDetails} onChange={(e) => setReport({ ...report, expenseDetails: e.target.value })} />
            <button className="btn-primary md:col-span-2" onClick={submitReport} disabled={busy}>Gửi báo cáo sử dụng tiền</button>
          </div>
        </div>
      )}
    </div>
  );
}
