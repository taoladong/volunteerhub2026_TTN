import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../../components/ui/Tabs';
import MyProfile from './MyProfile';
import Passport from './Passport';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'passport' ? 'passport' : 'info';
  const [tab, setTab] = useState(initialTab);
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tab === 'passport') setSearchParams({ tab: 'passport' }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [tab]);

  const handleShare = async () => {
    if (!user?.id) return;
    const url = `${window.location.origin}/profile/${user.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Hồ sơ tình nguyện của tôi', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* user cancelled or unsupported */ }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <header className="mt-2 mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-medium leading-tight tracking-tight" style={{ color: 'var(--c-ink)' }}>
            Hồ sơ
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'rgba(15,15,15,0.50)' }}>
            Thông tin cá nhân và hành trình tình nguyện của bạn.
          </p>
        </div>
        {user?.id && (
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium flex-shrink-0"
            style={{ border: '1px solid rgba(15,15,15,0.12)', color: '#1b61c9', background: '#fff' }}
            title="Sao chép link hồ sơ công khai"
          >
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-share-nodes'}`} style={{ fontSize: 12 }} />
            {copied ? 'Đã sao chép' : 'Chia sẻ hồ sơ'}
          </button>
        )}
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'info',     label: 'Thông tin' },
          { key: 'passport', label: 'Hành trình' },
        ]}
        className="mb-5"
      />

      {tab === 'info' ? <MyProfile embedded /> : <Passport embedded />}
    </div>
  );
}
