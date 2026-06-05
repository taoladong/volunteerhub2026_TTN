import React, { useEffect, useState } from 'react';
import { TUICallKit, TUICallKitAPI, TUICallType } from '@trtc/calls-uikit-react';
import Modal from './Modal';
import { interviewCallApi } from '../../services/api';
import { fmtDateTime } from '../../utils/format';

const DEFAULT_AVATAR =
  'https://web.sdk.qcloud.com/trtc/call/pope-test/react-doc/en/avatar.png';

export default function InterviewCallModal({ slot, onClose, forceCaller = false }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [calling, setCalling] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!slot?.id) return;
      setLoading(true);
      setReady(false);
      setError('');

      try {
        const response = await interviewCallApi.getTrtcToken(slot.id);
        if (cancelled) return;
        const payload = response.data;
        setToken(payload);

        await TUICallKitAPI.init({
          SDKAppID: payload.sdkAppId,
          userID: payload.userId,
          userSig: payload.userSig,
        });
        await TUICallKitAPI.setSelfInfo({
          nickName: payload.selfName || payload.userId,
          avatar: DEFAULT_AVATAR,
        });
        TUICallKitAPI.enableFloatWindow(false);
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          const message = err.response?.data?.message || err.message || 'Không thể khởi tạo phòng gọi video.';
          const detail = err.response?.data?.detail;
          setError(detail ? `${message}: ${detail}` : message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      endCallSession();
    };
  }, [slot?.id]);

  const endCallSession = async () => {
    try {
      await TUICallKitAPI.hangup?.();
    } catch {
      try {
        await TUICallKitAPI.reject?.();
      } catch {
        // Ignore cleanup errors. The SDK may already be idle.
      }
    }

    try {
      await TUICallKitAPI.destroyed?.();
    } catch {
      // Ignore cleanup errors. Closing the modal should not block the UI.
    }
  };

  const closeRoom = async () => {
    setClosing(true);
    await endCallSession();
    setClosing(false);
    onClose?.();
  };

  const startCall = async () => {
    if (!token?.peerUserId || !isCaller) return;
    setCalling(true);
    setError('');
    try {
      await TUICallKitAPI.calls({
        userIDList: [token.peerUserId],
        type: TUICallType.VIDEO_CALL,
      });
    } catch (err) {
      console.error('[InterviewCall] call failed', err);
      const detail = err?.message || err?.msg || err?.code || JSON.stringify(err);
      setError(`Không thể bắt đầu cuộc gọi: ${detail}`);
    } finally {
      setCalling(false);
    }
  };

  const statusText = loading
    ? 'Đang chuẩn bị phòng'
    : ready
      ? 'Sẵn sàng phỏng vấn'
      : 'Chưa sẵn sàng';

  const isCaller = forceCaller || token?.canStartCall === true || token?.role === 'Organizer';

  return (
    <Modal isOpen={!!slot} onClose={closeRoom} title="" size="xl">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-950 p-5 text-white lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-950/20">
                <i className="fa-solid fa-video" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Phòng phỏng vấn video</h2>
                <p className="mt-1 text-sm text-slate-300">{token?.eventTitle || 'Phỏng vấn trực tuyến'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium ${ready ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/30'}`}>
              <span className={`h-2 w-2 rounded-full ${ready ? 'bg-emerald-300' : 'bg-amber-300'}`} />
              {statusText}
            </span>
            {token?.scheduledAt && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-slate-200 ring-1 ring-white/15">
                <i className="fa-regular fa-clock" />
                {fmtDateTime(token.scheduledAt)} · {token.durationMinutes || 30} phút
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-0 bg-slate-100 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="bg-slate-950 p-3 sm:p-4">
            {error && (
              <div className="mb-3 rounded-lg border border-red-300/40 bg-red-950/70 p-3 text-sm text-red-100">
                {error}
              </div>
            )}
            <div className="relative min-h-[520px] overflow-hidden rounded-xl border border-white/10 bg-black">
              <TUICallKit style={{ width: '100%', height: 560 }} />
              {!ready && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/80 text-center text-white">
                  <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <i className="fa-solid fa-spinner fa-spin" />
                    </div>
                    <div className="font-medium">Đang chuẩn bị phòng phỏng vấn</div>
                    <div className="mt-1 text-sm text-slate-300">Vui lòng giữ cửa sổ này mở.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4 border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Người tham gia</div>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">Bạn</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {token?.userId || 'Đang tải...'} · {isCaller ? 'Người gọi' : 'Người chờ'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">Người đối diện</div>
                  <div className="mt-1 text-xs text-slate-500">{token?.peerUserId || 'Đang tải...'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <div className="font-semibold">Cách demo ổn định</div>
              <ul className="mt-2 space-y-1.5 text-xs leading-5">
                <li>Mở phòng bằng hai trình duyệt hoặc hai profile khác nhau.</li>
                <li>Organizer vào phòng và bấm gọi video.</li>
                <li>Volunteer vào phòng trước và chờ popup cuộc gọi.</li>
                <li>Khi đóng phòng, hệ thống sẽ kết thúc phiên gọi hiện tại.</li>
              </ul>
            </div>

            {token?.importWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Tài khoản đã sẵn sàng, nhưng bước đồng bộ tự động trả cảnh báo. Có thể bỏ qua trong demo nếu cuộc gọi hoạt động.
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2">
              {isCaller ? (
                <button
                  type="button"
                  onClick={startCall}
                  disabled={!ready || calling || closing}
                  className="btn-primary flex w-full items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-video" />
                  {calling ? 'Đang gọi...' : 'Gọi volunteer'}
                </button>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <div className="font-semibold">Đang chờ organizer gọi</div>
                  <div className="mt-1 text-xs">Giữ phòng này mở để nhận popup cuộc gọi.</div>
                </div>
              )}
              <button type="button" onClick={closeRoom} disabled={closing} className="btn-secondary w-full">
                {closing ? 'Đang đóng phòng...' : 'Đóng phòng'}
              </button>
              <div className="text-center text-xs text-slate-400">
                {ready ? `${token?.userId} → ${token?.peerUserId}` : statusText}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Modal>
  );
}
