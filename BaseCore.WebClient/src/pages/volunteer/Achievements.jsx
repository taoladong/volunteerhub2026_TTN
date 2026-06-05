import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { badgeApi, certificateApi } from '../../services/api';
import Tabs from '../../components/ui/Tabs';
import MyBadges from './MyBadges';
import MyCertificates from './MyCertificates';

export default function Achievements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'certificates' ? 'certificates' : 'badges';
  const [tab, setTab] = useState(initialTab);
  const [badgeCount, setBadgeCount] = useState(null);
  const [certCount, setCertCount] = useState(null);

  useEffect(() => {
    badgeApi.getMyBadges().then((r) => setBadgeCount((r.data || []).length)).catch(() => setBadgeCount(0));
    certificateApi.getMyCertificates().then((r) => setCertCount((r.data || []).length)).catch(() => setCertCount(0));
  }, []);

  useEffect(() => {
    if (tab === 'certificates') setSearchParams({ tab: 'certificates' }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [tab]);

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <header className="mt-2 mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--c-ink)' }}>Thành tích</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--c-ink-2)' }}>
          Huy hiệu đạt được và chứng chỉ tình nguyện của bạn.
        </p>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'badges', label: 'Huy hiệu', count: badgeCount ?? undefined },
          { key: 'certificates', label: 'Chứng chỉ', count: certCount ?? undefined },
        ]}
        className="mb-6"
      />

      {tab === 'badges' ? <MyBadges embedded /> : <MyCertificates embedded />}
    </div>
  );
}
