import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { eventApi, registrationApi, ratingApi, sponsorApi, supportCampaignApi, sponsorshipProposalApi, userApi } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { QRCodeCanvas } from 'qrcode.react';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

function fmtTime(dt) {
  return dt ? new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
}

function translateAction(action) {
  const map = {
    'Event.Create': 'tạo sự kiện',
    'Event.Update': 'cập nhật sự kiện',
    'Event.Approve': 'duyệt sự kiện',
    'Event.Reject': 'từ chối sự kiện',
    'Event.Complete': 'hoàn thành sự kiện',
    'Event.Cancel': 'hủy sự kiện',
    'Event.Resubmit': 'gửi duyệt lại',
    'Event.Uncomplete': 'mở lại sự kiện',
    'Event.Transfer': 'chuyển quyền sở hữu',
    'Event.Delete': 'xóa sự kiện',
    'Registration.Register': 'có volunteer đăng ký',
    'Registration.Confirm': 'xác nhận volunteer',
    'Registration.Cancel': 'hủy đăng ký volunteer',
    'Registration.CheckIn': 'điểm danh',
    'Registration.SelfCheckIn': 'volunteer tự điểm danh',
    'Registration.WalkIn': 'đăng ký tại chỗ',
    'Registration.ManualAttend': 'bổ sung điểm danh',
    'Registration.AdjustHours': 'chỉnh giờ tình nguyện',
    'Registration.Withdraw': 'volunteer rút đăng ký',
    'Registration.RequestCancel': 'volunteer xin hủy',
  };
  return map[action] || action;
}

function toDateTimeLocal(dt) {
  if (!dt) return '';
  const raw = String(dt);
  const date = new Date(raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z');
  if (!Number.isFinite(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function money(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ';
}

const SKILL_VERIFY_STATUS = {
  SelfDeclared: { label: 'Tự khai', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  PendingVerification: { label: 'Chờ xác minh', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Verified: { label: 'Đã xác minh', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rejected: { label: 'Bị từ chối', className: 'bg-red-50 text-red-700 border-red-200' },
};

function SkillVerifyPill({ value }) {
  const status = SKILL_VERIFY_STATUS[value || 'SelfDeclared'] || SKILL_VERIFY_STATUS.SelfDeclared;
  return <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>;
}

export default function ManageEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('registrations');
  const [checkinCode, setCheckinCode] = useState('');
  const [checkinMsg, setCheckinMsg] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [qrRotating, setQrRotating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [shiftModal, setShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '', endTime: '', maxVolunteers: 10, createChannel: true });
  const [shiftSaving, setShiftSaving] = useState(false);
  const [selectedCheckinRegId, setSelectedCheckinRegId] = useState('');
  const [usingGps, setUsingGps] = useState(false);
  const [ratingForms, setRatingForms] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [history, setHistory] = useState([]);
  const [campaignModal, setCampaignModal] = useState(false);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    description: '',
    targetAmount: '',
    minimumAmount: '',
    startDate: '',
    endDate: '',
    receiveInfo: '',
    transparencyNote: '',
    status: 'Draft',
  });
  const [donationModal, setDonationModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [sponsorUsers, setSponsorUsers] = useState([]);
  const [proposalModal, setProposalModal] = useState(false);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    sponsorId: '',
    title: '',
    message: '',
    requestedAmount: '',
    purpose: '',
    sponsorBenefits: '',
    attachmentUrl: '',
  });
  const [receivedProposal, setReceivedProposal] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedSaving, setReceivedSaving] = useState(false);
  const [financialReportModal, setFinancialReportModal] = useState(false);
  const [financialReportTarget, setFinancialReportTarget] = useState(null);
  const [financialReportType, setFinancialReportType] = useState('');
  const [financialReportSaving, setFinancialReportSaving] = useState(false);
  const [financialReportForm, setFinancialReportForm] = useState({
    usedAmount: '',
    summary: '',
    expenseDetails: '',
    attachmentUrl: '',
  });
  const [cancelEventModal, setCancelEventModal] = useState(false);
  const [cancelEventReason, setCancelEventReason] = useState('');
  const [cancelEventSaving, setCancelEventSaving] = useState(false);
  const [walkInModal, setWalkInModal] = useState(false);
  const [walkInSaving, setWalkInSaving] = useState(false);
  const [volunteerOptions, setVolunteerOptions] = useState([]);
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [walkInForm, setWalkInForm] = useState({ volunteerUserId: '', shiftId: '', note: '' });
  const [manualHours, setManualHours] = useState({});
  const [hoursSaving, setHoursSaving] = useState({});

  useEffect(() => {
    Promise.all([
      eventApi.getById(id),
      eventApi.getRegistrations(id),
      eventApi.getShifts(id),
      supportCampaignApi.getByEvent(id).catch(() => ({ data: [] })),
      sponsorshipProposalApi.getByEvent(id).catch(() => ({ data: [] })),
      sponsorshipProposalApi.getSponsorUsers().catch(() => ({ data: [] })),
      eventApi.getEventHistory(id).catch(() => ({ data: [] })),
    ])
      .then(([evRes, regRes, shiftRes, campaignRes, proposalRes, sponsorUserRes, historyRes]) => {
        setEvent(evRes.data);
        setRegistrations(regRes.data || []);
        setShifts(shiftRes.data || []);
        setCampaigns(campaignRes.data || []);
        setProposals(proposalRes.data || []);
        setSponsorUsers(sponsorUserRes.data || []);
        setHistory(historyRes.data || []);
      })
      .catch(() => navigate('/my-events'))
      .finally(() => setLoading(false));
  }, [id]);

  const reloadRegistrations = async () => {
    const response = await eventApi.getRegistrations(id);
    setRegistrations(response.data || []);
  };

  const loadVolunteerOptions = async (keyword = '') => {
    const response = await userApi.getVolunteerLookup({ keyword, take: 30 });
    setVolunteerOptions(response.data || []);
  };

  useEffect(() => {
    if (!walkInModal) return;
    const timeoutId = setTimeout(() => {
      loadVolunteerOptions(volunteerSearch).catch(() => {});
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [walkInModal, volunteerSearch]);

  const handleConfirm = async (regId) => {
    try {
      await registrationApi.confirm(id, regId);
      setRegistrations((prev) => prev.map((r) => (r.id === regId ? { ...r, status: 'Confirmed' } : r)));
    } catch (err) {
      alert(err.response?.data?.message || 'Thất bại');
    }
  };

  const handleCancel = async (regId) => {
    if (!confirm('Hủy đăng ký này?')) return;
    try {
      await registrationApi.cancel(id, regId);
      setRegistrations((prev) => prev.map((r) => (r.id === regId ? { ...r, status: 'Cancelled', cancelRequested: false } : r)));
    } catch (err) {
      alert(err.response?.data?.message || 'Thất bại');
    }
  };

  const openWalkInModal = async () => {
    setVolunteerSearch('');
    setWalkInForm({ volunteerUserId: '', shiftId: '', note: '' });
    setWalkInModal(true);
    try {
      await loadVolunteerOptions('');
    } catch (err) {
      alert(err.response?.data?.message || 'Không tải được danh sách volunteer');
    }
  };

  const submitWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInForm.volunteerUserId) {
      alert('Vui lòng chọn volunteer');
      return;
    }

    if (shifts.length > 0 && !walkInForm.shiftId) {
      alert('Vui lòng chọn ca cho walk-in');
      return;
    }

    setWalkInSaving(true);
    try {
      await registrationApi.walkIn(id, {
        volunteerUserId: Number(walkInForm.volunteerUserId),
        shiftId: walkInForm.shiftId ? Number(walkInForm.shiftId) : null,
        note: walkInForm.note.trim(),
      });
      await reloadRegistrations();
      setWalkInModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Đăng ký tại chỗ thất bại');
    } finally {
      setWalkInSaving(false);
    }
  };

  const submitManualAttend = async (registration) => {
    const hours = manualHours[registration.id] === '' || manualHours[registration.id] == null
      ? undefined
      : Number(manualHours[registration.id]);

    setHoursSaving((prev) => ({ ...prev, [`attend-${registration.id}`]: true }));
    try {
      await registrationApi.manualAttend(id, registration.id, hours);
      await reloadRegistrations();
    } catch (err) {
      alert(err.response?.data?.message || 'Bổ sung điểm danh thất bại');
    } finally {
      setHoursSaving((prev) => ({ ...prev, [`attend-${registration.id}`]: false }));
    }
  };

  const submitCheckOut = async (registration) => {
    setHoursSaving((prev) => ({ ...prev, [`checkout-${registration.id}`]: true }));
    try {
      await registrationApi.checkOut(id, registration.id);
      await reloadRegistrations();
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out thất bại');
    } finally {
      setHoursSaving((prev) => ({ ...prev, [`checkout-${registration.id}`]: false }));
    }
  };

  const saveAdjustedHours = async (registration) => {
    const hours = Number(manualHours[registration.id]);
    if (!Number.isFinite(hours) || hours < 0) {
      alert('Số giờ phải lớn hơn hoặc bằng 0');
      return;
    }

    setHoursSaving((prev) => ({ ...prev, [`hours-${registration.id}`]: true }));
    try {
      await registrationApi.adjustHours(id, registration.id, hours);
      await reloadRegistrations();
    } catch (err) {
      alert(err.response?.data?.message || 'Điều chỉnh giờ thất bại');
    } finally {
      setHoursSaving((prev) => ({ ...prev, [`hours-${registration.id}`]: false }));
    }
  };

  const submitCancelEvent = async (e) => {
    e.preventDefault();
    setCancelEventSaving(true);
    try {
      const response = await eventApi.cancel(id, cancelEventReason.trim());
      setEvent((prev) => ({ ...prev, ...response.data, status: 'Cancelled' }));
      setCancelEventModal(false);
      navigate('/my-events');
    } catch (err) {
      alert(err.response?.data?.message || 'Hủy sự kiện thất bại');
    } finally {
      setCancelEventSaving(false);
    }
  };

  const confirmMinimumParticipantsWarning = (actionText) => {
    const minimum = Number(event?.minParticipants) || 1;
    const confirmedCount = registrations.filter((r) => r.status === 'Confirmed').length;
    if (confirmedCount >= minimum) return true;

    return confirm(
      `Sự kiện hiện mới có ${confirmedCount}/${minimum} tình nguyện viên đã xác nhận. ` +
      `Bạn vẫn muốn ${actionText}?`
    );
  };

  const handleComplete = async () => {
    if (!confirmMinimumParticipantsWarning('hoàn thành sự kiện')) return;
    if (!confirm('Đánh dấu sự kiện này là hoàn thành? Hệ thống sẽ phát chứng chỉ cho tình nguyện viên đã điểm danh.')) return;
    setCompleting(true);
    try {
      const r = await eventApi.complete(id);
      setEvent((prev) => ({ ...prev, ...r.data, status: 'Completed' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Đánh dấu hoàn thành thất bại');
    } finally {
      setCompleting(false);
    }
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!selectedCheckinRegId || !checkinCode.trim()) return;
    if (!confirmMinimumParticipantsWarning('tiếp tục điểm danh')) return;

    setCheckinLoading(true);
    setCheckinMsg('');

    try {
      await registrationApi.checkin(id, selectedCheckinRegId, { qrCode: checkinCode.trim() });
      setCheckinMsg('success:Điểm danh thành công!');
      setCheckinCode('');
      setSelectedCheckinRegId('');
      const r = await eventApi.getRegistrations(id);
      setRegistrations(r.data || []);
    } catch (err) {
      setCheckinMsg(`error:${err.response?.data?.message || 'Mã không hợp lệ'}`);
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleGpsCheckin = async () => {
    if (!selectedCheckinRegId) return;
    if (!confirmMinimumParticipantsWarning('tiếp tục điểm danh GPS')) return;
    if (!navigator.geolocation) {
      setCheckinMsg('error:Trình duyệt không hỗ trợ GPS');
      return;
    }

    setUsingGps(true);
    setCheckinMsg('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await registrationApi.checkin(id, selectedCheckinRegId, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setCheckinMsg('success:Điểm danh GPS thành công!');
          setSelectedCheckinRegId('');
          const r = await eventApi.getRegistrations(id);
          setRegistrations(r.data || []);
        } catch (err) {
          setCheckinMsg(`error:${err.response?.data?.message || 'GPS không hợp lệ'}`);
        } finally {
          setUsingGps(false);
        }
      },
      () => {
        setCheckinMsg('error:Không lấy được vị trí hiện tại');
        setUsingGps(false);
      },
      { timeout: 8000, maximumAge: 30000 }
    );
  };

  const rotateEventQr = async () => {
    if (!confirm('Tạo mã QR mới? Mã QR cũ sẽ không còn dùng để điểm danh.')) return;
    setQrRotating(true);
    try {
      const response = await eventApi.rotateQr(id);
      setEvent((prev) => ({ ...prev, qrCode: response.data?.qrCode || prev?.qrCode }));
      setCheckinCode('');
      setCheckinMsg('success:Đã tạo mã QR mới cho phiên điểm danh.');
    } catch (err) {
      alert(err.response?.data?.message || 'Không tạo được mã QR mới');
    } finally {
      setQrRotating(false);
    }
  };

  const submitVolunteerRating = async (registration) => {
    const form = ratingForms[registration.id] || { score: 5, comment: '' };
    try {
      await ratingApi.create(id, {
        rateeId: registration.userId,
        score: Number(form.score) || 5,
        comment: form.comment || '',
      });
      setRatingForms((prev) => ({ ...prev, [registration.id]: { ...form, done: true } }));
    } catch (err) {
      alert(err.response?.data?.message || 'Đánh giá thất bại');
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    const startTime = new Date(shiftForm.startTime);
    const endTime = new Date(shiftForm.endTime);
    const maxVolunteers = Number(shiftForm.maxVolunteers);

    if (!shiftForm.name.trim()) {
      alert('Vui lòng nhập tên ca.');
      return;
    }
    if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime())) {
      alert('Vui lòng nhập thời gian bắt đầu và kết thúc.');
      return;
    }
    if (endTime <= startTime) {
      alert('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    if (event?.startDate && event?.endDate) {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      if (startTime < eventStart || endTime > eventEnd) {
        alert(`Ca làm việc phải nằm trong thời gian sự kiện: ${eventStart.toLocaleString('vi-VN')} - ${eventEnd.toLocaleString('vi-VN')}.`);
        return;
      }
    }
    if (!Number.isInteger(maxVolunteers) || maxVolunteers < 1 || maxVolunteers > 1000) {
      alert('Số lượng tối đa phải từ 1 đến 1000.');
      return;
    }

    setShiftSaving(true);

    try {
      await eventApi.createShift(id, {
        ...shiftForm,
        name: shiftForm.name.trim(),
        eventId: parseInt(id),
        maxVolunteers,
        createChannel: Boolean(shiftForm.createChannel),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      const r = await eventApi.getShifts(id);
      setShifts(r.data || []);
      setShiftModal(false);
      setShiftForm({ name: '', startTime: '', endTime: '', maxVolunteers: 10, createChannel: true });
    } catch (err) {
      alert(err.response?.data?.message || 'Tạo ca thất bại');
    } finally {
      setShiftSaving(false);
    }
  };

  const reloadCampaigns = async () => {
    const r = await supportCampaignApi.getByEvent(id);
    setCampaigns(r.data || []);
  };

  const openCreateCampaign = () => {
    const start = event?.startDate ? new Date(event.startDate) : new Date();
    const end = event?.endDate ? new Date(event.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setCampaignForm({
      title: '',
      description: '',
      targetAmount: '',
      minimumAmount: '',
      startDate: start.toISOString().slice(0, 16),
      endDate: end.toISOString().slice(0, 16),
      receiveInfo: '',
      transparencyNote: '',
      status: 'Draft',
    });
    setCampaignModal(true);
  };

  const submitCampaign = async (e) => {
    e.preventDefault();
    const targetAmount = Number(campaignForm.targetAmount);
    const minimumAmount = campaignForm.minimumAmount === '' ? null : Number(campaignForm.minimumAmount);

    if (!campaignForm.title.trim() || !campaignForm.description.trim()) {
      alert('Vui lòng nhập tiêu đề và mô tả đợt kêu gọi.');
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      alert('Mục tiêu phải lớn hơn 0.');
      return;
    }
    if (minimumAmount != null && (!Number.isFinite(minimumAmount) || minimumAmount < 0 || minimumAmount > targetAmount)) {
      alert('Số tiền tối thiểu phải nằm trong khoảng 0 đến mục tiêu.');
      return;
    }

    setCampaignSaving(true);
    try {
      await supportCampaignApi.create(id, {
        ...campaignForm,
        title: campaignForm.title.trim(),
        description: campaignForm.description.trim(),
        targetAmount,
        minimumAmount,
        startDate: new Date(campaignForm.startDate).toISOString(),
        endDate: new Date(campaignForm.endDate).toISOString(),
      });
      await reloadCampaigns();
      setCampaignModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Tạo đợt kêu gọi thất bại');
    } finally {
      setCampaignSaving(false);
    }
  };

  const changeCampaignStatus = async (campaign, action) => {
    try {
      if (action === 'open') await supportCampaignApi.open(campaign.id);
      if (action === 'close') await supportCampaignApi.close(campaign.id);
      if (action === 'cancel') await supportCampaignApi.cancel(campaign.id);
      await reloadCampaigns();
    } catch (err) {
      alert(err.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const openDonations = async (campaign) => {
    setSelectedCampaign(campaign);
    setDonationModal(true);
    setDonationsLoading(true);
    try {
      const r = await supportCampaignApi.getDonations(campaign.id);
      setDonations(r.data?.items || r.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Không tải được danh sách ủng hộ');
      setDonationModal(false);
    } finally {
      setDonationsLoading(false);
    }
  };

  const updateDonationStatus = async (donation, action) => {
    try {
      if (action === 'confirm') await supportCampaignApi.confirmDonation(donation.id);
      if (action === 'reject') await supportCampaignApi.rejectDonation(donation.id, { reason: 'Organizer rejected' });
      const r = await supportCampaignApi.getDonations(selectedCampaign.id);
      setDonations(r.data?.items || r.data || []);
      await reloadCampaigns();
    } catch (err) {
      alert(err.response?.data?.message || 'Cập nhật donation thất bại');
    }
  };

  const reloadProposals = async () => {
    const r = await sponsorshipProposalApi.getByEvent(id);
    setProposals(r.data || []);
  };

  const openInviteSponsor = () => {
    setProposalForm({
      sponsorId: '',
      title: '',
      message: '',
      requestedAmount: '',
      purpose: '',
      sponsorBenefits: '',
      attachmentUrl: '',
    });
    setProposalModal(true);
  };

  const submitSponsorInvite = async (e) => {
    e.preventDefault();
    const requestedAmount = Number(proposalForm.requestedAmount);
    if (!proposalForm.sponsorId || !proposalForm.title.trim() || !proposalForm.message.trim()) {
      alert('Vui lòng nhập sponsor, tiêu đề và nội dung lời mời.');
      return;
    }
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      alert('Số tiền mong muốn phải lớn hơn 0.');
      return;
    }

    setProposalSaving(true);
    try {
      await sponsorshipProposalApi.organizerRequest(id, {
        ...proposalForm,
        sponsorId: Number(proposalForm.sponsorId),
        requestedAmount,
      });
      await reloadProposals();
      setProposalModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi lời mời tài trợ thất bại');
    } finally {
      setProposalSaving(false);
    }
  };

  const updateProposalStatus = async (proposal, action) => {
    try {
      if (action === 'accept') await sponsorshipProposalApi.accept(proposal.id, { responseMessage: 'Organizer accepted' });
      if (action === 'reject') await sponsorshipProposalApi.reject(proposal.id, { responseMessage: 'Organizer rejected' });
      if (action === 'received') {
        setReceivedProposal(proposal);
        setReceivedAmount(String(proposal.actualReceivedAmount ?? proposal.amount ?? proposal.offeredAmount ?? proposal.requestedAmount ?? ''));
        return;
      }
      if (action === 'cancel') await sponsorshipProposalApi.cancel(proposal.id);
      await reloadProposals();
    } catch (err) {
      alert(err.response?.data?.message || 'Cập nhật proposal thất bại');
    }
  };

  const submitReceivedProposal = async (e) => {
    e.preventDefault();
    if (!receivedProposal) return;

    const actualReceivedAmount = Number(receivedAmount);
    if (!Number.isFinite(actualReceivedAmount) || actualReceivedAmount <= 0) {
      alert('Số tiền thực nhận phải lớn hơn 0.');
      return;
    }

    setReceivedSaving(true);
    try {
      await sponsorshipProposalApi.received(receivedProposal.id, { actualReceivedAmount });
      await reloadProposals();
      setReceivedProposal(null);
      setReceivedAmount('');
    } catch (err) {
      alert(err.response?.data?.message || 'Cập nhật proposal thất bại');
    } finally {
      setReceivedSaving(false);
    }
  };

  const openFinancialReport = (type, target) => {
    setFinancialReportType(type);
    setFinancialReportTarget(target);
    setFinancialReportForm({
      usedAmount: target.usedAmount != null ? String(target.usedAmount) : '',
      summary: target.reportSummary || '',
      expenseDetails: target.expenseDetails || '',
      attachmentUrl: target.reportAttachmentUrl || '',
    });
    setFinancialReportModal(true);
  };

  const submitFinancialReport = async (e) => {
    e.preventDefault();
    const usedAmount = Number(financialReportForm.usedAmount);
    if (!Number.isFinite(usedAmount) || usedAmount < 0) {
      alert('Số tiền đã sử dụng phải từ 0 trở lên.');
      return;
    }
    if (!financialReportForm.summary.trim()) {
      alert('Vui lòng nhập tóm tắt báo cáo.');
      return;
    }

    setFinancialReportSaving(true);
    try {
      const payload = {
        usedAmount,
        summary: financialReportForm.summary.trim(),
        expenseDetails: financialReportForm.expenseDetails.trim(),
        attachmentUrl: financialReportForm.attachmentUrl.trim(),
      };
      if (financialReportType === 'campaign') {
        await supportCampaignApi.report(financialReportTarget.id, payload);
        await reloadCampaigns();
      } else {
        await sponsorshipProposalApi.report(financialReportTarget.id, payload);
        await reloadProposals();
      }
      setFinancialReportModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Lưu báo cáo thất bại');
    } finally {
      setFinancialReportSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const pending = registrations.filter((r) => r.status === 'Pending');
  const confirmed = registrations.filter((r) => r.status === 'Confirmed');
  const cancelled = registrations.filter((r) => r.status === 'Cancelled');
  const attended = registrations.filter((r) => r.isAttended);
  const totalHours = attended.reduce((sum, r) => sum + (Number(r.volunteerHours) || 0), 0);
  const capacity = event?.maxParticipants || 0;
  const minimumParticipants = event?.minParticipants || 1;
  const hasMinimumParticipants = confirmed.length >= minimumParticipants;
  const canCompleteEvent = event?.status === 'Approved' && hasMinimumParticipants;
  const fillRate = capacity > 0 ? Math.round((registrations.length / capacity) * 100) : 0;
  const attendanceRate = confirmed.length > 0 ? Math.round((attended.length / confirmed.length) * 100) : 0;
  const checkinParts = checkinMsg.split(':');
  const checkinType = checkinParts[0];
  const checkinText = checkinParts.slice(1).join(':');
  const campaignTarget = campaigns.reduce((sum, campaign) => sum + (Number(campaign.targetAmount) || 0), 0);
  const campaignConfirmed = campaigns.reduce((sum, campaign) => sum + (Number(campaign.confirmedAmount) || 0), 0);
  const campaignPending = campaigns.reduce((sum, campaign) => sum + (Number(campaign.pendingAmount) || 0), 0);
  const campaignProgress = campaignTarget > 0 ? Math.min(100, Math.round((campaignConfirmed / campaignTarget) * 100)) : 0;
  const proposalPendingCount = proposals.filter((proposal) => proposal.status === 'Pending').length;
  const proposalAcceptedCount = proposals.filter((proposal) => proposal.status === 'Accepted').length;
  const proposalReceived = proposals.filter((proposal) => proposal.status === 'Received' || proposal.status === 'Reported');
  const proposalReceivedAmount = proposalReceived.reduce((sum, proposal) => sum + (Number(proposal.actualReceivedAmount ?? proposal.amount) || 0), 0);
  const proposalActiveTarget = proposals
    .filter((proposal) => proposal.status !== 'Rejected' && proposal.status !== 'Cancelled')
    .reduce((sum, proposal) => sum + (Number(proposal.amount) || 0), 0);
  const financialReceived = campaignConfirmed + proposalReceivedAmount;
  const financialTarget = campaignTarget + proposalActiveTarget;
  const financialProgress = financialTarget > 0 ? Math.min(100, Math.round((financialReceived / financialTarget) * 100)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/my-events')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{event?.title}</h1>
          <p className="text-sm text-gray-500">{fmt(event?.startDate)} · {event?.location}</p>
        </div>
        {event?.channel?.id && (
          <Link to={`/channels/${event.channel.id}`} className="btn-secondary btn-sm flex items-center justify-center gap-1 shrink-0 basis-full sm:basis-auto">
            <i className="fa-solid fa-comments" /> Kênh trao đổi
          </Link>
        )}
        {event?.status === 'Approved' && (
          <button onClick={handleComplete} disabled={completing || !canCompleteEvent} className="btn-primary btn-sm flex items-center justify-center gap-1 shrink-0 basis-full sm:basis-auto disabled:opacity-60 disabled:cursor-not-allowed" title={!hasMinimumParticipants ? 'Can du so tinh nguyen vien toi thieu truoc khi hoan thanh' : undefined}>
            {completing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="fa-solid fa-flag-checkered" />}
            Hoàn thành
          </button>
        )}
        {(event?.status === 'Pending' || event?.status === 'Approved') && (
          <button type="button" onClick={() => setCancelEventModal(true)} className="btn-danger btn-sm flex items-center justify-center gap-1 shrink-0 basis-full sm:basis-auto">
            <i className="fa-solid fa-ban" /> Hủy sự kiện
          </button>
        )}
        <StatusBadge status={event?.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Chờ xác nhận', value: pending.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Đã xác nhận', value: confirmed.length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Đã điểm danh', value: attended.length, color: 'text-primary-600', bg: 'bg-primary-50' },
        ].map((s) => (
          <div key={s.label} className={`card p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-lg border p-4 ${hasMinimumParticipants ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center ${hasMinimumParticipants ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              <i className={`fa-solid ${hasMinimumParticipants ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${hasMinimumParticipants ? 'text-green-800' : 'text-amber-800'}`}>
                {hasMinimumParticipants ? 'Đã đủ lực lượng tối thiểu' : 'Chưa đủ số tình nguyện viên tối thiểu'}
              </p>
              <p className={`mt-1 text-sm ${hasMinimumParticipants ? 'text-green-700' : 'text-amber-700'}`}>
                Đã xác nhận {confirmed.length}/{minimumParticipants} người. Sự kiện vẫn có thể triển khai, nhưng hệ thống sẽ cảnh báo khi điểm danh hoặc hoàn thành nếu chưa đủ tối thiểu.
              </p>
            </div>
          </div>
          <Link to={`/events/${id}/edit`} className="btn-secondary btn-sm text-center shrink-0">
            Điều chỉnh số lượng
          </Link>
        </div>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'registrations', label: 'Danh sách đăng ký', icon: 'fa-list' },
          { key: 'shifts', label: 'Ca làm việc', icon: 'fa-clock' },
          { key: 'checkin', label: 'Điểm danh', icon: 'fa-qrcode' },
          { key: 'campaigns', label: 'Kêu gọi ủng hộ', icon: 'fa-hand-holding-heart' },
          { key: 'corporate', label: 'Tài trợ doanh nghiệp', icon: 'fa-handshake' },
          { key: 'report', label: 'Báo cáo', icon: 'fa-chart-column' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={`fa-solid ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'registrations' && (
        <div className="space-y-3">
          {shifts.length > 0 && registrations.some((r) => r.status !== 'Cancelled' && !r.shiftId) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" />
                Có {registrations.filter((r) => r.status !== 'Cancelled' && !r.shiftId).length} đăng ký chưa chọn ca cụ thể
              </p>
              <p className="mt-1">
                Sự kiện đã có ca làm việc. Bạn nên liên hệ những volunteer này để gán họ vào ca, hoặc xác định trước họ làm cả ngày.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={openWalkInModal} className="btn-secondary btn-sm flex items-center gap-2">
              <i className="fa-solid fa-person-walking" /> Đăng ký tại chỗ
            </button>
          </div>

          {registrations.length === 0 ? (
            <div className="card p-12 text-center">
              <i className="fa-solid fa-users text-4xl text-gray-300 mb-3 block" />
              <p className="text-gray-500">Chưa có tình nguyện viên nào đăng ký</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-4 py-3">Tình nguyện viên</th>
                    <th className="text-left px-4 py-3">Ngày đăng ký</th>
                    <th className="text-left px-4 py-3">Trạng thái</th>
                    <th className="text-left px-4 py-3">Điểm danh</th>
                    <th className="text-left px-4 py-3">Giờ ghi nhận</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registrations.map((r) => (
                    <tr key={r.id} className="odd:bg-gray-50/50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.user?.name || r.user?.userName || `User #${r.userId}`}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <a href={`/profile/${r.userId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">Xem hồ sơ</a>
                          {r.cancelRequested && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Xin hủy{r.cancelReason ? `: ${r.cancelReason}` : ''}</span>}
                        </div>
                        {r.note && <p className="text-xs text-gray-400 italic mt-0.5">"{r.note}"</p>}
                        {r.shift?.name && <p className="text-xs text-primary-600 mt-0.5">Ca: {r.shift.name}</p>}
                        {r.volunteerSkills?.length > 0 && (
                          <div className="mt-2 flex max-w-md flex-wrap gap-1.5">
                            {r.volunteerSkills.map((skill) => (
                              <span key={`${r.id}-${skill.skillId}`} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
                                <span className="font-medium">{skill.skillName || `Skill #${skill.skillId}`}</span>
                                <SkillVerifyPill value={skill.verificationStatus} />
                              </span>
                            ))}
                          </div>
                        )}
                        {r.cancelRequested && r.status !== 'Cancelled' && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            <i className="fa-solid fa-hourglass-half" /> Đang chờ hủy
                          </div>
                        )}
                        {r.cancelRequested && r.cancelReason && r.status !== 'Cancelled' && (
                          <p className="text-xs text-amber-700 mt-1">Lý do: {r.cancelReason}</p>
                        )}
                        {r.isAttended && event?.status === 'Completed' && (
                          <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                            {ratingForms[r.id]?.done ? (
                              <p className="text-xs text-green-700">Đã đánh giá tình nguyện viên</p>
                            ) : (
                              <div className="flex flex-col gap-1 sm:flex-row">
                                <select
                                  value={ratingForms[r.id]?.score || 5}
                                  onChange={(e) => setRatingForms((prev) => ({ ...prev, [r.id]: { ...(prev[r.id] || {}), score: e.target.value } }))}
                                  className="input-field text-xs sm:w-24"
                                >
                                  {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} sao</option>)}
                                </select>
                                <input
                                  value={ratingForms[r.id]?.comment || ''}
                                  onChange={(e) => setRatingForms((prev) => ({ ...prev, [r.id]: { ...(prev[r.id] || {}), comment: e.target.value } }))}
                                  className="input-field text-xs"
                                  placeholder="Nhận xét..."
                                />
                                <button onClick={() => submitVolunteerRating(r)} className="btn-primary btn-sm text-xs">Đánh giá</button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmt(r.registeredAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        {r.isAttended ? (
                          <span className="text-xs bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 rounded-full font-medium">✓ {r.volunteerHours}h</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.isAttended ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {!r.checkedOutAt && (
                              <button
                                type="button"
                                onClick={() => submitCheckOut(r)}
                                disabled={!!hoursSaving[`checkout-${r.id}`]}
                                className="btn-primary btn-sm text-xs"
                              >
                                {hoursSaving[`checkout-${r.id}`] ? 'Đang lưu...' : 'Check-out'}
                              </button>
                            )}
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={manualHours[r.id] ?? r.volunteerHours ?? 0}
                              onChange={(e) => setManualHours((prev) => ({ ...prev, [r.id]: e.target.value }))}
                              className="input-field w-24"
                            />
                            <button
                              type="button"
                              onClick={() => saveAdjustedHours(r)}
                              disabled={!!hoursSaving[`hours-${r.id}`]}
                              className="btn-secondary btn-sm text-xs"
                            >
                              {hoursSaving[`hours-${r.id}`] ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Chưa có</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {r.status === 'Pending' && (
                            <>
                              <button onClick={() => handleConfirm(r.id)} className="btn-primary btn-sm text-xs">
                                <i className="fa-solid fa-check mr-1" /> Xác nhận
                              </button>
                              <button onClick={() => handleCancel(r.id)} className="btn-danger btn-sm text-xs">
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </>
                          )}
                          {r.status === 'Confirmed' && !r.isAttended && (
                            <>
                              <button
                                type="button"
                                onClick={() => submitManualAttend(r)}
                                disabled={!!hoursSaving[`attend-${r.id}`]}
                                className="btn-primary btn-sm text-xs"
                              >
                                <i className="fa-solid fa-user-check mr-1" /> {hoursSaving[`attend-${r.id}`] ? 'Đang lưu...' : 'Bổ sung điểm danh'}
                              </button>
                              <button onClick={() => handleCancel(r.id)} className="btn-secondary btn-sm text-xs">
                                <i className="fa-solid fa-xmark mr-1" /> Hủy
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'shifts' && (
        <div className="space-y-4">
          {(() => {
            const totalShiftCapacity = shifts.reduce((sum, s) => sum + (s.maxVolunteers || 0), 0);
            const minNeeded = event?.minParticipants || 0;
            if (shifts.length > 0 && minNeeded > 0 && totalShiftCapacity < minNeeded) {
              return (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <i className="fa-solid fa-triangle-exclamation mr-2" />
                  Tổng sức chứa các ca ({totalShiftCapacity} chỗ) đang nhỏ hơn số tình nguyện viên tối thiểu của sự kiện ({minNeeded}). Cân nhắc tăng MaxVolunteers hoặc thêm ca để đủ chỗ.
                </div>
              );
            }
            return null;
          })()}

          <div className="flex justify-end">
            <button onClick={() => setShiftModal(true)} className="btn-primary flex items-center gap-2">
              <i className="fa-solid fa-plus" /> Thêm ca
            </button>
          </div>

          {shifts.length === 0 ? (
            <div className="card p-12 text-center">
              <i className="fa-solid fa-clock text-4xl text-gray-300 mb-3 block" />
              <p className="text-gray-500">Chưa có ca làm việc nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shifts.map((s) => (
                <div key={s.id} className="card p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">{s.name}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-calendar w-4 text-primary-500" />
                      <span>{fmt(s.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-clock w-4 text-primary-500" />
                      <span>{fmtTime(s.startTime)} - {fmtTime(s.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-users w-4 text-primary-500" />
                      <span>{s.currentVolunteers || 0} / {s.maxVolunteers} tình nguyện viên</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((s.currentVolunteers || 0) / s.maxVolunteers) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Modal isOpen={shiftModal} onClose={() => setShiftModal(false)} title="Thêm ca làm việc" size="md">
            <form onSubmit={handleCreateShift} className="space-y-4">
              {event?.startDate && event?.endDate && (
                <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-700">
                  Ca phải nằm trong thời gian sự kiện: {new Date(event.startDate).toLocaleString('vi-VN')} - {new Date(event.endDate).toLocaleString('vi-VN')}.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên ca *</label>
                <input type="text" value={shiftForm.name} onInput={(e) => setShiftForm((f) => ({ ...f, name: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, name: e.target.value }))} required className="input-field" placeholder="VD: Ca sáng" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bắt đầu *</label>
                  <input type="datetime-local" min={toDateTimeLocal(event?.startDate)} max={toDateTimeLocal(event?.endDate)} value={shiftForm.startTime} onInput={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))} required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kết thúc *</label>
                  <input type="datetime-local" min={shiftForm.startTime || toDateTimeLocal(event?.startDate)} max={toDateTimeLocal(event?.endDate)} value={shiftForm.endTime} onInput={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))} required className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tối đa *</label>
                <input type="number" min={1} value={shiftForm.maxVolunteers} onInput={(e) => setShiftForm((f) => ({ ...f, maxVolunteers: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, maxVolunteers: e.target.value }))} required className="input-field" />
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-primary-100 bg-primary-50/60 p-3">
                <input
                  type="checkbox"
                  checked={Boolean(shiftForm.createChannel)}
                  onChange={(e) => setShiftForm((f) => ({ ...f, createChannel: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Tạo kênh riêng cho ca này</span>
                  <span className="block text-xs text-gray-500">Volunteer được xác nhận trong ca sẽ có không gian trao đổi riêng, tách khỏi kênh chung của sự kiện.</span>
                </span>
              </label>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShiftModal(false)} className="btn-secondary">Hủy</button>
                <button type="submit" disabled={shiftSaving} className="btn-primary flex items-center gap-2">
                  {shiftSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Tạo ca
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {tab === 'checkin' && (
        <div className="max-w-md mx-auto space-y-6">
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-qrcode text-primary-600 text-2xl" />
              </div>
              <h2 className="font-semibold text-gray-900">Điểm danh tình nguyện viên</h2>
              <p className="text-sm text-gray-500 mt-1">Chọn người đã được xác nhận, rồi nhập mã QR của sự kiện để ghi nhận tham gia</p>
            </div>

            <form onSubmit={handleCheckin} className="space-y-3">
              {event?.qrCode && (
                <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary-600">Mã QR sự kiện hiện tại</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-primary-700">{event.qrCode}</p>
                  <button type="button" onClick={() => setQrModal(true)} className="btn-secondary btn-sm mt-3 inline-flex items-center gap-2">
                    <i className="fa-solid fa-expand" /> Hiển thị QR cho volunteer quét
                  </button>
                </div>
              )}

              <input type="text" value={checkinCode} onChange={(e) => setCheckinCode(e.target.value)} placeholder="Nhập mã QR của sự kiện..." className="input-field text-center font-mono text-lg tracking-widest" autoFocus />

              <select value={selectedCheckinRegId} onChange={(e) => setSelectedCheckinRegId(e.target.value)} className="input-field">
                <option value="">Chọn tình nguyện viên cần điểm danh</option>
                {confirmed.filter((r) => !r.isAttended).map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.user?.name || r.user?.userName || `User #${r.userId}`)}{r.shift ? ` · Ca: ${r.shift.name} (${fmtTime(r.shift.startTime)} - ${fmtTime(r.shift.endTime)})` : ' · Không có ca'}
                  </option>
                ))}
              </select>

              <button type="submit" disabled={checkinLoading || !checkinCode.trim() || !selectedCheckinRegId} className="btn-primary w-full flex items-center justify-center gap-2">
                {checkinLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check-circle" /> Xác nhận điểm danh
                  </>
                )}
              </button>
              <button type="button" onClick={handleGpsCheckin} disabled={usingGps || !selectedCheckinRegId} className="btn-secondary w-full flex items-center justify-center gap-2">
                {usingGps ? <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /> : <i className="fa-solid fa-location-crosshairs" />}
                Điểm danh bằng GPS
              </button>
            </form>

            {checkinMsg && (
              <div className={`p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2 ${checkinType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <i className={`fa-solid ${checkinType === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`} />
                {checkinText}
              </div>
            )}

            {confirmed.filter((r) => !r.isAttended).length === 0 && (
              <p className="text-xs text-center text-gray-500">
                Hiện không còn tình nguyện viên nào ở trạng thái đã xác nhận và chưa điểm danh.
              </p>
            )}
          </div>

          <Modal isOpen={qrModal} onClose={() => setQrModal(false)} title="QR điểm danh sự kiện" size="md">
            <div className="space-y-4 text-center">
              <div className="inline-flex rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                {event?.qrCode && (
                  <QRCodeCanvas value={event.qrCode} size={240} includeMargin level="M" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Mã dự phòng</p>
                <p className="mt-1 font-mono text-xl font-bold tracking-wider text-primary-700">{event?.qrCode}</p>
              </div>
              <p className="text-sm text-gray-500">
                Volunteer đăng nhập tài khoản của mình, mở đăng ký sự kiện và quét mã này để tự điểm danh.
              </p>
              <button type="button" onClick={rotateEventQr} disabled={qrRotating} className="btn-secondary inline-flex items-center justify-center gap-2">
                {qrRotating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" /> : <i className="fa-solid fa-rotate" />}
                Tạo QR mới
              </button>
            </div>
          </Modal>

          <Modal isOpen={walkInModal} onClose={() => setWalkInModal(false)} title="Đăng ký tại chỗ" size="md">
            <form onSubmit={submitWalkIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tìm volunteer</label>
                <input
                  value={volunteerSearch}
                  onChange={(e) => setVolunteerSearch(e.target.value)}
                  className="input-field"
                  placeholder="Nhập tên, username hoặc email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volunteer *</label>
                <select
                  value={walkInForm.volunteerUserId}
                  onChange={(e) => setWalkInForm((prev) => ({ ...prev, volunteerUserId: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">-- Chọn volunteer --</option>
                  {volunteerOptions.map((volunteer) => (
                    <option key={volunteer.id} value={volunteer.id}>
                      {(volunteer.name || volunteer.userName)}{volunteer.profile?.kycStatus === 'Verified' ? ' · KYC' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {shifts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ca làm việc *</label>
                  <select
                    value={walkInForm.shiftId}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, shiftId: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="">-- Chọn ca --</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.title || shift.name || `Ca #${shift.id}`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Sự kiện có ca làm việc nên walk-in phải gắn với ca cụ thể để tính giờ đúng.</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={3}
                  value={walkInForm.note}
                  onChange={(e) => setWalkInForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="input-field resize-none"
                  placeholder="Ví dụ: volunteer đến trực tiếp tại điểm tập trung"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setWalkInModal(false)} className="btn-secondary">Hủy</button>
                <button type="submit" disabled={walkInSaving} className="btn-primary flex items-center gap-2">
                  {walkInSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Xác nhận walk-in
                </button>
              </div>
            </form>
          </Modal>

          {attended.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Đã điểm danh ({attended.length})</h3>
              <div className="space-y-2">
                {attended.slice(0, 10).map((r) => (
                  <div key={r.id} className="card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-check text-primary-600 text-xs" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.user?.name || r.user?.userName || `User #${r.userId}`}</p>
                      {r.shift?.name && <p className="text-xs text-primary-600 mt-0.5">Ca: {r.shift.name}</p>}
                    </div>
                    <span className="text-xs text-primary-600 font-medium">{r.volunteerHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={cancelEventModal} onClose={() => setCancelEventModal(false)} title="Hủy sự kiện" size="md">
        <form onSubmit={submitCancelEvent} className="space-y-4">
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <i className="fa-solid fa-circle-exclamation mr-1" />
            Hệ thống sẽ dừng nhận đăng ký mới và đánh dấu sự kiện là đã hủy.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do hủy</label>
            <textarea
              rows={4}
              value={cancelEventReason}
              onChange={(e) => setCancelEventReason(e.target.value)}
              className="input-field resize-none"
              placeholder="Ví dụ: thời tiết xấu, thay đổi kế hoạch, địa điểm không khả dụng..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCancelEventModal(false)} className="btn-secondary">Đóng</button>
            <button type="submit" disabled={cancelEventSaving} className="btn-danger flex items-center gap-2">
              {cancelEventSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Xác nhận hủy
            </button>
          </div>
        </form>
      </Modal>

      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Kêu gọi ủng hộ</h2>
              <p className="text-sm text-gray-500">Quản lý đợt kêu gọi tiền cá nhân và xác nhận khoản đã nhận.</p>
            </div>
            <button onClick={openCreateCampaign} className="btn-primary btn-sm flex items-center gap-1">
              <i className="fa-solid fa-plus" /> Tạo đợt
            </button>
          </div>

          <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Tổng mục tiêu</p>
              <p className="text-xl font-bold text-gray-900">{money(campaignTarget)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Đã xác nhận</p>
              <p className="text-xl font-bold text-green-700">{money(campaignConfirmed)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Đang chờ</p>
              <p className="text-xl font-bold text-yellow-600">{money(campaignPending)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tiến độ chung</p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${campaignProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{campaignProgress}%</p>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="card p-12 text-center">
              <i className="fa-solid fa-hand-holding-heart text-4xl text-gray-300 mb-3 block" />
              <p className="text-gray-500">Chưa có đợt kêu gọi ủng hộ nào.</p>
              <button onClick={openCreateCampaign} className="btn-primary mt-4 inline-flex items-center gap-2">
                <i className="fa-solid fa-plus" /> Tạo đợt đầu tiên
              </button>
            </div>
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
                          <h3 className="font-semibold text-gray-900">{campaign.title}</h3>
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">{campaign.status}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{campaign.description}</p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>Đã xác nhận {money(confirmedAmount)}</span>
                        <span>Mục tiêu {money(targetAmount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${pctDone}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs text-green-700">Confirmed</p>
                        <p className="font-semibold text-green-800">{campaign.confirmedCount || 0} lượt</p>
                      </div>
                      <div className="rounded-lg bg-yellow-50 p-3">
                        <p className="text-xs text-yellow-700">Pending</p>
                        <p className="font-semibold text-yellow-800">{campaign.pendingCount || 0} lượt · {money(pendingAmount)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openDonations(campaign)} className="btn-secondary btn-sm">
                        <i className="fa-solid fa-list mr-1" /> Donation
                      </button>
                      {(campaign.status === 'Closed' || campaign.status === 'Reported') && (
                        <button onClick={() => openFinancialReport('campaign', campaign)} className="btn-secondary btn-sm">
                          Báo cáo
                        </button>
                      )}
                      {campaign.status !== 'Open' && campaign.status !== 'Cancelled' && (
                        <button onClick={() => changeCampaignStatus(campaign, 'open')} className="btn-primary btn-sm">Mở</button>
                      )}
                      {campaign.status === 'Open' && (
                        <button onClick={() => changeCampaignStatus(campaign, 'close')} className="btn-secondary btn-sm">Đóng</button>
                      )}
                      {campaign.status !== 'Cancelled' && (
                        <button onClick={() => changeCampaignStatus(campaign, 'cancel')} className="btn-danger btn-sm">Hủy</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Modal isOpen={campaignModal} onClose={() => setCampaignModal(false)} title="Tạo đợt kêu gọi" size="lg">
            <form onSubmit={submitCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                <input value={campaignForm.title} onChange={(e) => setCampaignForm((f) => ({ ...f, title: e.target.value }))} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả *</label>
                <textarea rows={3} value={campaignForm.description} onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))} required className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mục tiêu *</label>
                  <input type="number" min="1" value={campaignForm.targetAmount} onChange={(e) => setCampaignForm((f) => ({ ...f, targetAmount: e.target.value }))} required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tối thiểu mong muốn</label>
                  <input type="number" min="0" value={campaignForm.minimumAmount} onChange={(e) => setCampaignForm((f) => ({ ...f, minimumAmount: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bắt đầu *</label>
                  <input type="datetime-local" value={campaignForm.startDate} onChange={(e) => setCampaignForm((f) => ({ ...f, startDate: e.target.value }))} required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kết thúc *</label>
                  <input type="datetime-local" value={campaignForm.endDate} onChange={(e) => setCampaignForm((f) => ({ ...f, endDate: e.target.value }))} required className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thông tin nhận tiền</label>
                <textarea rows={3} value={campaignForm.receiveInfo} onChange={(e) => setCampaignForm((f) => ({ ...f, receiveInfo: e.target.value }))} className="input-field resize-none" placeholder="Ngân hàng, số tài khoản, nội dung chuyển khoản..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú minh bạch</label>
                <textarea rows={2} value={campaignForm.transparencyNote} onChange={(e) => setCampaignForm((f) => ({ ...f, transparencyNote: e.target.value }))} className="input-field resize-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
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
                  <p className="text-sm text-gray-500 text-center py-8">Chưa có khoản ủng hộ nào.</p>
                ) : donations.map((donation) => (
                  <div key={donation.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{donation.isAnonymous ? 'Ẩn danh' : donation.displayName || donation.userName} · {money(donation.amount)}</p>
                        <p className="text-xs text-gray-500">{donation.status} · {fmt(donation.createdAt)}</p>
                        {(donation.phone || donation.email) && <p className="text-xs text-gray-500">{donation.phone} {donation.email}</p>}
                        {donation.note && <p className="text-sm text-gray-600 mt-1">{donation.note}</p>}
                        {donation.proofImageUrl && <a href={donation.proofImageUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600">Xem minh chứng</a>}
                      </div>
                      {donation.status === 'PendingConfirmation' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateDonationStatus(donation, 'confirm')} className="btn-primary btn-sm">Xác nhận</button>
                          <button onClick={() => updateDonationStatus(donation, 'reject')} className="btn-danger btn-sm">Từ chối</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        </div>
      )}

      {tab === 'corporate' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Tài trợ doanh nghiệp</h2>
              <p className="text-sm text-gray-500">Mời sponsor hoặc xử lý đề nghị tài trợ từ sponsor.</p>
            </div>
            <button onClick={openInviteSponsor} className="btn-primary btn-sm flex items-center gap-1">
              <i className="fa-solid fa-paper-plane" /> Mời tài trợ
            </button>
          </div>

          <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Đang chờ</p>
              <p className="text-xl font-bold text-yellow-600">{proposalPendingCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Đã đồng ý</p>
              <p className="text-xl font-bold text-blue-600">{proposalAcceptedCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Đã nhận</p>
              <p className="text-xl font-bold text-green-700">{proposalReceived.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tổng đã nhận</p>
              <p className="text-xl font-bold text-green-700">{money(proposalReceivedAmount)}</p>
            </div>
          </div>

          {proposals.length === 0 ? (
            <div className="card p-12 text-center">
              <i className="fa-solid fa-handshake text-4xl text-gray-300 mb-3 block" />
              <p className="text-gray-500">Chưa có lời mời hoặc đề nghị tài trợ nào.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="card p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">{proposal.type}</span>
                        <span className="rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-xs text-primary-700">{proposal.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{proposal.message}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>Sponsor: {proposal.sponsorName}</span>
                        {proposal.sponsorEmail && <span><i className="fa-solid fa-envelope mr-0.5" />{proposal.sponsorEmail}</span>}
                        <span>Số tiền: {money(proposal.amount)}</span>
                        {proposal.purpose && <span>Mục đích: {proposal.purpose}</span>}
                      </div>
                      {proposal.responseMessage && <p className="mt-2 text-xs text-gray-500">Phản hồi: {proposal.responseMessage}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {proposal.type === 'SponsorOffer' && proposal.status === 'Pending' && (
                        <>
                          <button onClick={() => updateProposalStatus(proposal, 'accept')} className="btn-primary btn-sm">Accept</button>
                          <button onClick={() => updateProposalStatus(proposal, 'reject')} className="btn-danger btn-sm">Reject</button>
                        </>
                      )}
                      {proposal.type === 'OrganizerRequest' && proposal.status === 'Pending' && (
                        <button onClick={() => updateProposalStatus(proposal, 'cancel')} className="btn-secondary btn-sm">Hủy lời mời</button>
                      )}
                      {proposal.status === 'Accepted' && (
                        <button onClick={() => updateProposalStatus(proposal, 'received')} className="btn-primary btn-sm">Xác nhận đã nhận</button>
                      )}
                      {(proposal.status === 'Received' || proposal.status === 'Reported') && (
                        <button onClick={() => openFinancialReport('proposal', proposal)} className="btn-secondary btn-sm">Báo cáo</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Modal isOpen={proposalModal} onClose={() => setProposalModal(false)} title="Mời sponsor tài trợ" size="lg">
            <form onSubmit={submitSponsorInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor *</label>
                <select value={proposalForm.sponsorId} onChange={(e) => setProposalForm((f) => ({ ...f, sponsorId: e.target.value }))} required className="input-field">
                  <option value="">-- Chọn sponsor --</option>
                  {sponsorUsers.map((sponsor) => (
                    <option key={sponsor.id} value={sponsor.id}>{sponsor.name || sponsor.userName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                <input value={proposalForm.title} onChange={(e) => setProposalForm((f) => ({ ...f, title: e.target.value }))} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung kêu gọi *</label>
                <textarea rows={4} value={proposalForm.message} onChange={(e) => setProposalForm((f) => ({ ...f, message: e.target.value }))} required className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền mong muốn *</label>
                  <input type="number" min="1" value={proposalForm.requestedAmount} onChange={(e) => setProposalForm((f) => ({ ...f, requestedAmount: e.target.value }))} required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File/ảnh đính kèm URL</label>
                  <input value={proposalForm.attachmentUrl} onChange={(e) => setProposalForm((f) => ({ ...f, attachmentUrl: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích sử dụng</label>
                <textarea rows={2} value={proposalForm.purpose} onChange={(e) => setProposalForm((f) => ({ ...f, purpose: e.target.value }))} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quyền lợi/ghi nhận sponsor</label>
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

          <Modal isOpen={!!receivedProposal} onClose={() => setReceivedProposal(null)} title="Xác nhận tiền tài trợ đã nhận" size="md">
            <form onSubmit={submitReceivedProposal} className="space-y-4">
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-800">
                <p className="font-semibold">{receivedProposal?.title}</p>
                <p className="mt-1">Sponsor: {receivedProposal?.sponsorName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thực nhận *</label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="input-field"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Nhập đúng số tiền đã nhận thực tế từ sponsor. Số này sẽ dùng trong báo cáo tài chính.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReceivedProposal(null)} className="btn-secondary" disabled={receivedSaving}>Hủy</button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={receivedSaving}>
                  {receivedSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Xác nhận đã nhận
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {tab === 'report' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Tổng đăng ký', value: registrations.length, icon: 'fa-clipboard-list' },
              { label: 'Tỷ lệ lấp đầy', value: `${fillRate}%`, icon: 'fa-chart-pie' },
              { label: 'Tỷ lệ điểm danh', value: `${attendanceRate}%`, icon: 'fa-user-check' },
              { label: 'Tổng giờ ghi nhận', value: `${totalHours}h`, icon: 'fa-clock' },
            ].map((item) => (
              <div key={item.label} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                    <i className={`fa-solid ${item.icon}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Phân bổ trạng thái đăng ký</h3>
            <div className="space-y-3">
              {[
                { label: 'Chờ xác nhận', value: pending.length, color: 'bg-yellow-500' },
                { label: 'Đã xác nhận', value: confirmed.length, color: 'bg-green-500' },
                { label: 'Đã hủy', value: cancelled.length, color: 'bg-red-500' },
                { label: 'Đã điểm danh', value: attended.length, color: 'bg-primary-500' },
              ].map((row) => {
                const pct = registrations.length > 0 ? Math.round((row.value / registrations.length) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-900">{row.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Tiến độ tài chính</h3>
                <p className="mt-1 text-sm text-gray-500">Tính từ ủng hộ cá nhân đã xác nhận và tài trợ doanh nghiệp đã nhận.</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{financialProgress}%</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${financialProgress}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>Đã ghi nhận: {money(financialReceived)}</span>
              <span>Mục tiêu/đề xuất: {money(financialTarget)}</span>
            </div>
          </div>

          {shifts.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Báo cáo theo ca</h3>
              <div className="space-y-2">
                {shifts.map((shift) => {
                  const regsInShift = registrations.filter((r) => r.shift?.id === shift.id || r.shiftId === shift.id);
                  const attendedInShift = regsInShift.filter((r) => r.isAttended);
                  const shiftPct = shift.maxVolunteers > 0 ? Math.round((regsInShift.length / shift.maxVolunteers) * 100) : 0;
                  return (
                    <div key={shift.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{shift.name}</p>
                          <p className="text-xs text-gray-500">{fmtTime(shift.startTime)} - {fmtTime(shift.endTime)}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p>{regsInShift.length}/{shift.maxVolunteers} đăng ký</p>
                          <p>{attendedInShift.length} điểm danh</p>
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${Math.min(shiftPct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lịch sử thao tác */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Lịch sử thao tác</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có lịch sử.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3 py-1">
                    <span className="text-xs text-gray-400 w-28 flex-shrink-0">{new Date(h.createdAtUtc).toLocaleString('vi-VN')}</span>
                    <span className="font-medium text-gray-700">{h.actorName || 'Hệ thống'}</span>
                    <span className="text-gray-500">{translateAction(h.action)}</span>
                    {h.metadata && h.metadata.includes('Reason=') && (
                      <span className="text-xs text-red-500 ml-1">({h.metadata.split('Reason=')[1]})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={financialReportModal} onClose={() => setFinancialReportModal(false)} title="Báo cáo sử dụng tiền" size="lg">
        <form onSubmit={submitFinancialReport} className="space-y-4">
          {financialReportTarget && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">{financialReportTarget.title}</p>
              <p className="text-xs text-gray-500 mt-1">
                {financialReportType === 'campaign'
                  ? `Đã xác nhận: ${money(financialReportTarget.confirmedAmount || 0)}`
                  : `Đã nhận: ${money(financialReportTarget.amount || 0)}`}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền đã sử dụng *</label>
            <input type="number" min="0" value={financialReportForm.usedAmount} onChange={(e) => setFinancialReportForm((f) => ({ ...f, usedAmount: e.target.value }))} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tóm tắt báo cáo *</label>
            <textarea rows={3} value={financialReportForm.summary} onChange={(e) => setFinancialReportForm((f) => ({ ...f, summary: e.target.value }))} required className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chi tiết chi phí</label>
            <textarea rows={4} value={financialReportForm.expenseDetails} onChange={(e) => setFinancialReportForm((f) => ({ ...f, expenseDetails: e.target.value }))} className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minh chứng/đính kèm URL</label>
            <input value={financialReportForm.attachmentUrl} onChange={(e) => setFinancialReportForm((f) => ({ ...f, attachmentUrl: e.target.value }))} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFinancialReportModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={financialReportSaving} className="btn-primary flex items-center gap-2">
              {financialReportSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Lưu báo cáo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
