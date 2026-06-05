import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { eventApi, registrationApi, sponsorApi, skillApi, profileApi, supportCampaignApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import ImageUploadField from '../../components/ui/ImageUploadField';

function fmt(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function money(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ';
}

function EventImage({ src, title }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-emerald-50">
      <div className="text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-primary-100 flex items-center justify-center mx-auto mb-3">
          <i className="fa-solid fa-calendar-days text-3xl text-primary-500" />
        </div>
        <p className="text-sm font-semibold text-gray-700 line-clamp-2">{title || 'Sự kiện tình nguyện'}</p>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { isAuthenticated, isVolunteer, isSponsor } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [myRegistration, setMyRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [note, setNote] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [allSkills, setAllSkills] = useState([]);
  const [mySkillIds, setMySkillIds] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [impact, setImpact] = useState(null);
  const [shareMsg, setShareMsg] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [donationModal, setDonationModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [donating, setDonating] = useState(false);
  const [donationForm, setDonationForm] = useState({
    amount: '',
    displayName: '',
    phone: '',
    email: '',
    note: '',
    isAnonymous: false,
    proofImageUrl: '',
  });

  useEffect(() => {
    skillApi.getAll().then((r) => setAllSkills(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isVolunteer()) return;
    profileApi.getMyProfile()
      .then((r) => {
        setMyProfile(r.data?.profile || null);
        const skills = r.data?.volunteerSkills || r.data?.skills || [];
        setMySkillIds(skills.map((s) => s.skillId || s.id));
      })
      .catch(() => {});
  }, [isAuthenticated, isVolunteer]);

  const loadEventData = async ({ initial = false } = {}) => {
    if (initial) {
      setLoading(true);
      setNotFound(false);
    }

    try {
      const requests = [
        eventApi.getById(id),
        eventApi.getShifts(id).catch(() => ({ data: [] })),
        sponsorApi.getByEvent(id).catch(() => ({ data: [] })),
        eventApi.getImpact(id).catch(() => ({ data: null })),
        supportCampaignApi.getByEvent(id).catch(() => ({ data: [] })),
      ];

      if (isAuthenticated && isVolunteer()) {
        requests.push(registrationApi.getMyRegistration(id).catch(() => ({ data: null })));
      }

      const [evRes, shRes, spRes, impactRes, campaignRes, myRegRes] = await Promise.all(requests);
      setEvent(evRes.data);
      setShifts(shRes.data || []);
      setSponsors(spRes.data || []);
      setImpact(impactRes?.data || null);
      setCampaigns(campaignRes.data || []);
      setMyRegistration(myRegRes?.data || null);
    } catch {
      setNotFound(true);
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    loadEventData({ initial: true });
  }, [id, isAuthenticated]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setRegistering(true);
    setMsg({ type: '', text: '' });

    try {
      await registrationApi.register(id, {
        note,
        shiftId: selectedShiftId ? Number(selectedShiftId) : null,
      });
      await loadEventData();
      setSelectedShiftId('');
      setNote('');
      setMsg({ type: 'success', text: 'Đăng ký thành công! Chờ ban tổ chức xác nhận.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Đăng ký thất bại' });
    } finally {
      setRegistering(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myRegistration) return;

    setWithdrawing(true);
    setMsg({ type: '', text: '' });

    try {
      await registrationApi.withdraw(id);
      await loadEventData();
      setMsg({ type: 'success', text: 'Bạn đã rút đăng ký khỏi sự kiện.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Rút đăng ký thất bại' });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: event?.title || 'VolunteerHub', text: event?.description || '', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg('Đã copy link sự kiện');
        setTimeout(() => setShareMsg(''), 2000);
      }
    } catch {
      setShareMsg('');
    }
  };

  const openDonation = (campaign) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSelectedCampaign(campaign);
    setDonationForm({
      amount: campaign.minimumAmount ? String(campaign.minimumAmount) : '',
      displayName: '',
      phone: '',
      email: '',
      note: '',
      isAnonymous: false,
      proofImageUrl: '',
    });
    setDonationModal(true);
  };

  const submitDonation = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    const amount = Number(donationForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMsg({ type: 'error', text: 'Số tiền ủng hộ phải lớn hơn 0.' });
      return;
    }
    if (!donationForm.isAnonymous && !donationForm.displayName.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập tên hiển thị hoặc chọn ẩn danh.' });
      return;
    }

    setDonating(true);
    try {
      await supportCampaignApi.donate(selectedCampaign.id, {
        ...donationForm,
        amount,
      });
      await loadEventData();
      setDonationModal(false);
      setMsg({ type: 'success', text: 'Đã gửi thông tin ủng hộ. Khoản này sẽ được tính sau khi ban tổ chức xác nhận.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Gửi ủng hộ thất bại' });
    } finally {
      setDonating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <i className="fa-solid fa-calendar-xmark text-5xl text-gray-300 mb-4 block" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy sự kiện</h2>
        <p className="text-gray-400 text-sm mb-6">Sự kiện không tồn tại hoặc đã bị xóa.</p>
        <Link to="/events" className="btn-primary inline-flex items-center gap-2">
          <i className="fa-solid fa-arrow-left" /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  const pct = event.maxParticipants > 0
    ? Math.round((event.currentParticipants / event.maxParticipants) * 100)
    : 0;
  const activeRegistration = myRegistration?.status === 'Cancelled' ? null : myRegistration;
  const kycSatisfied = !event.requiresKyc || myProfile?.kycStatus === 'Verified';
  const now = new Date();
  const eventStarted = event.startDate && new Date(event.startDate) <= now;
  const eventEnded = event.endDate && new Date(event.endDate) <= now;
  const isOngoing = event.status === 'Approved' && eventStarted && !eventEnded;
  const canRegister = isAuthenticated && isVolunteer() && event.status === 'Approved' && !eventStarted && !activeRegistration && kycSatisfied;
  const canWithdraw = activeRegistration?.status === 'Pending';
  const selectedShift = shifts.find((s) => String(s.id) === String(selectedShiftId));
  const financialItems = impact ? [...(impact.supportCampaigns || []), ...(impact.receivedSponsorships || [])] : [];
  const financialReports = financialItems.filter((x) => x.reportSummary);
  const hasFinancialActivity = impact && (Number(impact.financialConfirmedAmount) || 0) > 0;
  const rawReturnTo = new URLSearchParams(location.search).get('returnTo');
  const backTo = rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/events';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link to={backTo} className="text-sm text-gray-500 hover:text-primary-600 mb-4 inline-flex items-center gap-1">
        <i className="fa-solid fa-arrow-left" /> Quay lại danh sách
      </Link>

      {event.status === 'Pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800 flex items-center gap-2">
          <i className="fa-solid fa-clock" />
          <span>Sự kiện đang chờ duyệt. Đây là bản xem trước.</span>
        </div>
      )}
      {event.status === 'Rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-xmark" />
            <span className="font-medium">Sự kiện đã bị từ chối.</span>
          </div>
          {event.rejectReason && (
            <p className="mt-1 ml-6 text-red-700">Lý do: {event.rejectReason}</p>
          )}
        </div>
      )}
      {event.status === 'Cancelled' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-ban" />
            <span className="font-medium">Sự kiện đã bị hủy.</span>
          </div>
          {event.cancelReason && (
            <p className="mt-1 ml-6">Lý do: {event.cancelReason}</p>
          )}
        </div>
      )}
      {isOngoing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
          <i className="fa-solid fa-play-circle" />
          <span>Sự kiện đang diễn ra. Không nhận đăng ký mới.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-5">
          <div className="card overflow-hidden">
            <div className="h-56 bg-primary-100">
              <EventImage src={event.imageUrl} title={event.title} />
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2 items-center mb-3">
                <StatusBadge status={event.status} />
                {event.category && (
                  <span className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full border border-primary-100 font-medium">
                    {event.category.name}
                  </span>
                )}
                {event.requiresKyc && (
                  <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full border border-amber-100 font-medium">
                    Yêu cầu KYC
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-4">{event.title}</h1>
              {event.description && <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={handleShare} className="btn-secondary btn-sm flex items-center gap-1">
                  <i className="fa-solid fa-share-nodes" /> Chia sẻ
                </button>
                {shareMsg && <span className="text-xs text-primary-600 self-center">{shareMsg}</span>}
              </div>
            </div>
          </div>

          {event.status === 'Completed' && impact && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Tác động công khai</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Đã tham gia', value: impact.attendedVolunteers || 0, icon: 'fa-user-check' },
                  { label: 'Giờ đóng góp', value: `${impact.totalVolunteerHours || 0}h`, icon: 'fa-clock' },
                  { label: 'Chứng chỉ', value: impact.certificatesIssued || 0, icon: 'fa-certificate' },
                  { label: 'Nhà tài trợ', value: impact.sponsorCount || 0, icon: 'fa-handshake' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <i className={`fa-solid ${item.icon} text-primary-600 mb-2`} />
                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
              {(impact.financialConfirmedAmount || 0) > 0 ? (
                <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-green-700">Ủng hộ cá nhân đã xác nhận</p>
                      <p className="font-bold text-green-900">{money(impact.donationConfirmedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Tài trợ doanh nghiệp đã nhận</p>
                      <p className="font-bold text-green-900">{money(impact.sponsorshipReceivedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Tổng tài chính ghi nhận</p>
                      <p className="font-bold text-green-900">{money(impact.financialConfirmedAmount)}</p>
                    </div>
                  </div>
                  {[...(impact.supportCampaigns || []), ...(impact.receivedSponsorships || [])].some((x) => x.reportSummary) && (
                    <div className="mt-3 space-y-2">
                      {[...(impact.supportCampaigns || []), ...(impact.receivedSponsorships || [])]
                        .filter((x) => x.reportSummary)
                        .map((x) => (
                          <div key={`${x.id}-${x.title}`} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                            <p className="font-medium text-gray-900">{x.title}</p>
                            <p className="text-gray-600">{x.reportSummary}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">Sự kiện chưa ghi nhận khoản ủng hộ hoặc tài trợ nào.</p>
              )}
            </div>
          )}

          {event.status !== 'Completed' && hasFinancialActivity && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Minh bạch tài chính</h3>
              <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-green-700">Ủng hộ cá nhân đã xác nhận</p>
                    <p className="font-bold text-green-900">{money(impact.donationConfirmedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700">Tài trợ doanh nghiệp đã nhận</p>
                    <p className="font-bold text-green-900">{money(impact.sponsorshipReceivedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700">Tổng tài chính ghi nhận</p>
                    <p className="font-bold text-green-900">{money(impact.financialConfirmedAmount)}</p>
                  </div>
                </div>
                {financialReports.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {financialReports.map((x) => (
                      <div key={`${x.id}-${x.title}`} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900">{x.title}</p>
                          {x.status && (
                            <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                              {x.status}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{x.reportSummary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-green-800">
                    Đã ghi nhận khoản ủng hộ/tài trợ. Báo cáo sử dụng tiền sẽ được cập nhật khi ban tổ chức hoàn tất đối soát.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Thông tin chi tiết</h3>
            <div className="space-y-2 text-sm text-gray-600">
              {event.location && (
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-location-dot text-primary-500 w-4 mt-0.5" />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-calendar text-primary-500 w-4" />
                <span>Bắt đầu: {fmt(event.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-calendar-check text-primary-500 w-4" />
                <span>Kết thúc: {fmt(event.endDate)}</span>
              </div>
            </div>
          </div>

          {(() => {
            let reqIds = [];
            try {
              reqIds = JSON.parse(event.requiredSkillIds || '[]');
            } catch {}
            if (reqIds.length === 0) return null;
            const reqSkills = allSkills.filter((s) => reqIds.includes(s.id));
            const matchCount = reqSkills.filter((s) => mySkillIds.includes(s.id)).length;
            const matchPct = reqSkills.length > 0 ? Math.round((matchCount / reqSkills.length) * 100) : 0;

            return (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold" style={{ color: '#181d26' }}>Kỹ năng yêu cầu</h3>
                  {isAuthenticated && reqSkills.length > 0 && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: matchPct === 100
                        ? 'rgba(22,163,74,0.12)'
                        : matchPct > 0
                          ? 'rgba(27,97,201,0.10)'
                          : 'rgba(245,158,11,0.10)',
                      color: matchPct === 100 ? '#15803d' : matchPct > 0 ? '#1b61c9' : '#92400e',
                    }}>
                      {matchPct === 100 ? '✓ Đủ kỹ năng' : matchPct > 0 ? `Phù hợp ${matchPct}%` : 'Chưa có kỹ năng phù hợp'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {reqSkills.map((s) => {
                    const match = mySkillIds.includes(s.id);
                    return (
                      <span key={s.id} style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12.5,
                        fontWeight: 600,
                        background: match ? 'rgba(22,163,74,0.10)' : 'rgba(4,14,32,0.06)',
                        color: match ? '#15803d' : 'rgba(4,14,32,0.55)',
                        border: `1px solid ${match ? 'rgba(22,163,74,0.25)' : 'rgba(4,14,32,0.12)'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}>
                        {match && <i className="fa-solid fa-check" style={{ fontSize: 10 }} />}
                        {s.name}
                      </span>
                    );
                  })}
                </div>
                {isAuthenticated && matchPct < 100 && (
                  <p className="text-xs mt-3" style={{ color: 'rgba(4,14,32,0.45)' }}>
                    Thêm kỹ năng vào{' '}
                    <Link to="/profile" style={{ color: '#1b61c9', fontWeight: 600 }}>hồ sơ của bạn</Link>
                    {' '}để tăng độ phù hợp.
                  </p>
                )}
              </div>
            );
          })()}

          {shifts.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Ca làm việc</h3>
              <div className="space-y-2">
                {shifts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-gray-500">
                      {fmt(s.startTime)} - {new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-primary-600 font-medium">Max {s.maxVolunteers}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {campaigns.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Kêu gọi ủng hộ</h3>
              <div className="space-y-3">
                {campaigns.map((campaign) => {
                  const confirmed = Number(campaign.confirmedAmount) || 0;
                  const target = Number(campaign.targetAmount) || 0;
                  const pctDone = target > 0 ? Math.min(100, Math.round((confirmed / target) * 100)) : 0;
                  return (
                    <div key={campaign.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900">{campaign.title}</p>
                            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">{campaign.status}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{campaign.description}</p>
                          {campaign.transparencyNote && <p className="mt-2 text-xs text-gray-500">{campaign.transparencyNote}</p>}
                          <p className="mt-2 text-xs text-gray-500">
                            {campaign.confirmedCount || 0} lượt ủng hộ đã xác nhận
                          </p>
                        </div>
                        {campaign.status === 'Open' && (
                          <button onClick={() => openDonation(campaign)} className="btn-primary btn-sm shrink-0">
                            <i className="fa-solid fa-hand-holding-heart mr-1" /> Ủng hộ
                          </button>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Đã xác nhận {money(confirmed)}</span>
                          <span>Mục tiêu {money(target)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${pctDone}%` }} />
                        </div>
                      </div>
                      {campaign.publicDonors?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {campaign.publicDonors.map((d) => (
                            <span key={d.id} className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                              {d.displayName} · {money(d.amount)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sponsors.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Nhà tài trợ</h3>
              <div className="flex flex-wrap gap-2">
                {sponsors.map((s) => (
                  <span key={s.id} className="bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 rounded-full text-sm font-medium">
                    {s.note || s.sponsor?.name || 'Nhà tài trợ'} · {s.contributionType}
                  </span>
                ))}
              </div>
            </div>
          )}

          {impact?.interestedSponsorships?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Nhà tài trợ đang quan tâm</h3>
              <div className="space-y-2">
                {impact.interestedSponsorships.map((s) => (
                  <div key={s.id} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    <span className="font-medium">{s.sponsorName || 'Nhà tài trợ'}</span>
                    <span className="text-blue-600"> · {s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Tình nguyện viên</h3>
            <div className="text-center mb-3">
              <span className="text-3xl font-bold text-primary-600">{event.currentParticipants || 0}</span>
              <span className="text-gray-400">/{event.maxParticipants}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
              <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-center text-gray-500">{pct}% đã đăng ký</p>
            <p className="text-xs text-center text-gray-400 mt-1">Tối thiểu cần {event.minParticipants || 1} người</p>
          </div>

          <div className="card p-5 space-y-3">
            {msg.text && (
              <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.text}
              </div>
            )}

            {activeRegistration && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Trạng thái đăng ký của bạn</p>
                    <p className="text-xs text-gray-500 mt-1">Đăng ký ngày {fmt(activeRegistration.registeredAt)}</p>
                  </div>
                  <StatusBadge status={activeRegistration.isAttended ? 'Completed' : activeRegistration.status} />
                </div>

                {activeRegistration.shift && (
                  <div className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-sm text-primary-700">
                    <div className="font-medium">{activeRegistration.shift.name}</div>
                    <div className="text-xs text-primary-600 mt-1">
                      {fmt(activeRegistration.shift.startTime)} - {new Date(activeRegistration.shift.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}

                {activeRegistration.note && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 italic">
                    "{activeRegistration.note}"
                  </div>
                )}

                {activeRegistration.isAttended && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    Bạn đã tham gia sự kiện này và tổng giờ ghi nhận là {activeRegistration.volunteerHours}h.
                  </div>
                )}

                {canWithdraw && (
                  <button onClick={handleWithdraw} disabled={withdrawing} className="btn-danger w-full flex items-center justify-center gap-2">
                    {withdrawing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <i className="fa-solid fa-xmark" /> Rút đăng ký
                  </button>
                )}

                {activeRegistration.status === 'Confirmed' && !activeRegistration.isAttended && (
                  <p className="text-xs text-center text-gray-500">
                    Đăng ký của bạn đã được xác nhận. Hiện không thể rút trên giao diện này.
                  </p>
                )}
              </div>
            )}

            {isAuthenticated && isVolunteer() && !activeRegistration && event.status === 'Approved' && event.requiresKyc && !kycSatisfied && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Sự kiện này yêu cầu KYC.</p>
                <p className="mt-1">Bạn cần xác minh danh tính trước khi đăng ký.</p>
                <Link to="/profile" className="mt-2 inline-flex text-xs font-semibold text-amber-900 underline">
                  Mở hồ sơ để gửi KYC
                </Link>
              </div>
            )}

            {canRegister && (
              <>
                {shifts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ca làm việc</label>
                    <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)} className="input-field text-sm">
                      <option value="">Không chọn ca cụ thể</option>
                      {shifts.map((shift) => {
                        const used = shift.currentRegistrations ?? shift.confirmedRegistrations ?? 0;
                        const max = shift.maxVolunteers || 0;
                        const isFull = max > 0 && used >= max;
                        const skillName = shift.requiredSkill?.name;
                        return (
                          <option key={shift.id} value={shift.id} disabled={isFull}>
                            {shift.name} · {fmt(shift.startTime)}
                            {max > 0 ? ` · ${used}/${max} chỗ` : ''}
                            {isFull ? ' (đầy)' : ''}
                            {skillName ? ` · cần kỹ năng: ${skillName}` : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedShift && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(selectedShift.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(selectedShift.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {selectedShift.requiredSkill?.name && (
                          <span className="ml-2 text-amber-600">Yêu cầu kỹ năng: {selectedShift.requiredSkill.name}</span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú khi đăng ký (tùy chọn)..."
                  rows={2}
                  className="input-field resize-none text-sm"
                />

                <button onClick={handleRegister} disabled={registering} className="btn-primary w-full flex items-center justify-center gap-2">
                  {registering && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <i className="fa-solid fa-hand-holding-heart" /> Đăng ký tham gia
                </button>
              </>
            )}

            {!isAuthenticated && (
              <Link to="/login" className="btn-primary w-full text-center flex items-center justify-center gap-2">
                <i className="fa-solid fa-right-to-bracket" /> Đăng nhập để đăng ký
              </Link>
            )}

            {isAuthenticated && !isVolunteer() && (
              <p className="text-xs text-center text-gray-400">Chỉ tình nguyện viên mới có thể đăng ký</p>
            )}

            {isAuthenticated && isVolunteer() && !activeRegistration && event.status !== 'Approved' && (
              <p className="text-xs text-center text-gray-400">Sự kiện chưa mở đăng ký.</p>
            )}

            {isAuthenticated && isSponsor() && (event.status === 'Approved' || event.status === 'Completed') && (
              <Link
                to={`/my-sponsorships?eventId=${event.id}`}
                className="btn-primary w-full text-center flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-handshake" /> Đề nghị tài trợ
              </Link>
            )}
          </div>

          {event.status === 'Approved' && isAuthenticated && event.channel?.id && (
            <Link to={`/channels/${event.channel.id}`} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-comments text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Kênh trao đổi</p>
                <p className="text-xs text-gray-500">Xem thảo luận của sự kiện</p>
              </div>
              <i className="fa-solid fa-chevron-right ml-auto text-gray-400 text-sm" />
            </Link>
          )}
        </div>
      </div>

      <Modal isOpen={donationModal} onClose={() => setDonationModal(false)} title="Ủng hộ sự kiện" size="md">
        <form onSubmit={submitDonation} className="space-y-4">
          {selectedCampaign && (
            <div className="rounded-lg border border-green-100 bg-green-50 p-3">
              <p className="text-sm font-medium text-green-900">{selectedCampaign.title}</p>
              {selectedCampaign.receiveInfo && <p className="mt-1 whitespace-pre-line text-xs text-green-800">{selectedCampaign.receiveInfo}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền *</label>
            <input type="number" min="1" value={donationForm.amount} onChange={(e) => setDonationForm((f) => ({ ...f, amount: e.target.value }))} required className="input-field" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={donationForm.isAnonymous} onChange={(e) => setDonationForm((f) => ({ ...f, isAnonymous: e.target.checked }))} />
            Ủng hộ ẩn danh
          </label>
          {!donationForm.isAnonymous && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị *</label>
              <input value={donationForm.displayName} onChange={(e) => setDonationForm((f) => ({ ...f, displayName: e.target.value }))} className="input-field" placeholder="Tên sẽ hiển thị công khai khi được xác nhận" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input value={donationForm.phone} onChange={(e) => setDonationForm((f) => ({ ...f, phone: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={donationForm.email} onChange={(e) => setDonationForm((f) => ({ ...f, email: e.target.value }))} className="input-field" />
            </div>
          </div>
          <ImageUploadField
            label="Minh chứng chuyển khoản"
            value={donationForm.proofImageUrl}
            onChange={(url) => setDonationForm((f) => ({ ...f, proofImageUrl: url }))}
            helper="Upload ảnh chụp biên lai hoặc màn hình chuyển khoản."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea rows={3} value={donationForm.note} onChange={(e) => setDonationForm((f) => ({ ...f, note: e.target.value }))} className="input-field resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDonationModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={donating} className="btn-primary flex items-center gap-2">
              {donating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Gửi ủng hộ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
