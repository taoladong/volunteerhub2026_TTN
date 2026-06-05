import React, { useState, useEffect } from 'react';
import { badgeApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function fmt(dt) { return dt ? new Date(dt).toLocaleDateString('vi-VN') : ''; }

export default function MyBadges() {
  const [myBadges, setMyBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([badgeApi.getMyBadges(), badgeApi.getAll()])
      .then(([myRes, allRes]) => {
        setMyBadges(myRes.data || []);
        setAllBadges(allRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const earnedIds = new Set(myBadges.map(ub => ub.badgeId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Huy hiệu của tôi</h1>
        <p className="text-sm text-gray-500 mt-0.5">Đã đạt {myBadges.length} / {allBadges.length} huy hiệu</p>
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Tiến trình</span>
          <span className="font-medium text-primary-600">{allBadges.length > 0 ? Math.round(myBadges.length / allBadges.length * 100) : 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${allBadges.length > 0 ? (myBadges.length / allBadges.length * 100) : 0}%` }} />
        </div>
      </div>

      {/* Earned badges */}
      {myBadges.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Đã đạt được</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBadges.map(ub => (
              <div key={ub.id} className="card p-5 border-2 border-yellow-200 bg-yellow-50/50 text-center">
                <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  {ub.badge?.iconUrl
                    ? <img src={ub.badge.iconUrl} alt="" className="w-10 h-10 object-contain" />
                    : <i className="fa-solid fa-medal text-yellow-500 text-2xl" />}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{ub.badge?.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{ub.badge?.description}</p>
                <p className="text-xs text-yellow-600 mt-2 font-medium">Đạt được {fmt(ub.awardedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {allBadges.filter(b => !earnedIds.has(b.id)).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Chưa đạt được</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBadges.filter(b => !earnedIds.has(b.id)).map(b => (
              <div key={b.id} className="card p-5 text-center opacity-60 grayscale">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-lock text-gray-400 text-xl" />
                </div>
                <h3 className="font-semibold text-gray-700 text-sm">{b.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {myBadges.length === 0 && allBadges.length === 0 && (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-medal text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">Chưa có huy hiệu nào. Hãy tham gia sự kiện!</p>
        </div>
      )}
    </div>
  );
}
