import React, { useState, useEffect } from 'react';
import { profileApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';

function fmt(dt) { return dt ? new Date(dt).toLocaleDateString('vi-VN') : ''; }
const LEVEL_COLOR = { Beginner: 'bg-yellow-100 text-yellow-700', Intermediate: 'bg-blue-100 text-blue-700', Expert: 'bg-primary-100 text-primary-700' };

export default function Passport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi.getPassport().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { profile, skills, totalEvents, totalHours, registrations, certificates } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Hero card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-700 to-primary-500 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <i className="fa-solid fa-user text-white text-2xl" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <i className="fa-solid fa-id-card text-primary-200" />
                <span className="text-primary-200 text-sm font-medium">Hộ chiếu Tình nguyện</span>
              </div>
              <h2 className="text-xl font-bold">{profile?.user?.name || 'Tình nguyện viên'}</h2>
              {profile?.bloodType && <p className="text-primary-100 text-sm">Nhóm máu: {profile.bloodType}</p>}
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
          {[
            { label: 'Giờ tình nguyện', value: `${totalHours || 0}h`, icon: 'fa-clock', color: 'text-primary-600' },
            { label: 'Sự kiện', value: totalEvents || 0, icon: 'fa-calendar-check', color: 'text-blue-600' },
            { label: 'Chứng chỉ', value: certificates?.length || 0, icon: 'fa-certificate', color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="py-4">
              <i className={`fa-solid ${s.icon} ${s.color} block mb-1`} />
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      {skills?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><i className="fa-solid fa-star text-yellow-400" /> Kỹ năng</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map(vs => (
              <span key={vs.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${LEVEL_COLOR[vs.level]}`}>
                {vs.skill?.name}
                <span className="opacity-60 text-xs">· {vs.level}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {certificates?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><i className="fa-solid fa-certificate text-purple-500" /> Chứng chỉ</h3>
          <div className="space-y-2">
            {certificates.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <i className="fa-solid fa-certificate text-purple-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.event?.title}</p>
                  <p className="text-xs text-gray-500">Mã: {c.certificateCode} · {c.volunteerHours}h · {fmt(c.issuedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {registrations?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><i className="fa-solid fa-timeline text-primary-500" /> Lịch sử tham gia</h3>
          <div className="space-y-3">
            {registrations.filter(r => r.isAttended).map(r => (
              <div key={r.id} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.event?.title}</p>
                  <p className="text-xs text-gray-400">{fmt(r.attendedAt)} · {r.volunteerHours}h · <StatusBadge status={r.status} /></p>
                </div>
              </div>
            ))}
            {registrations.filter(r => r.isAttended).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">Chưa có lịch sử tham gia</p>
            )}
          </div>
        </div>
      )}

      {/* Bio */}
      {profile?.bio && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Giới thiệu</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
        </div>
      )}
    </div>
  );
}
